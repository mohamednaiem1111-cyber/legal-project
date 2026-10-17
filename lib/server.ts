// Server-only wiring: reads secrets from Vercel environment variables.
// This file is imported ONLY by app/api/maat/route.ts, never by a page.
import { createClient } from '@supabase/supabase-js';
import { createHandler } from './proxy';

const num = (k: string, d: number) => {
  const n = Number(process.env[k]);
  return Number.isFinite(n) && n > 0 ? n : d;
};

const REQUIRED = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'MAAT_N8N_URL', 'MAAT_N8N_KEY'] as const;

let cached: ((req: Request) => Promise<Response>) | null = null;

export function missingEnv(): string[] {
  return REQUIRED.filter((k) => !process.env[k]);
}

export function getHandler() {
  if (cached) return cached;
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  cached = createHandler({
    config: {
      n8nUrl: process.env.MAAT_N8N_URL!,
      n8nKey: process.env.MAAT_N8N_KEY!,
      allowedOrigins: (process.env.MAAT_EXTRA_ORIGINS ?? '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean),
      maxBodyBytes: 4_400_000,          // Vercel limit is 4.5 MB per request
      maxPdfBytes: 4 * 1024 * 1024,     // 4 MB PDF
      n8nTimeoutMs: num('MAAT_N8N_TIMEOUT_MS', 240_000),
      auditsPerMin: num('MAAT_AUDITS_PER_MIN', 2),
      auditsPerDay: num('MAAT_AUDITS_PER_DAY', 10),
      globalAuditsPerDay: num('MAAT_GLOBAL_AUDITS_PER_DAY', 150),
      breachPerMin: 10,
      breachPerDay: 100,
    },
    getUser: async (jwt) => {
      const { data, error } = await admin.auth.getUser(jwt);
      return error || !data?.user ? null : { id: data.user.id };
    },
    takeQuota: async (userId, kind, perMin, perDay, globalPerDay) => {
      const { data, error } = await admin.rpc('maat_take_quota', {
        p_user: userId, p_kind: kind, p_per_minute: perMin, p_per_day: perDay, p_global_per_day: globalPerDay,
      });
      if (error) throw new Error('quota_rpc_failed');
      return data === true;
    },
    saveAudit: async (row) => {
      const { data, error } = await admin.from('compliance_audits').insert(row).select('id').single();
      if (error) { console.error(JSON.stringify({ event: 'save_failed', code: error.code })); return null; }
      return String(data.id);
    },
    fetchFn: fetch,
    log: (event, data) => console.log(JSON.stringify({ event, ...data })), // never logs policy text
  });
  return cached;
}
