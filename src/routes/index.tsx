import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Leaf, Sparkles, Users, Store, Camera } from "lucide-react";
import { VisitorWeatherChip } from "@/components/weather-chip";
import { BetaBadge, BetaBanner } from "@/components/beta-banner";
import { HomepageFeatureShowcase } from "@/components/homepage-feature-showcase";
import { NewsletterCta, NewsletterCtaLink } from "@/components/newsletter-cta";

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
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold">How it works</h2>

            <p className="mt-3 text-muted-foreground leading-relaxed">
              Bring your plants in, care for them day by day, use the tools when you need them, and
              grow alongside people who love plants as much as you do.
            </p>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <JourneyStep
              number={1}
              icon={Leaf}
              title="Add your plants"
              body="Search our growing catalogue, give each plant a nickname and note whether it lives indoors or outdoors."
            />
            <JourneyStep
              number={2}
              icon={Camera}
              title="Keep a diary for each plant"
              body="Journal your plants with photos and notes, log watering, feeding, pruning and repotting, and keep a living record of how each one grows. It is how you stay close to them."
            />
            <JourneyStep
              number={3}
              icon={Sparkles}
              title="Reach for the tools when you need them"
              body="Ask the AI care advisor for guidance on water, light and pests, and connect sensors in the future to follow your plants more closely."
            />
            <JourneyStep
              number={4}
              icon={Users}
              title="Engage with the community"
              body="Add friends, ask for help when something looks off, post your pictures and interact with other growers who have been there."
            />
            <JourneyStep
              number={5}
              icon={Store}
              tag="Coming soon"
              title="Trade with trusted plant owners"
              body="Swap cuttings, trade plants and buy offspring raised by caretakers you can trust."
            />
          </div>
        </div>
      </section>


      <section className="mx-auto max-w-6xl px-4 pb-16">
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

function JourneyStep({
  number,
  icon: Icon,
  title,
  body,
  tag,
}: {
  number: number;
  icon: React.ElementType;
  title: string;
  body: string;
  tag?: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-semibold">
        {number}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="font-display font-semibold">{title}</h3>
          {tag ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {tag}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
