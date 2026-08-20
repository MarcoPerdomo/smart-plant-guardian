import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf, Cpu, Droplets, Sun, Wifi, Camera, ArrowRight } from "lucide-react";
import { BetaBadge } from "@/components/beta-banner";

export const Route = createFileRoute("/get-started")({
  component: GetStartedPage,
  head: () => ({
    meta: [
      { title: "Get Started — Verdant (Beta)" },
      { name: "description", content: "Set up your Verdant beta account, connect sensors and start tracking your houseplants." },
      { property: "og:title", content: "Get Started — Verdant (Beta)" },
      { property: "og:description", content: "Set up your Verdant beta account, connect sensors and start tracking your houseplants." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://leaf-buddy-system.lovable.app/get-started" }],
  }),
});

function GetStartedPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <Leaf className="w-5 h-5 text-primary" /> Verdant <BetaBadge />
          </Link>
          <Link to="/auth" className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-semibold">Get started with Verdant</h1>
        <p className="mt-2 text-muted-foreground">
          A quick guide for beta testers: set up your account, add a plant, and start logging data.
        </p>

        <div className="mt-8 space-y-6">
          <Step number={1} title="Create your account" icon={Wifi}>
            <p className="text-sm text-muted-foreground">
              <Link to="/auth" className="underline hover:text-foreground">Sign up</Link> with email or Google.
              Pick a username, add your country/city and timezone so weather alerts match your local conditions.
            </p>
          </Step>

          <Step number={2} title="Add your first plant" icon={Leaf}>
            <p className="text-sm text-muted-foreground">
              Go to <strong>Add Plant</strong>, search for your species and give it a nickname. This is the plant
              that will receive sensor readings and watering reminders.
            </p>
          </Step>

          <Step number={3} title="Connect sensors" icon={Cpu}>
            <p className="text-sm text-muted-foreground">
              If you have an Arduino or Raspberry Pi, copy the ingestion URL and secret from Settings and point your
              device at it. Supported readings include soil moisture, temperature, humidity, light and motion events.
            </p>
          </Step>

          <Step number={4} title="Log watering & photos" icon={Droplets}>
            <p className="text-sm text-muted-foreground">
              Tap "Water" on a plant card when you water it. Use the photo journal to track growth over time.
              Both actions also appear in your social feed.
            </p>
          </Step>

          <Step number={5} title="Check the weather" icon={Sun}>
            <p className="text-sm text-muted-foreground">
              Verdant fetches local weather and warns you when a plant may need extra water, shade or pest checks.
            </p>
          </Step>

          <Step number={6} title="Camera snapshots (Raspberry Pi)" icon={Camera}>
            <p className="text-sm text-muted-foreground">
              Raspberry Pi agents can upload camera snapshots to the snapshot endpoint. These appear on the plant
              detail page and help you spot changes over time.
            </p>
          </Step>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/auth" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90">
            Create your account <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-border font-medium hover:bg-muted">
            Back to home
          </Link>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground flex flex-wrap gap-4 justify-between">
          <span>© 2026 Verdant <BetaBadge /></span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({ number, title, icon: Icon, children }: { number: number; title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-semibold">
        {number}
      </div>
      <div className="flex-1">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" /> {title}
        </h2>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}
