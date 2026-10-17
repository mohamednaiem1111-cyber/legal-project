// Run: deno test tests/proxy.test.ts
import { strict as nodeAssert } from 'node:assert';
const assertEquals = (a: unknown, b: unknown) => nodeAssert.deepStrictEqual(a, b);
const assert = (v: unknown) => nodeAssert.ok(v);
import { createHandler, type Config, type Deps } from '../lib/proxy.ts';

const ORIGIN = 'https://maat.example.app';
const cfg: Config = {
  n8nUrl: 'https://n8n.example/webhook/maat/compliance-audit', n8nKey: 'SECRET-KEY',
  allowedOrigins: [ORIGIN], maxBodyBytes: 6 * 1024 * 1024, maxPdfBytes: 5 * 1024 * 1024, n8nTimeoutMs: 200,
  auditsPerMin: 2, auditsPerDay: 10, globalAuditsPerDay: 150, breachPerMin: 10, breachPerDay: 100,
};

type Call = { url: string; init: RequestInit };
function setup(over: Partial<Deps> = {}, n8n?: (c: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const saved: Record<string, unknown>[] = [];
  const quota: string[] = [];
  const deps: Deps = {
    config: cfg,
    getUser: async (jwt) => (jwt === 'good' ? { id: 'user-1' } : null),
    takeQuota: async (_u, kind) => { quota.push(kind); return true; },
    saveAudit: async (row) => { saved.push(row); return 'audit-123'; },
    fetchFn: (async (url: string, init: RequestInit) => {
      const c = { url, init }; calls.push(c);
      return n8n ? n8n(c) : new Response(JSON.stringify({ success: true, compliance_score: 70, storage: { company_name: 'A', compliance_score: 70, risk_level: 'متوسط', audit_result: { x: 1 }, status: 'completed' } }), { status: 200 });
    }) as unknown as typeof fetch,
    ...over,
  };
  return { h: createHandler(deps), calls, saved, quota };
}
const req = (body: BodyInit | null, headers: Record<string, string> = {}, method = 'POST') =>
  new Request('https://x.supabase.co/functions/v1/maat-proxy', { method, body, headers: { origin: ORIGIN, authorization: 'Bearer good', ...headers } });
const jsonReq = (o: unknown, h: Record<string, string> = {}) => req(JSON.stringify(o), { 'content-type': 'application/json', ...h });
const pdf = () => new Blob([new TextEncoder().encode('%PDF-1.7\n' + 'x'.repeat(100))], { type: 'application/pdf' });

Deno.test('preflight from allowed origin -> 204 + CORS', async () => {
  const { h } = setup();
  const r = await h(req(null, {}, 'OPTIONS'));
  assertEquals(r.status, 204);
  assertEquals(r.headers.get('access-control-allow-origin'), ORIGIN);
});

Deno.test('foreign origin -> 403, n8n never called', async () => {
  const { h, calls } = setup();
  const r = await h(jsonReq({ policy_text: 'x' }, { origin: 'https://evil.example' }));
  assertEquals(r.status, 403); assertEquals(calls.length, 0);
  assertEquals(r.headers.get('access-control-allow-origin'), null);
});

Deno.test('no / bad token -> 401', async () => {
  const { h, calls } = setup();
  assertEquals((await h(jsonReq({}, { authorization: '' }))).status, 401);
  assertEquals((await h(jsonReq({}, { authorization: 'Bearer anon-key' }))).status, 401);
  assertEquals(calls.length, 0);
});

Deno.test('GET -> 405', async () => {
  const { h } = setup();
  assertEquals((await h(req(null, {}, 'GET'))).status, 405);
});

Deno.test('declared oversize -> 413', async () => {
  const { h } = setup();
  assertEquals((await h(jsonReq({}, { 'content-length': String(7 * 1024 * 1024) }))).status, 413);
});

Deno.test('wrong content-type -> 415', async () => {
  const { h } = setup();
  assertEquals((await h(req('hello', { 'content-type': 'text/plain' }))).status, 415);
});

Deno.test('JSON audit: secret header added, unknown fields dropped, storage saved and stripped', async () => {
  const { h, calls, saved } = setup();
  const r = await h(jsonReq({ policy_text: 'نص', company_name: 'A', evil_field: 'x', storage: { fake: 1 } }));
  assertEquals(r.status, 200);
  const sent = JSON.parse(String(calls[0].init.body));
  assertEquals(sent.evil_field, undefined); assertEquals(sent.storage, undefined);
  const hdrs = calls[0].init.headers as Record<string, string>;
  assertEquals(hdrs['x-maat-key'], 'SECRET-KEY');
  assertEquals(hdrs['x-maat-user'].length, 32); assert(!hdrs['x-maat-user'].includes('user-1'));
  const out = await r.json();
  assertEquals(out.storage, undefined); assertEquals(out.audit_id, 'audit-123'); assertEquals(out.saved, true);
  assertEquals(saved[0].user_id, 'user-1'); assertEquals(saved[0].report_html, null);
  assert(!JSON.stringify(out).includes('SECRET-KEY'));
});

Deno.test('PDF upload is forwarded as multipart field "data"', async () => {
  const { h, calls } = setup();
  const fd = new FormData(); fd.append('company_name', 'A'); fd.append('file', pdf(), 'p.pdf');
  const r = await h(new Request('https://x/f', { method: 'POST', body: fd, headers: { origin: ORIGIN, authorization: 'Bearer good' } }));
  assertEquals(r.status, 200);
  const body = calls[0].init.body as FormData;
  assert(body instanceof FormData); assert(body.get('data') instanceof File); assertEquals(body.get('company_name'), 'A');
});

Deno.test('fake PDF -> 415 and quota not consumed', async () => {
  const { h, calls, quota } = setup();
  const fd = new FormData(); fd.append('file', new Blob(['MZ-exe']), 'p.pdf');
  const r = await h(new Request('https://x/f', { method: 'POST', body: fd, headers: { origin: ORIGIN, authorization: 'Bearer good' } }));
  assertEquals(r.status, 415); assertEquals(calls.length, 0); assertEquals(quota.length, 0);
});

Deno.test('two files -> 400', async () => {
  const { h } = setup();
  const fd = new FormData(); fd.append('a', pdf(), 'a.pdf'); fd.append('b', pdf(), 'b.pdf');
  const r = await h(new Request('https://x/f', { method: 'POST', body: fd, headers: { origin: ORIGIN, authorization: 'Bearer good' } }));
  assertEquals(r.status, 400);
});

Deno.test('quota exceeded -> 429, n8n not called', async () => {
  const { h, calls } = setup({ takeQuota: async () => false });
  const r = await h(jsonReq({ policy_text: 'x' }));
  assertEquals(r.status, 429); assertEquals(r.headers.get('retry-after'), '60'); assertEquals(calls.length, 0);
});

Deno.test('breach uses breach quota and is never saved', async () => {
  const { h, quota, saved } = setup({}, () => new Response(JSON.stringify({ success: true, is_breach: true }), { status: 200 }));
  const r = await h(jsonReq({ request_type: 'incident_report', incident_date: '2026-10-13T10:00:00Z' }));
  assertEquals(r.status, 200); assertEquals(quota[0], 'breach'); assertEquals(saved.length, 0);
});

Deno.test('n8n wrong key (403) -> generic 502, nothing leaked', async () => {
  const { h } = setup({}, () => new Response('Authorization data is wrong!', { status: 403 }));
  const r = await h(jsonReq({ policy_text: 'x' }));
  assertEquals(r.status, 502);
  assert(!(await r.text()).includes('Authorization'));
});

Deno.test('n8n timeout -> 504', async () => {
  const { h } = setup({}, (c) => new Promise((_, rej) => c.init.signal!.addEventListener('abort', () => rej(c.init.signal!.reason))));
  const r = await h(jsonReq({ policy_text: 'x' }));
  assertEquals(r.status, 504);
});

Deno.test('n8n returns HTML/garbage -> 502', async () => {
  const { h } = setup({}, () => new Response('<html>error</html>', { status: 200 }));
  assertEquals((await h(jsonReq({ policy_text: 'x' }))).status, 502);
});

Deno.test('n8n 4xx validation error is passed through, not saved', async () => {
  const { h, saved } = setup({}, () => new Response(JSON.stringify({ success: false, error_code: 'policy_too_short', storage: { a: 1 } }), { status: 422 }));
  const r = await h(jsonReq({ policy_text: 'x' }));
  assertEquals(r.status, 422); assertEquals(saved.length, 0); assertEquals((await r.json()).storage, undefined);
});

Deno.test('save failure still returns the result (saved=false)', async () => {
  const { h } = setup({ saveAudit: async () => null });
  const out = await (await h(jsonReq({ policy_text: 'x' }))).json();
  assertEquals(out.saved, false); assertEquals(out.compliance_score, 70);
});

Deno.test('quota DB failure -> 500 generic', async () => {
  const { h } = setup({ takeQuota: async () => { throw new Error('db down'); } });
  const r = await h(jsonReq({ policy_text: 'x' }));
  assertEquals(r.status, 500); assert(!(await r.text()).includes('db down'));
});

Deno.test('server-to-server call without Origin still needs a user token', async () => {
  const { h } = setup();
  const r = await h(new Request('https://x/f', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } }));
  assertEquals(r.status, 401);
});

Deno.test('same-site request is allowed without listing the origin', async () => {
  const { h } = setup();
  const r = await h(new Request('https://maat-xyz.vercel.app/api/maat', {
    method: 'POST', body: JSON.stringify({ policy_text: 'x' }),
    headers: { origin: 'https://maat-xyz.vercel.app', authorization: 'Bearer good', 'content-type': 'application/json' },
  }));
  assertEquals(r.status, 200);
});
