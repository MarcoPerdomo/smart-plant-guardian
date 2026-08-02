import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Leaf, Droplets, Sun, Bug, Cpu, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Verdant — Smart houseplant care with Arduino sensors" },
      { name: "description", content: "Plug in Arduino sensors, track soil moisture, humidity, light and pests, and get AI care summaries for every plant." },
      { property: "og:title", content: "Verdant — Smart houseplant care with Arduino sensors" },
      { property: "og:description", content: "Plug in Arduino sensors, track soil moisture, humidity, light and pests, and get AI care summaries for every plant." },
    ],
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
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-lg font-semibold">
            <Leaf className="w-5 h-5 text-primary" /> Verdant
          </div>
          <Link to="/auth" className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground">
            Sign in
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="font-display text-5xl md:text-6xl font-semibold leading-tight text-foreground">
            Give your plants<br/>a voice.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-lg">
            Plug in an Arduino with moisture, humidity, light, and radar sensors.
            Verdant tracks every plant's health, predicts the next watering,
            and sends you an AI-written care summary a few times a week.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/auth" className="px-5 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90">
              Start growing
            </Link>
            <a href="#how" className="px-5 py-3 rounded-lg border border-border font-medium hover:bg-muted">
              How it works
            </a>
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-background border border-border p-10 aspect-square flex items-center justify-center">
          <Leaf className="w-40 h-40 text-primary/40" strokeWidth={1} />
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-16 grid md:grid-cols-3 gap-6">
        {[
          { icon: Cpu, title: "Plug in your Arduino", body: "Point your device at our secure ingestion endpoint. Every reading lands in your dashboard." },
          { icon: Droplets, title: "Track everything", body: "Soil moisture, humidity, temperature, light, and radar-based pest activity — all timestamped." },
          { icon: Sparkles, title: "AI care advisor", body: "Get watering predictions, disease warnings, and a friendly summary a few times per week." },
          { icon: Sun, title: "Ideal conditions", body: "Every plant in your dashboard is matched against a growing catalog of care profiles." },
          { icon: Bug, title: "Pest detection", body: "Radar motion events at odd hours flag potential pest activity before you spot damage." },
          { icon: Leaf, title: "Any houseplant", body: "Curated care profiles for the classics; AI fills in the rest on demand." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border border-border bg-card p-6">
            <Icon className="w-6 h-6 text-primary" />
            <h3 className="mt-3 font-display font-semibold text-lg">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground flex justify-between">
          <span>Verdant</span>
          <Link to="/auth" className="hover:text-foreground">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
