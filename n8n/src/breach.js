// MAAT - Breach Processing (72-hour path).
// Uses ONLY facts supplied by the requester. Nothing is invented. Nothing is stored.
const b = $('Guard').first().json.breach_input || {};

const clean = (v, max = 500) => String(v ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g, '')
  .trim()
  .slice(0, max);
const parseBool = (v) => v === true || ['true', '1', 'yes', 'y', 'on'].includes(String(v ?? '').trim().toLowerCase());
const has = (v) => v !== null && v !== undefined && String(v).trim() !== '';

const errors = [];
const ISO = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const parseTs = (v, name, required) => {
  const s = clean(v, 40);
  if (!s) { if (required) errors.push(name + ' مطلوب'); return null; }
  const m = ISO.exec(s);
  if (!m) { errors.push(name + ': استخدم صيغة ISO 8601 مع المنطقة الزمنية، مثال 2026-10-13T14:30:00+03:00'); return null; }
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > new Date(Date.UTC(y, mo, 0)).getUTCDate()) { errors.push(name + ': تاريخ غير صالح'); return null; }
  const dt = new Date(s);
  if (isNaN(dt.getTime())) { errors.push(name + ': تاريخ غير صالح'); return null; }
  return dt;
};

const now = new Date();
// incident_date = date/time the company BECAME AWARE of the breach (frontend contract). awareness_time is accepted as an alias.
const awareness = parseTs(b.awareness_time ?? b.incident_date ?? b.breach_discovery_time, 'incident_date (وقت علم الشركة بالخرق)', true);
const incident = parseTs(b.incident_time, 'incident_time', false);
const centerNotified = parseTs(b.center_notified_at, 'center_notified_at', false);
if (awareness && awareness.getTime() > now.getTime() + 5 * 60000) errors.push('awareness_time في المستقبل');
if (awareness && incident && incident.getTime() > awareness.getTime()) errors.push('incident_time لا يمكن أن يكون بعد وقت العلم');
if (centerNotified && awareness && centerNotified.getTime() < awareness.getTime()) errors.push('center_notified_at قبل وقت العلم');

let affected = null;
if (has(b.affected_count)) {
  const n = Number(b.affected_count);
  if (!Number.isInteger(n) || n < 0 || n > 1e9) errors.push('affected_count يجب أن يكون عدداً صحيحاً غير سالب');
  else affected = n;
}

if (errors.length) {
  return [{ json: { http_code: 400, response_body: { success: false, error_code: 'invalid_breach_request', message: 'بيانات الطلب غير صالحة.', errors } } }];
}

// ---- time calculations ----
const H72 = 72 * 3600 * 1000;
const deadline = new Date(awareness.getTime() + H72);
const nationalSecurity = parseBool(b.national_security);
const fmt = (d) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' }).format(d);
const cairoDate = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
// Egypt weekend = Friday + Saturday. Official holidays are NOT considered.
const addWorkingDays = (d, n) => {
  let cur = new Date(cairoDate(d) + 'T00:00:00Z');
  let left = n;
  while (left > 0) {
    cur = new Date(cur.getTime() + 86400000);
    const wd = cur.getUTCDay();
    if (wd !== 5 && wd !== 6) left -= 1;
  }
  return cur.toISOString().slice(0, 10);
};

let status;
let remainingHours = null;
let overdueHours = null;
let notifiedOnTime = null;
if (centerNotified) {
  notifiedOnTime = centerNotified.getTime() <= deadline.getTime();
  status = notifiedOnTime ? 'CENTER_NOTIFIED_ON_TIME' : 'CENTER_NOTIFIED_LATE';
} else if (now.getTime() <= deadline.getTime()) {
  status = 'ACTIVE';
  remainingHours = Math.round(((deadline.getTime() - now.getTime()) / 3600000) * 10) / 10;
} else {
  status = 'OVERDUE';
  overdueHours = Math.round(((now.getTime() - deadline.getTime()) / 3600000) * 10) / 10;
}

const subjectsBase = centerNotified || deadline;
const subjectsDeadline = addWorkingDays(subjectsBase, 3);

// ---- supplied facts (sanitised) ----
const dpoIn = (b.dpo && typeof b.dpo === 'object' && !Array.isArray(b.dpo)) ? b.dpo : {};
const categories = (Array.isArray(b.categories) ? b.categories : (has(b.categories) ? [b.categories] : []))
  .slice(0, 20).map((c) => clean(c, 80)).filter(Boolean);
const facts = {
  company_name: clean(b.company_name ?? b.companyName ?? b.organization, 120),
  nature_and_causes: clean(b.description, 2000),
  affected_count: affected,
  categories,
  potential_impact: clean(b.potential_impact, 2000),
  containment_measures: clean(b.containment_measures, 2000),
  documentation_reference: clean(b.documentation_reference, 300),
  dpo: {
    name: clean(dpoIn.name, 120),
    position: clean(dpoIn.position, 120),
    email: clean(dpoIn.email, 150),
    phone: clean(dpoIn.phone, 40)
  }
};
const dpoProvided = !!(facts.dpo.name || facts.dpo.email || facts.dpo.phone);

