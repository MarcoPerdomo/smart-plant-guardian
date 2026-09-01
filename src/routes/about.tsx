import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Users, Sprout, Cpu, Sparkles, Store, ArrowRight } from "lucide-react";
import { SimpleHeader, SimpleFooter } from "@/components/simple-layout";
import { BetaBadge } from "@/components/beta-banner";

const CANONICAL = "https://verdant-nl.app/about";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About Us — Verdant (Beta)" },
      { name: "description", content: "Verdant's vision is to create Europe's most vibrant network of connected plant lovers, blending AI and community to turn every home into a thriving green sanctuary." },
      { property: "og:title", content: "About Us — Verdant (Beta)" },
      { property: "og:description", content: "Verdant's vision is to create Europe's most vibrant network of connected plant lovers, blending AI and community to turn every home into a thriving green sanctuary." },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "About Us — Verdant (Beta)" },
      { name: "twitter:description", content: "Verdant's vision is to create Europe's most vibrant network of connected plant lovers, blending AI and community to turn every home into a thriving green sanctuary." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SimpleHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex items-center gap-2 text-sm font-medium text-primary mb-4">
          <BetaBadge /> Now in beta
        </div>
        <h1 className="font-display text-4xl font-semibold">About Verdant</h1>
        <p className="mt-2 text-muted-foreground">
          We're building a place where plants and people grow together.
        </p>

        <div className="mt-10 space-y-10">
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-primary mb-3">
              <Heart className="w-5 h-5" />
              <h2 className="font-display text-xl font-semibold">Our Vision</h2>
            </div>
            <blockquote className="text-lg leading-relaxed text-foreground">
              "To create Europe's most vibrant network of connected plant lovers, seamlessly blending
              modern AI technology and human connection to turn every home into a thriving,
              intelligent green sanctuary."
            </blockquote>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-primary mb-3">
              <Sprout className="w-5 h-5" />
              <h2 className="font-display text-xl font-semibold">Our Mission</h2>
            </div>
            <blockquote className="text-lg leading-relaxed text-foreground">
              "Our Mission is to seamlessly integrate nature into modern living by providing a balanced
              ecosystem of AI and community. Verdant combines an intelligent digital assistant and
              embedded physical sensors with a vibrant social marketplace, empowering plant owners to
              chat, trade, and expertly nurture their living companions together."
            </blockquote>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold">Why Verdant?</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Plants make homes healthier and happier, but keeping them alive can feel like guesswork.
              Verdant brings together three things we believe every plant owner deserves:
            </p>
            <div className="mt-6 grid sm:grid-cols-3 gap-4">
              <ReasonCard
                icon={Sparkles}
                title="AI care guidance"
                body="Personalised watering predictions, disease warnings and friendly care summaries based on your plants and local weather."
              />
              <ReasonCard
                icon={Users}
                title="A plant-loving community"
                body="Connect with fellow growers, share updates, celebrate new leaves and learn from each other's experience."
              />
              <ReasonCard
                icon={Store}
                title="A trusted marketplace"
                body="Buy, sell and trade plants with people who care, with transparent history and a fair commission."
              />
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold">How it works today</h2>
            <div className="mt-4 space-y-4">
              <Step icon={Sprout} title="Add your plants" body="Search our growing catalogue, give each plant a nickname and note whether it lives indoors or outdoors." />
              <Step icon={Sparkles} title="Get AI-powered advice" body="Verdant reads your local weather and your plant's care profile to suggest water, shade and pest checks." />
              <Step icon={Cpu} title="Optional sensors" body="Connect Arduino or Raspberry Pi sensors to log soil moisture, humidity, light and motion events automatically." />
              <Step icon={Users} title="Share and trade" body="Post updates for friends, list plants on the marketplace and message other growers." />
            </div>
          </section>

          <section className="rounded-2xl border border-dashed border-border p-6">
            <h2 className="font-display text-xl font-semibold">From the founder</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Verdant started from a simple belief: technology should help us stay closer to nature,
              not pull us away. More of the founder story — how this idea grew from a single plant on a
              windowsill into a community — is coming soon.
            </p>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90"
            >
              Join the beta <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-border font-medium hover:bg-muted"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
      <SimpleFooter />
    </div>
  );
}

function ReasonCard({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <Icon className="w-6 h-6 text-primary" />
      <h3 className="mt-3 font-display font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Step({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="font-display font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
