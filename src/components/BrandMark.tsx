export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-lg bg-accent text-gold shadow-[0_6px_16px_rgba(21,40,71,0.22)] ring-1 ring-gold/80 ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
        <path
          d="M7.2 3.6h6.7L18.6 8v11.6a1.4 1.4 0 0 1-1.4 1.4H7.2a1.4 1.4 0 0 1-1.4-1.4V5a1.4 1.4 0 0 1 1.4-1.4Z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path d="M13.6 3.8V8h4.3" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8.2 12.4h7.2M8.2 15.8h4.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </span>
  );
}
