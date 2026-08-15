import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { amIAdmin } from "@/lib/admin.functions";
import { Leaf, LayoutDashboard, Settings, LogOut, Plus, Shield } from "lucide-react";
import { WeatherChip } from "@/components/weather-chip";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const { data: admin } = useQuery({ queryKey: ["admin", "me"], queryFn: () => amIAdmin() });
  const isAdmin = admin?.isAdmin ?? false;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 font-display text-lg font-semibold">
            <Leaf className="w-5 h-5 text-primary" />
            Verdant
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link to="/dashboard" className="px-3 py-1.5 rounded-md hover:bg-muted flex items-center gap-1.5" activeProps={{ className: "px-3 py-1.5 rounded-md bg-muted flex items-center gap-1.5 text-primary" }}>
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
            <Link to="/plants/new" className="px-3 py-1.5 rounded-md hover:bg-muted flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add plant
            </Link>
            <Link to="/settings" className="px-3 py-1.5 rounded-md hover:bg-muted flex items-center gap-1.5">
              <Settings className="w-4 h-4" /> Settings
            </Link>
            {isAdmin && (
              <Link to="/admin" className="px-3 py-1.5 rounded-md hover:bg-muted flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> Admin
              </Link>
            )}
            <button onClick={signOut} className="px-3 py-1.5 rounded-md hover:bg-muted flex items-center gap-1.5 text-muted-foreground">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
