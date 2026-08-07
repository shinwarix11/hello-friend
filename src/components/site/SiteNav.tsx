import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, ArrowRight } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Product", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Developers", href: "#developers" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav
        className={cn(
          "pointer-events-auto w-full max-w-6xl rounded-2xl px-3 transition-all duration-500",
          scrolled ? "glass shadow-[0_20px_60px_-40px_black]" : "border border-transparent",
        )}
      >
        <div className="flex h-14 items-center justify-between gap-4">
          <Logo />

          <div className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="relative rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {session ? (
              <Button asChild size="sm" className="bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90">
                <Link to="/dashboard">
                  Dashboard <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth" search={{ mode: "signin", redirect: undefined }}>
                    Sign in
                  </Link>
                </Button>
                <Button asChild size="sm" className="bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90">
                  <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
                    Get started
                  </Link>
                </Button>
              </>
            )}
          </div>

          <button
            className="grid h-9 w-9 place-items-center rounded-lg border border-border md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        <div
          className={cn(
            "grid overflow-hidden transition-all duration-300 md:hidden",
            open ? "grid-rows-[1fr] pb-3" : "grid-rows-[0fr]",
          )}
        >
          <div className="min-h-0">
            <div className="flex flex-col gap-1 border-t border-border pt-3">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
              <Button asChild className="mt-2 bg-[image:var(--gradient-brand)] text-primary-foreground">
                <Link to={session ? "/dashboard" : "/auth"} search={session ? undefined : { mode: "signup", redirect: undefined }}>
                  {session ? "Open dashboard" : "Get started free"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
