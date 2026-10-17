// =============================================================================
// MAAT - server-side guard between the browser and n8n (used by app/api/maat/route.ts)
//
//  Browser --(user token)--> /api/maat --(secret header)--> n8n
//                                 |
//                                 +--> Supabase: daily quota + save the summary
//
// Order: same-site check -> size -> logged-in user -> input whitelist -> PDF check
//        -> quota -> n8n -> save summary -> answer (internal fields removed)
// Pure Web-standard code (Request/Response) so it can be unit-tested without Next.js.
// =============================================================================

export type Kind = 'audit' | 'breach';

export interface Config {
  n8nUrl: string;
  n8nKey: string;
  allowedOrigins: string[];
  maxBodyBytes: number;
  maxPdfBytes: number;
  n8nTimeoutMs: number;
  auditsPerMin: number;
  auditsPerDay: number;
  globalAuditsPerDay: number;
  breachPerMin: number;
  breachPerDay: number;
}

export interface Deps {
  config: Config;
  getUser: (jwt: string) => Promise<{ id: string } | null>;
  takeQuota: (userId: string, kind: Kind, perMin: number, perDay: number, globalPerDay: number) => Promise<boolean>;
  saveAudit: (row: Record<string, unknown>) => Promise<string | null>;
  fetchFn: typeof fetch;
  log?: (event: string, data?: Record<string, unknown>) => void;
}

// Only these fields are forwarded to n8n. Anything else the browser sends is dropped.
const ALLOWED_FIELDS = new Set([
  'request_type', 'company_name', 'companyName', 'organization', 'entity_type', 'cbe_exempt',
  'is_service_provider', 'is_foreign_entity', 'ropa_input',
  'policy_text', 'text', 'privacy_policy_text', 'documentText',
  // breach fields
  'incident_date', 'awareness_time', 'breach_discovery_time', 'incident_time', 'center_notified_at',
  'description', 'severity', 'affected_count', 'categories', 'potential_impact', 'containment_measures',
  'documentation_reference', 'national_security', 'dpo',
]);
const BREACH_TYPES = new Set(['breach_response', 'incident_report', 'breach']);

const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  });

const err = (status: number, code: string, message: string, cors: Record<string, string>) =>
  json(status, { success: false, error_code: code, message }, cors);

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function pick(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (ALLOWED_FIELDS.has(k)) out[k] = v;
  return out;
}

