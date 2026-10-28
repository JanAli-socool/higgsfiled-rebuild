import Link from "next/link";

// A film frame with a play notch: a still that is about to move.
export function Logo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`} aria-label="Reel home">
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <rect x="2.5" y="4.5" width="19" height="15" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2.5 8.5h19M2.5 15.5h19" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
        <path d="M10 10.2v3.6l3.2-1.8z" fill="var(--accent)" />
      </svg>
      <span>Reel</span>
    </Link>
  );
}
