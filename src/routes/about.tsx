import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Users, Sprout, Sparkles, Store, ArrowRight, Camera } from "lucide-react";
import { SimpleHeader, SimpleFooter } from "@/components/simple-layout";
import { BetaBadge } from "@/components/beta-banner";

const CANONICAL = "https://sentia-plants.com/about";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About Us, Sentia (Beta)" },
      { name: "description", content: "Sentia's vision is to create Europe's most vibrant network of connected plant lovers, blending AI and community to turn every home into a thriving green sanctuary." },
      { property: "og:title", content: "About Us, Sentia (Beta)" },
      { property: "og:description", content: "Sentia's vision is to create Europe's most vibrant network of connected plant lovers, blending AI and community to turn every home into a thriving green sanctuary." },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "About Us, Sentia (Beta)" },
      { name: "twitter:description", content: "Sentia's vision is to create Europe's most vibrant network of connected plant lovers, blending AI and community to turn every home into a thriving green sanctuary." },
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
        <h1 className="font-display text-4xl font-semibold">About Sentia</h1>
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
              "Our Mission is to integrate nature into modern living by providing a balanced
              ecosystem of AI and community. Sentia combines an intelligent digital assistant and
              embedded physical sensors with a vibrant social marketplace, empowering plant owners to
              chat, trade, and expertly nurture their living companions together."
            </blockquote>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold">Why Sentia?</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Plants make homes healthier and happier, but keeping them alive can feel like guesswork.
              Sentia brings together three things we believe every plant owner deserves:
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
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Sentia follows a simple rhythm: bring your plants in, care for them day by day, lean on
              the tools when you need them, and grow alongside people who love plants as much as you do.
            </p>
            <div className="mt-6 space-y-5">
              <Step icon={Sprout} title="Add your plants" body="Search our growing catalogue, give each plant a nickname and note whether it lives indoors or outdoors." />
              <Step icon={Camera} title="Keep a diary for each plant" body="Journal your plants with photos and notes, log watering, feeding, pruning and repotting, and keep a living record of how each one grows. It is how you stay close to them." />
              <Step icon={Sparkles} title="Reach for the tools when you need them" body="Ask the AI care advisor for guidance on water, light and pests, and connect Arduino or Raspberry Pi sensors to log soil moisture, humidity, light and motion automatically." />
              <Step icon={Users} title="Engage with the community" body="Add friends, ask for help when something looks off, post your pictures and interact with other growers who have been there." />
              <Step
                icon={Store}
                tag="Coming soon"
                title="Trade with trusted plant owners"
                body="A marketplace of trusted caretakers to swap cuttings, trade plants and buy offspring raised by growers you can rely on."
              />
            </div>
          </section>

          <section className="rounded-2xl border border-dashed border-border p-6">
            <h2 className="font-display text-xl font-semibold">From the founder</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Sentia grew from Marco's lifelong connection with nature and his belief that technology
              should help people live closer to it, not pull them away.
            </p>
            <Link
              to="/founder"
              className="mt-4 inline-flex items-center gap-2 font-medium text-primary hover:opacity-80"
            >
              Read Marco's story <ArrowRight className="w-4 h-4" />
            </Link>
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

function Step({ icon: Icon, title, body, tag }: { icon: React.ElementType; title: string; body: string; tag?: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display font-semibold">{title}</h3>
          {tag ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {tag}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
