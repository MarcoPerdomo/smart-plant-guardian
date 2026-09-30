import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf, BookOpen, Sparkles, Users, HandHeart, Store, Wifi, ArrowRight } from "lucide-react";
import { BetaBadge } from "@/components/beta-banner";
import { NewsletterCta, NewsletterCtaLink } from "@/components/newsletter-cta";

const CANONICAL = "https://sentia-plants.com/get-started";

export const Route = createFileRoute("/get-started")({
  component: GetStartedPage,
  head: () => ({
    meta: [
      { title: "Get Started, Sentia (Beta)" },
      { name: "description", content: "Follow Sentia's practical guide to add and journal your plants, use care tools, connect with the community and help other plant lovers." },
      { property: "og:title", content: "Get Started, Sentia (Beta)" },
      { property: "og:description", content: "Follow Sentia's practical guide to add and journal your plants, use care tools, connect with the community and help other plant lovers." },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Get Started, Sentia (Beta)" },
      { name: "twitter:description", content: "Follow Sentia's practical guide to add and journal your plants, use care tools, connect with the community and help other plant lovers." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
});

function GetStartedPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <Leaf className="w-5 h-5 text-primary" /> Sentia <BetaBadge />
          </Link>
          <Link to="/auth" className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-semibold">Get started with Sentia</h1>
        <p className="mt-2 text-muted-foreground">
          Follow these steps to care for your plants, use Sentia's tools and grow with the community.
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

          <Step number={3} title="Journal your plants" icon={BookOpen}>
            <p className="text-sm text-muted-foreground">
              Record watering, fertilising, pruning, repotting and flowering. Add photos and notes to
              keep a meaningful history of each plant's health and growth.
            </p>
          </Step>

          <Step number={4} title="Use Sentia's tools when you need help" icon={Sparkles}>
            <p className="text-sm text-muted-foreground">
              Check local weather guidance, ask the AI care advisor, or use your camera for help identifying
              signs of disease when something does not look right.
            </p>
          </Step>

          <Step number={5} title="Engage with the community" icon={Users}>
            <p className="text-sm text-muted-foreground">
              Post your plants' progress, share journal activity, comment on other growers' updates, add
              friends and chat with them.
            </p>
          </Step>

          <Step number={6} title="Help the community" icon={HandHeart}>
            <p className="text-sm text-muted-foreground">
              Ask for help by adding clear pictures, and share your own tips and experience with others.
              Collective knowledge helps us understand and care for plants as living beings.
            </p>
          </Step>

          <Step number={7} title="Marketplace" icon={Store} tag="Coming soon">
            <p className="text-sm text-muted-foreground">
              Buy, sell and swap plants, cuttings and offspring with trusted caretakers in the Sentia community.
            </p>
          </Step>
        </div>

        <div className="mt-8">
          <NewsletterCta />
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
          <span>© 2026 Sentia <BetaBadge /></span>
          <div className="flex gap-4">
            <Link to="/about" className="hover:text-foreground">About</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
            <NewsletterCtaLink className="hover:text-foreground" />
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({ number, title, icon: Icon, children, tag }: { number: number; title: string; icon: React.ElementType; children: React.ReactNode; tag?: string }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-semibold">
        {number}
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" /> {title}
          </h2>
          {tag ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {tag}
            </span>
          ) : null}
        </div>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}
