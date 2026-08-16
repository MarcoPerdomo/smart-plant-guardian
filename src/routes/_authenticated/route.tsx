import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { amIAdmin } from "@/lib/admin.functions";
import { getUnreadCount } from "@/lib/chat.functions";
import { Leaf, LayoutDashboard, Settings, LogOut, Plus, Shield, Users, MessageCircle, Sprout } from "lucide-react";
import { WeatherChip } from "@/components/weather-chip";
import { UsernameGate } from "@/components/social/username-gate";

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
  const qc = useQueryClient();
  const { data: admin } = useQuery({ queryKey: ["admin", "me"], queryFn: () => amIAdmin() });
  const isAdmin = admin?.isAdmin ?? false;
  const { data: unread } = useQuery({
    queryKey: ["unread_messages"],
    queryFn: () => getUnreadCount(),
    refetchInterval: 60_000,
  });
  const unreadCount = unread?.count ?? 0;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
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
          <nav className="flex items-center gap-1 text-sm flex-wrap justify-end">
            <WeatherChip />
            <Link to="/dashboard" className="px-3 py-1.5 rounded-md hover:bg-muted flex items-center gap-1.5" activeProps={{ className: "px-3 py-1.5 rounded-md bg-muted flex items-center gap-1.5 text-primary" }}>
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
            <Link to="/feed" className="px-3 py-1.5 rounded-md hover:bg-muted flex items-center gap-1.5" activeProps={{ className: "px-3 py-1.5 rounded-md bg-muted flex items-center gap-1.5 text-primary" }}>
              <Sprout className="w-4 h-4" /> Feed
            </Link>
            <Link to="/friends" className="px-3 py-1.5 rounded-md hover:bg-muted flex items-center gap-1.5" activeProps={{ className: "px-3 py-1.5 rounded-md bg-muted flex items-center gap-1.5 text-primary" }}>
              <Users className="w-4 h-4" /> Friends
            </Link>
            <Link to="/messages" className="px-3 py-1.5 rounded-md hover:bg-muted flex items-center gap-1.5 relative" activeProps={{ className: "px-3 py-1.5 rounded-md bg-muted flex items-center gap-1.5 text-primary relative" }}>
              <MessageCircle className="w-4 h-4" /> Messages
              {unreadCount > 0 && (
                <span className="ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                  {unreadCount}
                </span>
              )}
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
      <UsernameGate />
    </div>
  );

}
