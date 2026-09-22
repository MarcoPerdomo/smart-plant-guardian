import { createFileRoute, Link } from "@tanstack/react-router";
import { Store, Sprout } from "lucide-react";

export const Route = createFileRoute("/_authenticated/marketplace/coming-soon")({
  component: MarketplaceComingSoon,
  head: () => ({
    meta: [
      { title: "Marketplace coming soon — Verdant" },
      {
        name: "description",
        content:
          "The Verdant marketplace for buying, selling and trading plants with fellow growers is still being built.",
      },
      { property: "og:title", content: "Marketplace coming soon — Verdant" },
      {
        property: "og:description",
        content: "Sign up for the Verdant newsletter to hear when the plant marketplace opens.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function MarketplaceComingSoon() {
  return (
    <div className="mx-auto max-w-xl py-10 text-center space-y-5">
      <span className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Store className="w-7 h-7 text-primary" />
      </span>
      <h1 className="font-display text-2xl font-semibold">The Marketplace is still growing</h1>
      <p className="text-muted-foreground">
        We're building a safe place to buy, sell and trade plants with other Verdant members —
        with honest condition histories, regional pickup and shipping, and protected payments.
        It isn't open yet.
      </p>
      <p className="text-muted-foreground">
        Want to know the moment it launches? Join the Verdant newsletter and we'll email you.
      </p>
      <div className="flex flex-wrap gap-3 justify-center pt-2">
        <Link
          to="/settings"
          hash="newsletter"
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          Sign up for the newsletter
        </Link>
        <Link
          to="/dashboard"
          className="px-4 py-2 rounded-md border border-border text-sm flex items-center gap-2"
        >
          <Sprout className="w-4 h-4" /> Back to my plants
        </Link>
      </div>
    </div>
  );
}