export function createHandler(deps: Deps) {
  const c = deps.config;
  const log = deps.log ?? (() => {});

  return async function handle(req: Request): Promise<Response> {
    // ---- 1. CORS / Origin ----
    const origin = req.headers.get('origin');
    let selfOrigin = '';
    try { selfOrigin = new URL(req.url).origin; } catch { /* ignore */ }
    // Same site is always allowed; extra origins only if listed. No Origin = not a browser (still needs a user token).
    const originOk = !origin || origin === selfOrigin || c.allowedOrigins.includes(origin);
    const cors: Record<string, string> = origin && originOk
      ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '600',
        'Vary': 'Origin',
      }
      : { 'Vary': 'Origin' };

    if (!originOk) return err(403, 'origin_not_allowed', 'المصدر غير مسموح به.', cors);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return err(405, 'method_not_allowed', 'استخدم POST.', cors);

    try {
      // ---- 2. Size limit (header first, real size after reading) ----
      const declared = Number(req.headers.get('content-length') ?? '0');
      if (declared > c.maxBodyBytes) return err(413, 'payload_too_large', 'حجم الطلب أكبر من المسموح (4 ميجابايت للملف).', cors);

      // ---- 3. Logged-in user only ----
      const auth = req.headers.get('authorization') ?? '';
      const jwt = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
      const user = jwt ? await deps.getUser(jwt) : null;
      if (!user) return err(401, 'not_authenticated', 'سجّل الدخول أولاً.', cors);

      // ---- parse body (multipart with a PDF, or JSON) ----
      const ctype = (req.headers.get('content-type') ?? '').toLowerCase();
      let fields: Record<string, unknown> = {};
      let file: File | null = null;

      if (ctype.startsWith('multipart/form-data')) {
        const raw = new Uint8Array(await req.arrayBuffer());
        if (raw.byteLength > c.maxBodyBytes) return err(413, 'payload_too_large', 'حجم الطلب أكبر من المسموح.', cors);
        const form = await new Response(raw, { headers: { 'content-type': req.headers.get('content-type')! } }).formData();
        const files: File[] = [];
        for (const [k, v] of form.entries()) {
          if (typeof v === 'string') fields[k] = v;
          else files.push(v as File);
        }
        if (files.length > 1) return err(400, 'too_many_files', 'أرسل ملفاً واحداً فقط.', cors);
        file = files[0] ?? null;
      } else if (ctype.startsWith('application/json')) {
        const raw = await req.text();
        if (raw.length > c.maxBodyBytes) return err(413, 'payload_too_large', 'حجم الطلب أكبر من المسموح.', cors);
        let parsed: unknown;
        try { parsed = JSON.parse(raw); } catch { return err(400, 'invalid_json', 'صيغة JSON غير صحيحة.', cors); }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return err(400, 'invalid_json', 'يجب إرسال كائن JSON.', cors);
        fields = parsed as Record<string, unknown>;
      } else {
        return err(415, 'unsupported_content_type', 'استخدم multipart/form-data أو application/json.', cors);
      }

      fields = pick(fields);
      const kind: Kind = BREACH_TYPES.has(String(fields.request_type ?? '').toLowerCase()) ? 'breach' : 'audit';
      if (kind === 'breach' && file) return err(400, 'unexpected_file', 'بلاغ الخرق لا يحتاج ملفاً.', cors);

      // ---- 5. PDF validation ----
      let pdfBytes: Uint8Array<ArrayBuffer> | null = null;
      if (file) {
        if (file.size > c.maxPdfBytes) return err(413, 'file_too_large', 'حجم الملف أكبر من 4 ميجابايت.', cors);
        pdfBytes = new Uint8Array(await file.arrayBuffer());
        const magic = String.fromCharCode(...pdfBytes.slice(0, 5));
        if (magic !== '%PDF-') return err(415, 'not_a_pdf', 'الملف المرسل ليس PDF صالحاً.', cors);
      }

      // ---- 4. Quota (after validation so bad requests don't burn quota) ----
      const allowed = kind === 'audit'
        ? await deps.takeQuota(user.id, 'audit', c.auditsPerMin, c.auditsPerDay, c.globalAuditsPerDay)
        : await deps.takeQuota(user.id, 'breach', c.breachPerMin, c.breachPerDay, 1_000_000);
      if (!allowed) {
        return err(429, 'quota_exceeded', 'وصلت للحد المسموح من الفحوصات. حاول لاحقاً.', { ...cors, 'Retry-After': '60' });
      }

      // ---- 6. Call n8n ----
      const userTag = (await sha256Hex(user.id)).slice(0, 32);
      const headers: Record<string, string> = { 'x-maat-key': c.n8nKey, 'x-maat-user': userTag };
      let body: BodyInit;
      if (pdfBytes) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(fields)) fd.append(k, typeof v === 'string' ? v : JSON.stringify(v));
        fd.append('data', new Blob([pdfBytes], { type: 'application/pdf' }), 'policy.pdf');
        body = fd;
      } else {
        headers['content-type'] = 'application/json';
        body = JSON.stringify(fields);
      }

      const started = Date.now();
      let upstream: Response;
      try {
        upstream = await deps.fetchFn(c.n8nUrl, {
          method: 'POST', headers, body, signal: AbortSignal.timeout(c.n8nTimeoutMs),
        });
      } catch (e) {
        const timeout = (e as Error)?.name === 'TimeoutError' || (e as Error)?.name === 'AbortError';
        log('n8n_unreachable', { timeout, ms: Date.now() - started });
        return timeout
          ? err(504, 'analysis_timeout', 'التحليل أخذ وقتاً أطول من المتوقع. حاول مرة أخرى.', cors)
          : err(502, 'analysis_unavailable', 'خدمة التحليل غير متاحة الآن.', cors);
      }
      log('n8n_done', { status: upstream.status, ms: Date.now() - started, kind });

      if (upstream.status === 401 || upstream.status === 403 || upstream.status === 404) {
        // Wrong key / workflow inactive / wrong URL. Never leak details to the browser.
        log('n8n_misconfigured', { status: upstream.status });
        return err(502, 'analysis_unavailable', 'خدمة التحليل غير متاحة الآن.', cors);
      }

      const text = await upstream.text();
      let result: Record<string, unknown>;
      try { result = JSON.parse(text); } catch {
        log('n8n_bad_json', { status: upstream.status, length: text.length });
        return err(502, 'analysis_failed', 'تعذر قراءة نتيجة التحليل.', cors);
      }
      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        return err(502, 'analysis_failed', 'تعذر قراءة نتيجة التحليل.', cors);
      }

      // ---- 7. Save the minimal summary (audits only) ----
      const storage = result.storage as Record<string, unknown> | undefined;
      delete result.storage;
      if (kind === 'audit' && upstream.ok && result.success === true && storage && typeof storage === 'object') {
        const id = await deps.saveAudit({
          user_id: user.id,
          company_name: storage.company_name ?? null,
          compliance_score: storage.compliance_score ?? null,
          risk_level: storage.risk_level ?? null,
          audit_result: storage.audit_result ?? null,
          status: storage.status ?? 'completed',
          policy_filename: null,
          report_html: null,
        });
        result.audit_id = id;
        result.saved = id !== null;
      }

      // ---- 8. Return ----
      const status = upstream.status >= 500 ? 502 : upstream.status;
      return json(status, result, cors);
    } catch (e) {
      log('proxy_error', { name: (e as Error)?.name });
      return err(500, 'internal_error', 'حدث خطأ غير متوقع.', cors);
    }
  };
}

