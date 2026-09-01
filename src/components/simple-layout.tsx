import { Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import { BetaBadge } from "@/components/beta-banner";

export function SimpleHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <Leaf className="w-5 h-5 text-primary" />
          <span className="text-primary">Verdant</span>
          <BetaBadge />
        </Link>
        <Link
          to="/auth"
          className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}

export function SimpleFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground flex flex-wrap gap-4 justify-between">
        <span>© 2026 Verdant (Beta)</span>
        <div className="flex flex-wrap gap-4">
          <Link to="/about" className="hover:text-foreground">About</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
          <Link to="/subprocessors" className="hover:text-foreground">Subprocessors</Link>
        </div>
      </div>
    </footer>
  );
}