const required52 = [
  { n: 1, label: 'طبيعة الخرق وأسبابه', ok: !!facts.nature_and_causes },
  { n: 2, label: 'عدد الأشخاص المتضررين', ok: facts.affected_count !== null },
  { n: 3, label: 'بيانات مسؤول حماية البيانات (DPO)', ok: dpoProvided },
  { n: 4, label: 'الآثار المحتملة للخرق', ok: !!facts.potential_impact },
  { n: 5, label: 'التدابير المتخذة للاحتواء', ok: !!facts.containment_measures },
  { n: 6, label: 'توثيق الحادثة (مرجع السجل الداخلي)', ok: !!facts.documentation_reference }
];
const missing = required52.filter((r) => !r.ok).map((r) => r.label);
const MISSING = '[غير مُدخل - يجب استكماله]';
const val = (x) => (x === null || x === undefined || x === '' ? MISSING : String(x));

const notificationDraft = [
  'مسودة إخطار بواقعة خرق بيانات شخصية - إلى مركز حماية البيانات الشخصية',
  '(مسودة تحتاج مراجعة قانونية قبل الإرسال)',
  '',
  'الجهة: ' + val(facts.company_name),
  'وقت العلم بالخرق: ' + fmt(awareness) + ' (توقيت القاهرة)',
  incident ? 'وقت وقوع الحادثة: ' + fmt(incident) + ' (توقيت القاهرة)' : 'وقت وقوع الحادثة: ' + MISSING,
  '',
  '1) طبيعة الخرق وأسبابه: ' + val(facts.nature_and_causes),
  '2) عدد المتضررين: ' + val(facts.affected_count),
  '   فئات البيانات: ' + (categories.length ? categories.join('، ') : MISSING),
  '3) مسؤول حماية البيانات: ' + (dpoProvided ? [facts.dpo.name, facts.dpo.position, facts.dpo.email, facts.dpo.phone].filter(Boolean).join(' - ') : MISSING),
  '4) الآثار المحتملة: ' + val(facts.potential_impact),
  '5) التدابير الاحتوائية: ' + val(facts.containment_measures),
  '6) التوثيق: ' + val(facts.documentation_reference)
].join('\n');

const victimReportDraft = [
  'مسودة بلاغ لمباحث الإنترنت لإثبات صفة المنشأة كمجني عليها (مسودة تحتاج مراجعة المحامي)',
  '',
  'مقدّم البلاغ: ' + val(facts.company_name),
  'تاريخ العلم بالواقعة: ' + fmt(awareness) + ' (توقيت القاهرة)',
  'وصف الواقعة: ' + val(facts.nature_and_causes),
  'فئات البيانات المتأثرة: ' + (categories.length ? categories.join('، ') : MISSING),
  'الإجراءات الاحتوائية المتخذة: ' + val(facts.containment_measures),
  'الطلب: إثبات الواقعة واتخاذ اللازم قانوناً.'
].join('\n');

const isExpired = centerNotified ? !notifiedOnTime : now.getTime() > deadline.getTime();
const hoursLeft = status === 'ACTIVE' ? Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 3600000)) : 0;
const minutesLeft = status === 'ACTIVE' ? Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 60000) % 60) : 0;
// Same urgency labels the old Breach Protocol Calculator used, so the existing UI keeps working.
const urgency = centerNotified ? 'NOTIFIED' : (status === 'OVERDUE' ? 'EXPIRED' : (hoursLeft < 12 ? 'CRITICAL' : (hoursLeft < 24 ? 'WARNING' : 'SAFE')));

const response_body = {
  success: true,
  is_breach: true,
  hours_left: hoursLeft,
  minutes_left: minutesLeft,
  urgency,
  deadline_time: deadline.toISOString(),
  deadline_iso: deadline.toISOString(),
  is_expired: isExpired,
  actions: {
    notify_center_72h: 'إخطار مركز حماية البيانات خلال 72 ساعة من وقت العلم (م 7 ق 151)',
    notify_subjects_3d: 'إخطار أصحاب البيانات المتضررين خلال 3 أيام عمل',
    police_report_175: 'تحرير محضر بمباحث الإنترنت لإثبات صفة المجني عليه (م 17، 18 ق 175)'
  },
  action_plan: {
    step_1: 'إخطار مركز حماية البيانات الشخصية خلال 72 ساعة من وقت العلم.',
    step_2: 'إخطار أصحاب البيانات المتضررين خلال 3 أيام عمل.',
    step_3: 'تحرير بلاغ لدى الإدارة العامة لمباحث الإنترنت لإثبات صفة المجني عليه.'
  },
  request_type: 'breach_response',
  status,
  computed_at_utc: now.toISOString(),
  awareness_time_utc: awareness.toISOString(),
  deadline_72h_utc: deadline.toISOString(),
  deadline_72h_cairo: fmt(deadline),
  immediate_notification_required: nationalSecurity,
  remaining_hours: remainingHours,
  overdue_by_hours: overdueHours,
  center_notified_on_time: notifiedOnTime,
  notify_data_subjects_by: subjectsDeadline,
  notify_data_subjects_basis: centerNotified
    ? '3 أيام عمل من تاريخ إبلاغ المركز الفعلي'
    : 'مثال: إذا أُبلغ المركز عند نهاية المهلة. الموعد الفعلي = 3 أيام عمل من تاريخ إبلاغ المركز',
  working_days_note: 'العطلة الأسبوعية الجمعة والسبت. العطلات الرسمية غير محتسبة، راجعها يدوياً.',
  required_notification_items_missing: missing,
  notification_draft: notificationDraft,
  law_175_victim_report_draft: victimReportDraft,
  disclaimer: 'المواعيد محسوبة آلياً من البيانات المُدخلة وتحتاج مراجعة قانونية. لا يتم حفظ أي بيانات عن هذه الحادثة.'
};

return [{ json: { http_code: 200, response_body } }];
