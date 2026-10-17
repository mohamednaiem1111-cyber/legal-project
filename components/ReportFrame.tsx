'use client';
// The HTML report is shown inside a sandboxed iframe: no scripts, no access to the app or the login token.
export default function ReportFrame({ html }: { html: string }) {
  return (
    <iframe
      title="تقرير الامتثال"
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={html}
      style={{ width: '100%', height: 900, border: '1px solid var(--line)', borderRadius: 12, background: '#fff' }}
    />
  );
}

export function downloadReport(html: string, name: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `maat-report-${name.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40) || 'report'}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
