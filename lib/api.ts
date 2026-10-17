'use client';
// Calls from the pages to our own /api/maat route (same site).
import { supabase } from './supabaseClient';

export type ApiError = { success: false; error_code: string; message: string; status: number };
export type Json = Record<string, any>;

export const MAX_PDF_BYTES = 4 * 1024 * 1024;

async function token(): Promise<string | null> {
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token ?? null;
}

async function post(body: FormData | Json): Promise<Json | ApiError> {
  const t = await token();
  if (!t) return { success: false, error_code: 'not_authenticated', message: 'سجّل الدخول أولاً.', status: 401 };
  const isForm = body instanceof FormData;
  let res: Response;
  try {
    res = await fetch('/api/maat', {
      method: 'POST',
      headers: isForm ? { Authorization: `Bearer ${t}` } : { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: isForm ? body : JSON.stringify(body),
    });
  } catch {
    return { success: false, error_code: 'network_error', message: 'تعذر الاتصال بالخادم. تأكد من الإنترنت.', status: 0 };
  }
  let data: Json | null = null;
  try { data = await res.json(); } catch { /* not JSON */ }
  if (!res.ok || !data || data.success === false) {
    return {
      success: false,
      error_code: data?.error_code ?? 'error',
      message: data?.message ?? (res.status === 504 ? 'التحليل أخذ وقتاً أطول من المتوقع. حاول مرة أخرى.' : 'حدث خطأ غير متوقع.'),
      status: res.status,
    };
  }
  return data;
}

export function isError(x: Json | ApiError): x is ApiError {
  return (x as ApiError).success === false;
}

export async function runAudit(input: {
  companyName: string; file?: File | null; policyText?: string;
  isServiceProvider: boolean; isForeignEntity: boolean;
}) {
  if (input.file) {
    const fd = new FormData();
    fd.append('request_type', 'audit');
    fd.append('company_name', input.companyName);
    fd.append('is_service_provider', String(input.isServiceProvider));
    fd.append('is_foreign_entity', String(input.isForeignEntity));
    fd.append('file', input.file, input.file.name);
    return post(fd);
  }
  return post({
    request_type: 'audit',
    company_name: input.companyName,
    policy_text: input.policyText ?? '',
    is_service_provider: input.isServiceProvider,
    is_foreign_entity: input.isForeignEntity,
  });
}

export async function checkBreach(input: Json) {
  return post({ request_type: 'breach_response', ...input });
}

export async function listMyAudits() {
  return supabase()
    .from('compliance_audits')
    .select('id, created_at, company_name, compliance_score, risk_level, audit_result')
    .order('created_at', { ascending: false })
    .limit(50);
}

// Right to erasure: RLS only lets a user delete his own rows; the filter is required by PostgREST.
export async function deleteMyAudits() {
  return supabase().from('compliance_audits').delete().not('id', 'is', null);
}
