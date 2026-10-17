// MAAT - Score & Report.
// The AI only labels each checklist item. EVERYTHING numeric (score, risk, fines, Art. 49 amount) is computed here.
// ===================== CONFIG - the lawyer reviews this block =====================
const CONFIG = {
  LEGAL_REVIEW_APPROVED: false,   // set true ONLY after the lawyer verified every article number, fine range and the formulas
  ART49_BASE: 'min',              // 'min' or 'max' - which total the Art. 49 percentage is applied to. VERIFY against the official text.
  ART49_FACTOR: 0.5,
  INCLUDE_PARTIAL_IN_FINES: false,// false: only axes that contain a Non-Compliant item add to the fine exposure
  LOW_COVERAGE_BELOW: 0.5,        // below this share of determinable items the result is flagged low-confidence
  RISK_LOW_AT: 85,                // score >= 85  -> Low
  RISK_MEDIUM_AT: 60              // score 60-84  -> Medium ; below 60 -> High/Critical
};
// ==================================================================================
const MATRIX = __MATRIX__;

const g = $('Guard').first().json;
const meta = g.meta || {};
const prep = $('Prepare Policy').first().json;

const clean = (v, max = 500) => String(v ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g, '')
  .trim()
  .slice(0, max);
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const norm = (s) => String(s ?? '')
  .normalize('NFKC')
  .replace(/[ً-ٰٟـ]/g, '')
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/[​-‏‪-‮⁦-⁩﻿]/g, '')
  .replace(/["'“”‘’«»]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();
const policyNorm = norm(prep.policy_text_for_ai);

const fail = (code, error_code, message) => [{ json: { ok: false, http_code: code, response_body: { success: false, error_code, message } } }];

// ---------- 1) parse the AI output ----------
const aiJson = $input.first().json || {};
let out = aiJson.output ?? aiJson.text ?? aiJson.response ?? '';
let parsed = null;
if (out && typeof out === 'object') parsed = out;
else if (typeof out === 'string') {
  const s = out.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) { try { parsed = JSON.parse(s.slice(a, b + 1)); } catch (e) { parsed = null; } }
}
if (!parsed || !Array.isArray(parsed.items)) return fail(502, 'ai_invalid_output', 'تعذر قراءة نتيجة التحليل. أعد المحاولة.');

const STATUS = {
  'compliant': 'Compliant',
  'partially compliant': 'Partially Compliant', 'partial': 'Partially Compliant', 'partially': 'Partially Compliant',
  'non-compliant': 'Non-Compliant', 'non compliant': 'Non-Compliant', 'noncompliant': 'Non-Compliant',
  'not applicable': 'Not Applicable', 'n/a': 'Not Applicable', 'na': 'Not Applicable',
  'not determinable': 'Not Determinable', 'undeterminable': 'Not Determinable'
};
const canon = (s) => STATUS[String(s ?? '').trim().toLowerCase()] || null;
const AR = { 'Compliant': 'مستوفى', 'Partially Compliant': 'مستوفى جزئياً', 'Non-Compliant': 'غير مستوفى', 'Not Applicable': 'غير منطبق', 'Not Determinable': 'غير قابل للتحديد' };
const COLOR = { 'Compliant': '#1b7f4b', 'Partially Compliant': '#b7791f', 'Non-Compliant': '#c53030', 'Not Applicable': '#718096', 'Not Determinable': '#4a5568' };

const verifyQuote = (q) => {
  const segs = String(q || '').split(/\.\.\.|…/).map(norm).filter((x) => x.length >= 10);
  return segs.length > 0 && segs.length <= 3 && segs.every((x) => policyNorm.includes(x));
};

const cyberOn = meta.is_service_provider === true;
const defs = [];
for (const ax of MATRIX.axes) for (const it of ax.items) defs.push({ ...it, axis: ax.id });
if (cyberOn) defs.push({ ...MATRIX.cyber, axis: 'L' });
const validIds = new Set(defs.map((d) => d.id));

const byId = new Map();
for (const it of parsed.items) {
  const id = clean(it && it.id, 10);
  if (validIds.has(id) && !byId.has(id)) byId.set(id, it);
}
if (byId.size < Math.ceil(defs.length / 2)) return fail(502, 'ai_incomplete_output', 'نتيجة التحليل ناقصة. أعد المحاولة.');

// ---------- 2) resolve each item (deterministic guards against hallucination) ----------
const resolved = {};
for (const d of defs) {
  const ai = byId.get(d.id) || {};
  let status = canon(ai.status);
  let evidence = clean(ai.evidence, 600);
  let gap = clean(ai.gap, 300);
  let action = clean(ai.action, 300);
  let note = '';
  const verified = evidence ? verifyQuote(evidence) : false;

  if (d.id === '4.2' && !meta.is_foreign_entity) {
    status = 'Not Applicable'; evidence = ''; gap = ''; action = ''; note = 'كيان مصري';
  } else {
    if (!status) { status = 'Not Determinable'; note = 'لم يُقيَّم'; }
    if ((status === 'Compliant' || status === 'Partially Compliant') && !verified) { status = 'Not Determinable'; note = 'لا يوجد اقتباس مُتحقَّق منه من نص السياسة'; }
    if (status === 'Not Applicable' && !verified) { status = 'Not Determinable'; note = 'لا يوجد اقتباس يثبت عدم الانطباق'; }
    if (status === 'Non-Compliant' && d.silence === 'ND' && !verified) { status = 'Not Determinable'; note = 'الصمت عن هذا البند لا يُعد مخالفة'; }
    if (status === 'Not Determinable' && note) { gap = note; action = ''; }
    if (status === 'Compliant') { gap = ''; action = ''; }
  }
  resolved[d.id] = { id: d.id, axis: d.axis, text: d.text, status, evidence: verified ? evidence : '', evidence_verified: verified, gap, action };
}

// ---------- 3) scoring (per the matrix formula) ----------
const axes = [];
let sumScores = 0;
let sumWeights = 0;
const tot = { compliant: 0, partial: 0, non: 0, na: 0, nd: 0 };
for (const ax of MATRIX.axes) {
  const c = { compliant: 0, partial: 0, non: 0, na: 0, nd: 0 };
  const items = ax.items.map((i) => resolved[i.id]);
  for (const it of items) {
    if (it.status === 'Compliant') c.compliant++;
    else if (it.status === 'Partially Compliant') c.partial++;
    else if (it.status === 'Non-Compliant') c.non++;
    else if (it.status === 'Not Applicable') c.na++;
    else c.nd++;
  }
  for (const k of Object.keys(tot)) tot[k] += c[k];
  const applicable = c.compliant + c.partial + c.non;
  const axisScore = applicable > 0 ? ax.weight * ((c.compliant + 0.5 * c.partial) / applicable) : null;
  if (applicable > 0) { sumScores += axisScore; sumWeights += ax.weight; }
  const violation = c.non > 0 || (CONFIG.INCLUDE_PARTIAL_IN_FINES && c.partial > 0);
  axes.push({
    id: ax.id, name: ax.name, weight: ax.weight, basis: ax.basis,
    applicable_items: applicable, counts: c,
    score: axisScore === null ? null : Math.round(axisScore * 100) / 100,
    axis_percent: axisScore === null ? null : Math.round((axisScore / ax.weight) * 100),
    has_violation: violation, penalty_ref: ax.penalty_ref, fine_min: ax.fine_min, fine_max: ax.fine_max, imprisonment: ax.imprisonment,
    items
  });
}
const score = sumWeights > 0 ? Math.round((sumScores / sumWeights) * 100) : null;
const determinable = tot.compliant + tot.partial + tot.non;
const coverageDen = determinable + tot.nd;
const coverage = coverageDen > 0 ? Math.round((determinable / coverageDen) * 100) / 100 : 0;
const confidence = coverage >= 0.7 ? 'high' : (coverage >= CONFIG.LOW_COVERAGE_BELOW ? 'medium' : 'low');

let risk = 'Unknown'; let riskAr = 'غير محدد';
if (score !== null) {
  if (score >= CONFIG.RISK_LOW_AT) { risk = 'Low'; riskAr = 'منخفض'; }
  else if (score >= CONFIG.RISK_MEDIUM_AT) { risk = 'Medium'; riskAr = 'متوسط'; }
  else { risk = 'High'; riskAr = 'مرتفع'; }
}

// ---------- 4) fines + Art. 49 (Law 151 only) ----------
const violAxes = axes.filter((a) => a.has_violation);
const totalMin = violAxes.reduce((s, a) => s + a.fine_min, 0);
const totalMax = violAxes.reduce((s, a) => s + a.fine_max, 0);
const baseAmount = CONFIG.ART49_BASE === 'max' ? totalMax : totalMin;
const settlement = Math.round(baseAmount * CONFIG.ART49_FACTOR);
const law151 = {
  basis: 'محاور فيها بند غير مستوفى' + (CONFIG.INCLUDE_PARTIAL_IN_FINES ? ' أو جزئي' : ''),
  axes_with_violation: violAxes.map((a) => a.id),
  total_min_fine: totalMin,
  total_max_fine: totalMax,
  settlement_art49: {
    formula: 'إجمالي الحد ' + (CONFIG.ART49_BASE === 'max' ? 'الأقصى' : 'الأدنى') + ' للغرامات المنطبقة × ' + (CONFIG.ART49_FACTOR * 100) + '%',
    amount: settlement,
    note: 'مرهون بنص المادة 49 الرسمي ومراجعة المحامي.'
  }
};

// ---------- 5) Law 175 (separate; never discounted by Art. 49) ----------
let cyber = { applicable: false };
if (cyberOn) {
  const r = resolved['L1'];
  cyber = {
    applicable: true, item: r.id, text: r.text, status: r.status, gap: r.gap, action: r.action,
    penalty_ref: MATRIX.cyber.penalty_ref, fine_min: MATRIX.cyber.fine_min, fine_max: MATRIX.cyber.fine_max,
    exposure_if_violated: r.status === 'Non-Compliant', note: MATRIX.cyber.note
  };
}

// ---------- 6) findings / recommendations ----------
const findings = [];
for (const a of axes) for (const it of a.items) if (it.status === 'Non-Compliant' || it.status === 'Partially Compliant') findings.push({ ...it, axis_name: a.name, weight: a.weight, penalty_ref: a.penalty_ref });
findings.sort((x, y) => (x.status === y.status ? y.weight - x.weight : (x.status === 'Non-Compliant' ? -1 : 1)));
const recommendations = [...new Set(findings.map((f) => f.action).filter(Boolean))].slice(0, 12);
if (cyber.applicable && cyber.status === 'Non-Compliant' && cyber.action) recommendations.push(cyber.action);

const fmtEGP = (n) => Number(n).toLocaleString('en-US') + ' ج.م';
const stats = {
  total_requirements: defs.filter((d) => d.axis !== 'L').length,
  compliant: tot.compliant, partially_compliant: tot.partial, non_compliant: tot.non,
  not_applicable: tot.na, not_determinable: tot.nd
};

// ---------- 7) HTML report (Arabic, RTL, no scripts, everything escaped) ----------
const statusPill = (s) => '<span class="pill" style="background:' + COLOR[s] + '">' + esc(AR[s]) + '</span>';
const axisRows = axes.map((a) => '<tr><td>' + a.id + '</td><td>' + esc(a.name) + '</td><td>' + a.weight + '%</td><td>' +
  (a.axis_percent === null ? '—' : a.axis_percent + '%') + '</td><td>' + a.counts.compliant + ' / ' + a.counts.partial + ' / ' + a.counts.non +
  '</td><td>' + a.counts.na + ' / ' + a.counts.nd + '</td></tr>').join('');
const findingsHtml = findings.length ? findings.map((f) => '<div class="card"><div>' + statusPill(f.status) + ' <b>' + esc(f.id) + '</b> — ' + esc(f.text) + '</div>' +
  '<p class="muted">المحور: ' + esc(f.axis_name) + ' | ' + esc(f.penalty_ref) + '</p>' +
  (f.evidence ? '<p><b>من السياسة:</b> ' + esc(f.evidence) + '</p>' : '') +
  (f.gap ? '<p><b>الفجوة:</b> ' + esc(f.gap) + '</p>' : '') +
  (f.action ? '<p><b>الإجراء المقترح:</b> ' + esc(f.action) + '</p>' : '') + '</div>').join('') : '<p>لا توجد مخالفات مؤكدة.</p>';
const banner = CONFIG.LEGAL_REVIEW_APPROVED ? '' :
  '<div class="warn">تنبيه: مصفوفة الامتثال (' + esc(MATRIX.version) + ') لم تُعتمد قانونياً بعد. الأرقام والمواد والغرامات استرشادية إلى حين مراجعة المحامي.</div>';
const lowConf = confidence === 'low' ? '<div class="warn">ثقة النتيجة منخفضة: عدد كبير من البنود لا يمكن الحكم عليها من نص السياسة وحده.</div>' : '';
const truncNote = prep.truncated ? '<div class="warn">تم فحص أول جزء فقط من المستند لطوله.</div>' : '';
const cyberHtml = cyber.applicable ? '<div class="box"><h3>المسار السيبراني (ق 175/2018) — مستقل عن تصالح م 49</h3><p>' + esc(cyber.text) + '</p><p>' + statusPill(cyber.status) +
  ' | الغرامة المحتملة: ' + fmtEGP(cyber.fine_min) + ' إلى ' + fmtEGP(cyber.fine_max) + ' (' + esc(cyber.penalty_ref) + ')</p></div>' : '';

const reportHtml = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">' +
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; base-uri \'none\'; form-action \'none\'">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1"><title>تقرير ماعت للامتثال</title><style>' +
  'body{font-family:Tahoma,Arial,sans-serif;background:#f8f7f3;color:#142c3b;margin:0;padding:20px}.c{max-width:980px;margin:auto}' +
  '.h{background:#142c3b;color:#fff;padding:24px;border-radius:12px}.s{background:#fff;margin-top:16px;padding:20px;border-radius:12px}' +
  '.score{font-size:44px;font-weight:bold}.card{border:1px solid #ddd;padding:14px;margin-top:12px;border-radius:8px}' +
  '.pill{color:#fff;padding:2px 10px;border-radius:12px;font-size:12px}.warn{background:#fff4d6;border:1px solid #e0b84a;padding:10px;border-radius:8px;margin-top:12px}' +
  '.box{background:#f5f1e8;padding:14px;border-radius:8px;margin-top:12px}.muted{color:#666;font-size:13px}' +
  'table{width:100%;border-collapse:collapse;font-size:14px}th,td{border-bottom:1px solid #e5e5e5;padding:8px;text-align:right}th{background:#142c3b;color:#fff}' +
  '</style></head><body><div class="c"><div class="h"><h1>تقرير ماعت للامتثال — قانون 151/2020</h1><p>' + esc(meta.company_name) + '</p></div>' + banner + lowConf + truncNote +
  '<div class="s"><h2>النتيجة الإجمالية</h2><div class="score">' + (score === null ? 'غير متاح' : score + '%') + '</div><p>مستوى الخطر: <b>' + esc(riskAr) +
  '</b> | نسبة تغطية البنود القابلة للحكم: ' + Math.round(coverage * 100) + '%</p></div>' +
  '<div class="s"><h2>المحاور التسعة</h2><table><tr><th>#</th><th>المحور</th><th>الوزن</th><th>نسبة المحور</th><th>مستوفى/جزئي/غير مستوفى</th><th>غير منطبق/غير محدد</th></tr>' + axisRows + '</table></div>' +
  '<div class="s"><h2>المخالفات والفجوات</h2>' + findingsHtml + '</div>' +
  '<div class="s"><h2>التعرض المالي (ق 151)</h2><div class="box"><p>نطاق الغرامات: ' + fmtEGP(totalMin) + ' إلى ' + fmtEGP(totalMax) + '</p><p>قيمة التصالح المقدّرة (م 49): <b>' + fmtEGP(settlement) +
  '</b></p><p class="muted">' + esc(law151.settlement_art49.formula) + ' — ' + esc(law151.settlement_art49.note) + '</p></div>' + cyberHtml + '</div>' +
  '<p class="muted">هذا تقرير آلي استرشادي ولا يُعد رأياً قانونياً. يجب مراجعة المواد والعقوبات على النصوص الرسمية بواسطة مختص قبل الاعتماد.</p></div></body></html>';

// ---------- 8) response (backward-compatible keys + new ones) ----------
const requirements = [];
for (const a of axes) for (const it of a.items) requirements.push({
  requirement: it.text, status: it.status, evidence_from_policy: it.evidence, legal_gap: it.gap,
  legal_article: a.basis, legal_reference: a.penalty_ref, penalty: '', corrective_action: it.action, item_id: it.id, axis_id: a.id
});
const violations = findings.filter((f) => f.status === 'Non-Compliant').map((f) => ({
  violation: f.text, legal_article: f.penalty_ref, legal_reference: f.axis_name,
  penalty: fmtEGP(MATRIX.axes.find((x) => x.id === f.axis).fine_min) + ' - ' + fmtEGP(MATRIX.axes.find((x) => x.id === f.axis).fine_max),
  corrective_action: f.action
}));
const penalties = violAxes.map((a, i) => ({
  number: i + 1, legal_article: a.penalty_ref, legal_reference: a.name,
  penalty: fmtEGP(a.fine_min) + ' - ' + fmtEGP(a.fine_max) + (a.imprisonment ? ' | ' + a.imprisonment : '')
}));

const response_body = {
  success: true,
  message: 'Compliance audit completed',
  matrix_version: MATRIX.version,
  legal_review_status: CONFIG.LEGAL_REVIEW_APPROVED ? 'APPROVED' : 'PENDING_LAWYER_REVIEW',
  compliance_score: score,
  risk_level: risk,
  risk_level_ar: riskAr,
  confidence,
  coverage,
  truncated: prep.truncated === true,
  statistics: stats,
  axes: axes.map(({ items, ...rest }) => ({ ...rest, items: items.map((i) => ({ id: i.id, status: i.status, evidence: i.evidence, gap: i.gap, action: i.action })) })),
  requirements,
  violations,
  compliant_items: requirements.filter((r) => r.status === 'Compliant').map((r) => r.item_id),
  penalties,
  law_151_fines: law151,
  settlement_art49: law151.settlement_art49.amount,
  cyber_175: cyber,
  recommendations,
  report_html: reportHtml
};

// What is persisted: scores and per-axis outcomes only. NO policy text, NO quotes, NO gap sentences.
const storage = {
  company_name: meta.company_name,
  compliance_score: score,
  risk_level: riskAr,
  status: 'completed',
  audit_result: {
    matrix_version: MATRIX.version,
    legal_review_status: response_body.legal_review_status,
    risk_level_en: risk,
    confidence,
    coverage,
    statistics: stats,
    axes: axes.map((a) => ({ id: a.id, weight: a.weight, score: a.score, percent: a.axis_percent, counts: a.counts, has_violation: a.has_violation })),
    violations: findings.filter((f) => f.status === 'Non-Compliant').map((f) => ({ item: f.id, axis: f.axis })),
    law_151_fines: { total_min_fine: totalMin, total_max_fine: totalMax, settlement_art49: settlement, basis: CONFIG.ART49_BASE },
    cyber_175: cyber.applicable ? { status: cyber.status, fine_min: cyber.fine_min, fine_max: cyber.fine_max } : null
  }
};

return [{ json: { ok: true, http_code: 200, response_body, storage } }];
