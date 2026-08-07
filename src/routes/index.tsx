import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Fingerprint,
  KeyRound,
  ShieldCheck,
  Users,
  Activity,
  Lock,
  Terminal,
  Sparkles,
  Check,
  Globe,
  Zap,
} from "lucide-react";

import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aegis — Authentication Infrastructure for Modern Teams" },
      {
        name: "description",
        content:
          "Drop-in authentication, sessions, roles and audit trails with a dashboard your team will actually enjoy using. Ship secure sign-in in an afternoon.",
      },
      { property: "og:title", content: "Aegis — Authentication Infrastructure" },
      {
        property: "og:description",
        content:
          "Drop-in authentication, sessions, roles and audit trails with a dashboard your team will actually enjoy using.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

/* ---------------------------------- utils --------------------------------- */

function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => entry?.isIntersecting && setInView(true),
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        inView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Counter({ to, suffix = "", decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.4);
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1400, 1);
      setValue(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return (
    <span ref={ref} className="font-display tabular-nums">
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">{title}</h2>
      {description ? (
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

/* --------------------------------- sections -------------------------------- */

function AuroraBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_50%_0%,black,transparent_72%)]" />
      <div className="aurora absolute -top-40 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-primary/25 blur-[130px]" />
      <div className="aurora absolute -top-24 right-[8%] h-[26rem] w-[26rem] rounded-full bg-violet/25 blur-[130px] [animation-delay:-6s]" />
      <div className="aurora absolute top-40 left-[6%] h-[22rem] w-[22rem] rounded-full bg-cyan/15 blur-[130px] [animation-delay:-12s]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-40 sm:pt-48">
      <AuroraBackdrop />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="animate-in-up mx-auto max-w-3xl text-center">
          <a
            href="#features"
            className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan" />
            Aegis v1 — sessions, roles & audit trails
            <ArrowRight className="h-3 w-3" />
          </a>

          <h1 className="mt-7 text-balance text-5xl font-semibold leading-[1.05] sm:text-6xl md:text-7xl">
            Authentication that feels <span className="text-gradient">engineered</span>, not bolted
            on.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Aegis gives your product a complete identity layer — sign-in, sessions, granular roles
            and a forensic audit trail — behind an interface your team will actually enjoy.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-11 bg-[image:var(--gradient-brand)] px-6 text-primary-foreground shadow-[0_16px_44px_-18px_var(--primary)] transition-all hover:opacity-95 hover:shadow-[0_20px_54px_-16px_var(--primary)]"
            >
              <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
                Start building free <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 border-border bg-card px-6">
              <a href="#developers">
                <Terminal className="mr-2 h-4 w-4" /> View the SDK
              </a>
            </Button>
          </div>

          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            No credit card · SOC2-ready controls · 5-minute integration
          </p>
        </div>

        <Reveal delay={150} className="mt-16">
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute -inset-x-10 -top-6 bottom-10 rounded-[2rem] bg-[image:var(--gradient-brand)] opacity-20 blur-3xl" />
            <div className="surface-card relative overflow-hidden rounded-2xl">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                <span className="ml-3 font-mono text-[11px] text-muted-foreground">
                  aegis.app/dashboard
                </span>
              </div>
              <div className="grid gap-px bg-border sm:grid-cols-3">
                {[
                  { label: "Active sessions", value: "12,481", trend: "+12.4%", icon: Users },
                  { label: "Sign-in success", value: "99.2%", trend: "+0.4%", icon: ShieldCheck },
                  { label: "Median auth time", value: "82ms", trend: "-18ms", icon: Zap },
                ].map((s) => (
                  <div key={s.label} className="bg-card p-6">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                      <s.icon className="h-4 w-4 text-primary" />
                    </div>
                    <p className="mt-3 font-display text-3xl font-semibold">{s.value}</p>
                    <p className="mt-1 text-xs text-success">{s.trend} vs last week</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-px bg-border md:grid-cols-[1.6fr_1fr]">
                <div className="bg-card p-6">
                  <p className="text-sm font-medium">Authentication volume</p>
                  <div className="mt-6 flex h-36 items-end gap-1.5">
                    {[38, 52, 44, 66, 58, 74, 62, 88, 71, 94, 82, 100, 76, 90].map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}%`, animationDelay: `${i * 45}ms` }}
                        className="animate-in-up flex-1 rounded-t-sm bg-[image:var(--gradient-brand)] opacity-80 transition-opacity hover:opacity-100"
                      />
                    ))}
                  </div>
                </div>
                <div className="bg-card p-6">
                  <p className="text-sm font-medium">Recent activity</p>
                  <ul className="mt-4 space-y-3.5">
                    {[
                      ["Sign-in", "san francisco, us"],
                      ["Role granted", "admin · v.reyes"],
                      ["Password changed", "berlin, de"],
                      ["Session revoked", "tokyo, jp"],
                    ].map(([a, b]) => (
                      <li key={a} className="flex items-start gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
                        <span className="text-xs">
                          <span className="block text-foreground">{a}</span>
                          <span className="text-muted-foreground">{b}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: Fingerprint,
    title: "Frictionless sign-in",
    body: "Email, password and Google in one consistent flow — with verification, recovery and remember-me handled for you.",
  },
  {
    icon: KeyRound,
    title: "Sessions you control",
    body: "Rotating refresh tokens, secure cookies and device-level revocation from a single screen.",
  },
  {
    icon: Users,
    title: "Roles & permissions",
    body: "Role assignments live in their own table, enforced in the database — never in the browser.",
  },
  {
    icon: Activity,
    title: "Forensic audit trail",
    body: "Every security-relevant action is captured with device, agent and timestamp for compliance reviews.",
  },
  {
    icon: Lock,
    title: "Defense in depth",
    body: "Row-level security, leaked-password checks and per-request validation on every endpoint.",
  },
  {
    icon: Globe,
    title: "Edge-native",
    body: "Auth runs at the edge, close to your users, with a median verification time under 90 milliseconds.",
  },
];

function Features() {
  return (
    <section id="features" className="relative border-t border-border py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Platform"
          title="Everything identity, nothing extra"
          description="A complete authentication surface designed as one product — not six libraries stitched together."
        />
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <div className="group relative h-full bg-card p-7 transition-colors duration-300 hover:bg-accent/40">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_12%,transparent)]">
                  <f.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="mt-5 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: "Connect your app",
      body: "Install the SDK and point it at your Aegis project. One environment variable, zero backend code.",
    },
    {
      title: "Model your access",
      body: "Define roles and permissions, then let database policies enforce them on every single request.",
    },
    {
      title: "Ship and observe",
      body: "Watch sessions, sign-in health and audit events stream into the dashboard in real time.",
    },
  ];
  return (
    <section id="how" className="relative border-t border-border py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="How it works"
          title="Production auth in three moves"
          description="Most teams are live before lunch."
        />
        <div className="relative mt-16 grid gap-10 md:grid-cols-3">
          <div className="absolute inset-x-12 top-6 hidden h-px bg-gradient-to-r from-transparent via-border-strong to-transparent md:block" />
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 120} className="relative">
              <div className="flex flex-col items-start">
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-card font-display text-lg font-semibold text-gradient">
                  0{i + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const CODE = `import { aegis } from "@aegis/sdk";

const { session } = await aegis.auth.signIn({
  email,
  password,
  remember: true,
});

// roles are resolved server-side, never trusted from the client
if (await aegis.access.can(session, "billing:write")) {
  await billing.updatePlan(plan);
}`;

function Developers() {
  return (
    <section id="developers" className="relative border-t border-border py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-2">
        <Reveal>
          <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">
            Developers
          </span>
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
            An SDK that reads like the thing you meant to write
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Fully typed, framework-agnostic and edge-ready. Strict TypeScript end to end, with
            server helpers that keep secrets on the server where they belong.
          </p>
          <ul className="mt-8 space-y-3.5">
            {[
              "Typed clients for TypeScript, Go, Python and Rust",
              "Server-side session verification with zero round trips",
              "Webhooks for every authentication lifecycle event",
              "Local emulator so tests never hit the network",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/10">
                  <Check className="h-3 w-3 text-primary" />
                </span>
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={120}>
          <div className="surface-card overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="font-mono text-[11px] text-muted-foreground">auth.ts</span>
              <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">
                TypeScript
              </Badge>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-muted-foreground">
              <code>{CODE}</code>
            </pre>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="relative border-t border-border py-20">
      <div className="mx-auto grid max-w-6xl gap-px overflow-hidden rounded-2xl border border-border bg-border px-0 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Auth requests / month", node: <Counter to={4.2} suffix="B" decimals={1} /> },
          { label: "Uptime last 12 months", node: <Counter to={99.99} suffix="%" decimals={2} /> },
          { label: "Median verify latency", node: <Counter to={82} suffix="ms" /> },
          { label: "Teams building on Aegis", node: <Counter to={7400} suffix="+" /> },
        ].map((s) => (
          <div key={s.label} className="bg-card p-8 text-center">
            <p className="text-3xl font-semibold text-gradient sm:text-4xl">{s.node}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: "Developer",
      price: "$0",
      note: "forever",
      desc: "Everything you need to launch.",
      features: ["5,000 monthly actives", "Email & Google sign-in", "Roles & permissions", "7-day audit history"],
      cta: "Start free",
      highlight: false,
    },
    {
      name: "Scale",
      price: "$79",
      note: "/ month",
      desc: "For products with real traction.",
      features: [
        "50,000 monthly actives",
        "Session & device management",
        "1-year audit retention",
        "Webhooks & custom claims",
        "Priority support",
      ],
      cta: "Start 14-day trial",
      highlight: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      note: "",
      desc: "Compliance, scale and control.",
      features: ["Unlimited actives", "SAML SSO & SCIM", "Data residency", "99.99% SLA", "Dedicated engineer"],
      cta: "Talk to sales",
      highlight: false,
    },
  ];

  return (
    <section id="pricing" className="relative border-t border-border py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Pricing"
          title="Priced for builders, ready for boards"
          description="Start free and stay free until your product proves itself."
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((p, i) => (
            <Reveal key={p.name} delay={i * 90}>
              <div
                className={cn(
                  "hover-lift relative flex h-full flex-col rounded-2xl p-7",
                  p.highlight
                    ? "border border-primary/40 bg-card shadow-[0_30px_80px_-40px_var(--primary)]"
                    : "surface-card",
                )}
              >
                {p.highlight ? (
                  <span className="absolute -top-3 left-7 rounded-full bg-[image:var(--gradient-brand)] px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-primary-foreground">
                    Most popular
                  </span>
                ) : null}
                <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-semibold">{p.price}</span>
                  <span className="text-sm text-muted-foreground">{p.note}</span>
                </div>
                <ul className="mt-7 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={cn(
                    "mt-8 w-full",
                    p.highlight
                      ? "bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90"
                      : "border border-border bg-surface text-foreground hover:bg-accent",
                  )}
                >
                  <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
                    {p.cta}
                  </Link>
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const quotes = [
    {
      quote:
        "We deleted four internal services the week we moved to Aegis. The audit trail alone paid for it.",
      name: "Vera Reyes",
      role: "Head of Platform, Northwind",
    },
    {
      quote:
        "The dashboard is the first security tool our support team asks for instead of avoiding.",
      name: "Idris Kwon",
      role: "CTO, Lumen Labs",
    },
    {
      quote: "Integration took an afternoon. Our SOC2 auditor finished a week early.",
      name: "Marta Halvorsen",
      role: "Engineering Lead, Ordinal",
    },
  ];
  return (
    <section id="testimonials" className="relative border-t border-border py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Customers" title="Teams that stopped maintaining auth" />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {quotes.map((q, i) => (
            <Reveal key={q.name} delay={i * 90}>
              <figure className="hover-lift surface-card flex h-full flex-col justify-between rounded-2xl p-7">
                <blockquote className="text-[15px] leading-relaxed text-foreground/90">
                  “{q.quote}”
                </blockquote>
                <figcaption className="mt-7 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[image:var(--gradient-aurora)] font-display text-xs font-semibold text-background">
                    {q.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                  <span className="text-xs">
                    <span className="block font-medium text-foreground">{q.name}</span>
                    <span className="text-muted-foreground">{q.role}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const items = [
    {
      q: "How long does integration actually take?",
      a: "Most teams have sign-in, sign-up and protected routes working in under an hour. Roles and audit logging are configuration, not code.",
    },
    {
      q: "Where is my user data stored?",
      a: "In your own managed Postgres database with row-level security enabled on every table. You own the data and can export it at any time.",
    },
    {
      q: "Do you support social sign-in?",
      a: "Google sign-in is available out of the box with managed credentials, and you can swap in your own OAuth client for custom branding.",
    },
    {
      q: "What happens to sessions when someone leaves?",
      a: "Revoke the account and every active session is invalidated immediately. The revocation is written to the audit trail with actor and timestamp.",
    },
    {
      q: "Is there a free tier?",
      a: "Yes. The Developer plan is free forever up to 5,000 monthly active users, with no credit card required.",
    },
  ];
  return (
    <section id="faq" className="relative border-t border-border py-24">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" />
        <Accordion type="single" collapsible className="mt-12 w-full">
          {items.map((item, i) => (
            <AccordionItem key={item.q} value={`item-${i}`} className="border-border">
              <AccordionTrigger className="text-left text-[15px] hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative border-t border-border py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-8 py-16 text-center sm:px-16">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="aurora absolute -bottom-32 left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]" />
            <div className="absolute inset-0 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_at_50%_120%,black,transparent_70%)]" />
          </div>
          <div className="relative">
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Give authentication the <span className="text-gradient">craft</span> it deserves
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] text-muted-foreground">
              Create your workspace and protect your first route in the next five minutes.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="h-11 bg-[image:var(--gradient-brand)] px-6 text-primary-foreground hover:opacity-95"
              >
                <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
                  Create free account <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 border-border bg-card px-6">
                <Link to="/auth" search={{ mode: "signin", redirect: undefined }}>
                  Sign in
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Developers />
        <Stats />
        <Pricing />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
