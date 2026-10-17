// MAAT v2 - Guard: second-line limits, input validation, routing.
// Authentication is done by the Webhook node itself (Header Auth credential).
// Only the server-side proxy (Supabase Edge Function) knows that header; browsers never call n8n directly.
// ===================== CONFIG - edit only this block =====================
const ALLOWED_ORIGINS = [];                // leave EMPTY in v2 (server-to-server calls carry no Origin). Fill only if you call n8n from a browser.
const MAX_PDF_BYTES = 5 * 1024 * 1024;     // 5 MB
const MAX_TEXT_CHARS = 120000;             // pasted policy text
const MAX_JSON_CHARS = 60000;              // breach requests
const RATE_PER_USER_PER_MIN = 3;           // keyed on x-maat-user (opaque id sent by the proxy)
const RATE_GLOBAL_PER_MIN = 20;
const RATE_GLOBAL_PER_DAY = 200;           // safety net for the n8n execution quota
const NON_EXEMPT_ENTITY_TYPES = ['money_transfer', 'exchange', 'money_transfer_company', 'exchange_company'];
// =========================================================================

const first = $input.first();
const j = first.json || {};
const headers = j.headers || {};
const body = (j.body && typeof j.body === 'object' && !Array.isArray(j.body)) ? j.body : {};

const clean = (v, max = 500) => String(v ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g, '')
  .trim()
  .slice(0, max);
const parseBool = (v) => v === true || ['true', '1', 'yes', 'y', 'on'].includes(String(v ?? '').trim().toLowerCase());
const reject = (code, error_code, message, extra = {}) => [{
  json: { early: true, http_code: code, response_body: { success: false, error_code, message, ...extra } }
}];

// 1) Optional origin allow-list (disabled when the list is empty).
const origin = clean(headers.origin, 200);
if (ALLOWED_ORIGINS.length && !ALLOWED_ORIGINS.includes(origin)) {
  return reject(403, 'origin_not_allowed', 'المصدر غير مسموح به.');
}

// 2) Second-line rate limiting (per user, global per minute, global per day). The proxy enforces the real per-user quota.
const sd = $getWorkflowStaticData('global');
const now = Date.now();
const day = new Date(now).toISOString().slice(0, 10);
if (!sd.daily || sd.daily.day !== day) sd.daily = { day, n: 0 };
sd.gl = (Array.isArray(sd.gl) ? sd.gl : []).filter((t) => now - t < 60000);
sd.rl = (sd.rl && typeof sd.rl === 'object') ? sd.rl : {};
for (const k of Object.keys(sd.rl)) {
  sd.rl[k] = sd.rl[k].filter((t) => now - t < 60000);
  if (!sd.rl[k].length) delete sd.rl[k];
}
if (Object.keys(sd.rl).length > 500) sd.rl = {};
const ip = clean(headers['x-maat-user'] || 'anonymous', 80);
const mine = sd.rl[ip] || [];
if (mine.length >= RATE_PER_USER_PER_MIN || sd.gl.length >= RATE_GLOBAL_PER_MIN || sd.daily.n >= RATE_GLOBAL_PER_DAY) {
  return reject(429, 'rate_limited', 'طلبات كثيرة. حاول بعد دقيقة.', { retry_after_seconds: 60 });
}
mine.push(now);
sd.rl[ip] = mine;
sd.gl.push(now);
sd.daily.n += 1;

// 3) Route
const TYPE_ALIASES = { audit: 'audit', compliance_check: 'audit', data_audit: 'audit', breach_response: 'breach_response', incident_report: 'breach_response', breach: 'breach_response' };
const requestType = TYPE_ALIASES[clean(body.request_type, 40).toLowerCase() || 'audit'];
if (!requestType) {
  return reject(400, 'invalid_request_type', 'request_type يجب أن يكون audit أو breach_response.');
}

if (requestType === 'breach_response') {
  let size = 0;
  try { size = JSON.stringify(body).length; } catch (e) { size = Infinity; }
  if (size > MAX_JSON_CHARS) return reject(413, 'payload_too_large', 'حجم الطلب أكبر من المسموح.');
  return [{ json: { early: false, route: 'breach', has_pdf: false, breach_input: body } }];
}

// 4) Audit request
const companyName = clean(body.company_name ?? body.companyName ?? body.organization, 120) || 'Not provided';
const entityType = clean(body.entity_type, 40).toLowerCase();
const cbeExempt = parseBool(body.cbe_exempt);
if (cbeExempt && !NON_EXEMPT_ENTITY_TYPES.includes(entityType)) {
  return [{
    json: {
      early: true,
      http_code: 200,
      response_body: {
        success: true,
        exempt: true,
        message: 'الجهة مُعلَن أنها خاضعة لرقابة البنك المركزي المصري وبالتالي مستثناة من قانون 151 لسنة 2020 (م 3 بند 6 من مواد الإصدار). لم يُجرَ فحص.',
        declared_by_requester: true,
        note: 'هذا الإعفاء مُعلَن من مقدّم الطلب ولم يتم التحقق منه. شركات تحويل الأموال والصرافة غير مستثناة وفق المصفوفة.'
      }
    }
  }];
}

// The multipart field name decides the binary key (data, data0, file...). Take the first one and re-map it to "data".
const binKeys = first.binary ? Object.keys(first.binary) : [];
if (binKeys.length > 1) return reject(400, 'too_many_files', 'أرسل ملفاً واحداً فقط.');
const binKey = binKeys[0] || null;
let hasPdf = false;
let textInput = null;
if (binKey) {
  const buf = await this.helpers.getBinaryDataBuffer(0, binKey);
  if (buf.length > MAX_PDF_BYTES) return reject(413, 'file_too_large', 'حجم الملف أكبر من 5 ميجابايت.');
  if (buf.slice(0, 5).toString('latin1') !== '%PDF-') return reject(415, 'not_a_pdf', 'الملف المرسل ليس PDF صالحاً.');
  hasPdf = true;
} else {
  const t = [body.policy_text, body.text, body.privacy_policy_text, body.documentText]
    .find((x) => typeof x === 'string' && x.trim().length > 0);
  if (!t) return reject(400, 'no_policy', 'أرسل ملف PDF أو نص السياسة.');
  if (t.length > MAX_TEXT_CHARS) return reject(413, 'text_too_large', 'النص أطول من المسموح.');
  textInput = t;
}

return [{
  json: {
    early: false,
    route: 'audit',
    has_pdf: hasPdf,
    meta: {
      company_name: companyName,
      is_service_provider: parseBool(body.is_service_provider),
      is_foreign_entity: parseBool(body.is_foreign_entity),
      ropa_input_raw: body.ropa_input ?? null,
      text_input: textInput
    }
  },
  binary: hasPdf ? { data: first.binary[binKey] } : undefined
}];
