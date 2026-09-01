import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Leaf, Droplets, Sun, Bug, Cpu, Sparkles, Users, Store } from "lucide-react";
import { VisitorWeatherChip } from "@/components/weather-chip";
import { BetaBadge, BetaBanner } from "@/components/beta-banner";

const CANONICAL = "https://verdant-nl.app/";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Verdant (Beta) — Europe's network of connected plant lovers" },
      { name: "description", content: "Join the Verdant beta. Track your plants with AI care advice, connect with fellow plant lovers, and trade plants in a community-powered marketplace." },
      { property: "og:title", content: "Verdant (Beta) — Europe's network of connected plant lovers" },
      { property: "og:description", content: "Join the Verdant beta. Track your plants with AI care advice, connect with fellow plant lovers, and trade plants in a community-powered marketplace." },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/da919765-0158-4e54-ae2e-6664086f85cd" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Verdant (Beta) — Europe's network of connected plant lovers" },
      { name: "twitter:description", content: "Join the Verdant beta. Track your plants with AI care advice, connect with fellow plant lovers, and trade plants in a community-powered marketplace." },
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
            <Leaf className="w-5 h-5 text-primary" /> Verdant <BetaBadge />
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
            Verdant blends AI plant care with a community of plant lovers.
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
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-background border border-border p-10 aspect-square flex items-center justify-center">
          <Leaf className="w-40 h-40 text-primary/40" strokeWidth={1} />
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-16 grid md:grid-cols-3 gap-6">
        {[
          { icon: Sparkles, title: "AI care advisor", body: "Get watering predictions, disease warnings, and a friendly summary a few times per week based on your plants and local weather." },
          { icon: Users, title: "Plant community", body: "Follow friends, celebrate new growth, comment on photos and message fellow plant lovers." },
          { icon: Store, title: "Trusted marketplace", body: "Buy, sell and trade plants with transparent history. Verdant charges a small commission on completed sales." },
          { icon: Cpu, title: "Optional sensors", body: "Plug in an Arduino or Raspberry Pi to log soil moisture, humidity, light and motion events automatically." },
          { icon: Droplets, title: "Track everything", body: "Soil moisture, humidity, temperature, light and pest activity — all timestamped in one place." },
          { icon: Sun, title: "Ideal conditions", body: "Every plant is matched against a growing catalogue of care profiles for indoor and outdoor life." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border border-border bg-card p-6">
            <Icon className="w-6 h-6 text-primary" />
            <h2 className="mt-3 font-display font-semibold text-lg">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground flex flex-col sm:flex-row gap-4 justify-between">
          <span>© 2026 Verdant <BetaBadge /></span>
          <div className="flex flex-wrap gap-4">
            <Link to="/about" className="hover:text-foreground">About</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
            <Link to="/subprocessors" className="hover:text-foreground">Subprocessors</Link>
            <Link to="/get-started" className="hover:text-foreground">Get started</Link>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
