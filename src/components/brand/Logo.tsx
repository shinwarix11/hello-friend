import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWordmark = true,
  to = "/",
}: {
  className?: string;
  showWordmark?: boolean;
  to?: string;
}) {
  return (
    <Link to={to} className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="relative grid h-8 w-8 place-items-center rounded-[10px] bg-[image:var(--gradient-brand)] shadow-[0_8px_24px_-10px_var(--primary)] transition-transform duration-300 group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <path
            d="M12 2.5 4.5 5.8v5.9c0 4.6 3.1 8.4 7.5 9.8 4.4-1.4 7.5-5.2 7.5-9.8V5.8L12 2.5Z"
            stroke="white"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="m8.8 12.1 2.4 2.4 4-4.6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {showWordmark ? (
        <span className="font-display text-[17px] font-semibold tracking-tight">Aegis</span>
      ) : null}
    </Link>
  );
}
