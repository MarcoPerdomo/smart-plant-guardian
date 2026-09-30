import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Leaf, Sparkles, Users, Store, Camera } from "lucide-react";
import { VisitorWeatherChip } from "@/components/weather-chip";
import { BetaBadge, BetaBanner } from "@/components/beta-banner";
import { HomepageFeatureShowcase } from "@/components/homepage-feature-showcase";
import { NewsletterCta, NewsletterCtaLink } from "@/components/newsletter-cta";
import { Reveal } from "@/components/reveal";

const CANONICAL = "https://sentia-plants.com/";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Sentia (Beta), Europe's network of connected plant lovers" },
      { name: "description", content: "Join the Sentia beta. Track your plants with AI care advice, connect with fellow plant lovers, and trade plants in a community-powered marketplace." },
      { property: "og:title", content: "Sentia (Beta), Europe's network of connected plant lovers" },
      { property: "og:description", content: "Join the Sentia beta. Track your plants with AI care advice, connect with fellow plant lovers, and trade plants in a community-powered marketplace." },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/da919765-0158-4e54-ae2e-6664086f85cd" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sentia (Beta), Europe's network of connected plant lovers" },
      { name: "twitter:description", content: "Join the Sentia beta. Track your plants with AI care advice, connect with fellow plant lovers, and trade plants in a community-powered marketplace." },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/da919765-0158-4e54-ae2e-6664086f85cd" },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
});

function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  if (checking) return <div className="min-h-screen" />;

  return (
    <div className="min-h-screen bg-background">
      <BetaBanner />
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-lg font-semibold">
            <Leaf className="w-5 h-5 text-primary" /> Sentia <BetaBadge />
          </div>
          <div className="flex items-center gap-3">
            <Link to="/about" className="hidden sm:inline-flex text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted">
              About us
            </Link>
            <Link to="/get-started" className="hidden sm:inline-flex text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted">
              Get started
            </Link>
            <Link to="/auth" className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="font-display text-5xl md:text-6xl font-semibold leading-tight text-foreground">
            Turn every home<br/>into a green sanctuary.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-lg">
            Sentia blends AI plant care with a community of plant lovers.
            Track your indoor jungle, get weekly care summaries, and trade plants
            with friends across Europe.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-primary font-medium">
            <BetaBadge /> Now open for beta testers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" className="px-5 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90">
              Start growing
            </Link>
            <Link to="/about" className="px-5 py-3 rounded-lg border border-border font-medium hover:bg-muted">
              About us
            </Link>
          </div>
          <div className="mt-6">
            <VisitorWeatherChip />
          </div>
        </div>
        <HomepageFeatureShowcase />
      </section>

      <section id="how" className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-24">
                <span className="inline-block rounded-sm border border-primary/20 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                  The Sentia journey
                </span>
                <h2 className="mt-8 font-display text-5xl font-semibold leading-[1.05] text-foreground md:text-6xl">
                  How it <span className="italic text-primary">works</span>
                </h2>
                <p className="mt-6 max-w-sm text-lg leading-relaxed text-muted-foreground">
                  Bring your plants in, care for them day by day, use the tools when you need them, and
                  grow alongside people who love plants as much as you do.
                </p>
                <div className="mt-12 hidden lg:block">
                  <div className="h-px w-12 bg-border" />
                  <p className="mt-4 font-mono text-xs uppercase tracking-widest text-muted-foreground/70">
                    Five steps
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:col-span-8">
              {JOURNEY.map((step, index) => (
                <Reveal key={step.title} delay={index * 90} className="h-full">
                  <JourneyCard step={step} />
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={150}>
            <div className="relative mt-6 overflow-hidden rounded-3xl border border-border bg-surface-inverse p-8 md:p-12">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_55%)]" />
              <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                <div className="max-w-xl">
                  <span className="inline-block rounded-sm border border-accent/40 bg-accent/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-accent">
                    {MARKETPLACE.tag}
                  </span>
                  <h3 className="mt-5 font-display text-3xl font-semibold leading-tight text-surface-inverse-foreground md:text-4xl">
                    {MARKETPLACE.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-surface-inverse-foreground/70">
                    {MARKETPLACE.before}
                    <span className="font-medium text-surface-inverse-foreground">{MARKETPLACE.highlight}</span>
                    {MARKETPLACE.after}
                  </p>
                </div>
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-dashed border-surface-inverse-foreground/25 text-surface-inverse-foreground/45">
                  <MARKETPLACE.icon className="h-10 w-10" />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>


      <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 md:pt-24">
        <NewsletterCta />
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground flex flex-col sm:flex-row gap-4 justify-between">
          <span>© 2026 Sentia <BetaBadge /></span>
          <div className="flex flex-wrap gap-4">
            <Link to="/about" className="hover:text-foreground">About</Link>
            <Link to="/founder" className="hover:text-foreground">Founder story</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
            <Link to="/subprocessors" className="hover:text-foreground">Subprocessors</Link>
            <Link to="/get-started" className="hover:text-foreground">Get started</Link>
            <NewsletterCtaLink className="hover:text-foreground" />
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

type CareStep = {
  number: string;
  icon: LucideIcon;
  title: string;
  before: string;
  highlight: string;
  after: string;
};

const JOURNEY: CareStep[] = [
  {
    number: "01",
    icon: Leaf,
    title: "Add your plants",
    before: "Search our growing catalogue, ",
    highlight: "give each plant a nickname",
    after: " and note whether it lives indoors or outdoors.",
  },
  {
    number: "02",
    icon: Camera,
    title: "Keep a diary for each plant",
    before:
      "Journal your plants with photos and notes, log watering, feeding, pruning and repotting, and keep a living record of how each one grows. It is how you ",
    highlight: "stay close to them",
    after: ".",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Reach for the tools when you need them",
    before: "Ask the ",
    highlight: "AI care advisor",
    after:
      " for guidance on water, light and pests, and connect sensors in the future to follow your plants more closely.",
  },
  {
    number: "04",
    icon: Users,
    title: "Engage with the community",
    before:
      "Add friends, ask for help when something looks off, post your pictures and interact with ",
    highlight: "other growers who have been there",
    after: ".",
  },
];

const MARKETPLACE: CareStep & { tag: string } = {
  number: "05",
  icon: Store,
  tag: "Coming soon",
  title: "Trade with trusted plant owners",
  before: "Swap cuttings, trade plants and buy ",
  highlight: "offspring raised by caretakers you can trust",
  after: ".",
};

function JourneyCard({ step }: { step: CareStep }) {
  const Icon = step.icon;
  return (
    <article className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10">
      <span className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-primary/70 transition-transform duration-300 group-hover:scale-x-100" />
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-primary">[ {step.number} ]</span>
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <h3 className="mt-6 font-display text-2xl font-semibold leading-snug text-foreground">
        {step.title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {step.before}
        <span className="font-medium text-foreground">{step.highlight}</span>
        {step.after}
      </p>
    </article>
  );
}
