// The team's official MA'At AI seal (public/logo.jpg, 640x640).
export default function Logo({ size = 44 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.jpg" width={size} height={size} alt="MA'At AI" style={{ borderRadius: '50%', display: 'block', flexShrink: 0 }} />
  );
}
