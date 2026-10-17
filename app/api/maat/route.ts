// POST /api/maat  - the only door to n8n.
import { getHandler, missingEnv } from '@/lib/server';

export const runtime = 'nodejs';
export const maxDuration = 300;        // Vercel Hobby maximum (seconds)
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const missing = missingEnv();
  if (missing.length) {
    console.error(JSON.stringify({ event: 'missing_env', missing }));
    return Response.json(
      { success: false, error_code: 'server_not_configured', message: 'الخادم غير مُعدّ بعد.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return getHandler()(req);
}
