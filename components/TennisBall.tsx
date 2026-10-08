export default function TennisBall({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="var(--color-ball)" />
      <path d="M4.2 7.5c5.2 2.6 7.6 6.3 7.6 8.5s-2.4 5.9-7.6 8.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path d="M27.8 7.5c-5.2 2.6-7.6 6.3-7.6 8.5s2.4 5.9 7.6 8.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
