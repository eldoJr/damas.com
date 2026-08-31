export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#81b64c" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <circle cx="16" cy="16" r="5" fill="rgba(255,255,255,0.9)" />
    </svg>
  );
}
