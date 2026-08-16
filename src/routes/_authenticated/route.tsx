import { createFileRoute, Outlet, redirect, Link, useNavigate, useMatch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { amIAdmin } from "@/lib/admin.functions";
import { getUnreadCount } from "@/lib/chat.functions";
import { getBadgeCounts } from "@/lib/notifications.functions";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { CountBadge } from "@/components/ui/count-badge";
import {
  Leaf,
  LayoutDashboard,
  Settings,
  LogOut,
  Plus,
  Shield,
  Users,
  MessageCircle,
  Sprout,
  Menu,
  ChevronDown,
  User,
} from "lucide-react";

import { WeatherChip } from "@/components/weather-chip";
import { UsernameGate } from "@/components/social/username-gate";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

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

  const dashboardActive = !!useMatch({ from: "/_authenticated/dashboard", shouldThrow: false });
  const plantsNewActive = !!useMatch({ from: "/_authenticated/plants/new", shouldThrow: false });
  const feedActive = !!useMatch({ from: "/_authenticated/feed", shouldThrow: false });
  const friendsActive = !!useMatch({ from: "/_authenticated/friends", shouldThrow: false });
  const messagesIndexActive = !!useMatch({ from: "/_authenticated/messages/", shouldThrow: false });
  const messagesThreadActive = !!useMatch({ from: "/_authenticated/messages/$id", shouldThrow: false });
  const messagesActive = messagesIndexActive || messagesThreadActive;
  const settingsActive = !!useMatch({ from: "/_authenticated/settings", shouldThrow: false });
  const adminActive = !!useMatch({ from: "/_authenticated/admin", shouldThrow: false });

  const activeItem = (active: boolean) => (active ? "bg-muted text-primary" : "");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 font-display text-lg font-semibold">
            <Leaf className="w-5 h-5 text-primary" />
            Verdant
          </Link>

          <div className="flex items-center gap-1">
            <WeatherChip />

            {/* Desktop grouped navigation */}
            <nav className="hidden md:flex items-center gap-1 text-sm">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("gap-1.5", (dashboardActive || plantsNewActive) && "bg-muted text-primary")}
                  >
                    <Leaf className="w-4 h-4" />
                    My plants
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    asChild
                    className={cn("flex items-center gap-2 cursor-pointer", activeItem(dashboardActive))}
                  >
                    <Link to="/dashboard">
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className={cn("flex items-center gap-2 cursor-pointer", activeItem(plantsNewActive))}
                  >
                    <Link to="/plants/new">
                      <Plus className="w-4 h-4" /> Add plant
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("gap-1.5", (feedActive || friendsActive || messagesActive) && "bg-muted text-primary")}
                  >
                    <Users className="w-4 h-4" />
                    Social
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    asChild
                    className={cn("flex items-center gap-2 cursor-pointer", activeItem(feedActive))}
                  >
                    <Link to="/feed">
                      <Sprout className="w-4 h-4" /> Feed
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className={cn("flex items-center gap-2 cursor-pointer", activeItem(friendsActive))}
                  >
                    <Link to="/friends">
                      <Users className="w-4 h-4" /> Friends
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className={cn("flex items-center gap-2 cursor-pointer", activeItem(messagesActive))}
                  >
                    <Link to="/messages" className="justify-between">
                      <span className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" /> Messages
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("gap-1.5", (settingsActive || adminActive) && "bg-muted text-primary")}
                  >
                    <User className="w-4 h-4" />
                    Account
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    asChild
                    className={cn("flex items-center gap-2 cursor-pointer", activeItem(settingsActive))}
                  >
                    <Link to="/settings">
                      <Settings className="w-4 h-4" /> Settings
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem
                      asChild
                      className={cn("flex items-center gap-2 cursor-pointer", activeItem(adminActive))}
                    >
                      <Link to="/admin">
                        <Shield className="w-4 h-4" /> Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={signOut}
                    className="flex items-center gap-2 cursor-pointer text-muted-foreground"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            {/* Mobile hamburger menu */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <section>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      My plants
                    </h3>
                    <div className="space-y-1">
                      <SheetClose asChild>
                        <Link
                          to="/dashboard"
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-sm",
                            dashboardActive && "bg-muted text-primary"
                          )}
                        >
                          <LayoutDashboard className="w-4 h-4" /> Dashboard
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          to="/plants/new"
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-sm",
                            plantsNewActive && "bg-muted text-primary"
                          )}
                        >
                          <Plus className="w-4 h-4" /> Add plant
                        </Link>
                      </SheetClose>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Social
                    </h3>
                    <div className="space-y-1">
                      <SheetClose asChild>
                        <Link
                          to="/feed"
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-sm",
                            feedActive && "bg-muted text-primary"
                          )}
                        >
                          <Sprout className="w-4 h-4" /> Feed
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          to="/friends"
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-sm",
                            friendsActive && "bg-muted text-primary"
                          )}
                        >
                          <Users className="w-4 h-4" /> Friends
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          to="/messages"
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-sm justify-between",
                            messagesActive && "bg-muted text-primary"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" /> Messages
                          </span>
                          {unreadCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                              {unreadCount}
                            </span>
                          )}
                        </Link>
                      </SheetClose>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Account
                    </h3>
                    <div className="space-y-1">
                      <SheetClose asChild>
                        <Link
                          to="/settings"
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-sm",
                            settingsActive && "bg-muted text-primary"
                          )}
                        >
                          <Settings className="w-4 h-4" /> Settings
                        </Link>
                      </SheetClose>
                      {isAdmin && (
                        <SheetClose asChild>
                          <Link
                            to="/admin"
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-sm",
                              adminActive && "bg-muted text-primary"
                            )}
                          >
                            <Shield className="w-4 h-4" /> Admin
                          </Link>
                        </SheetClose>
                      )}
                      <button
                        onClick={signOut}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-sm text-muted-foreground"
                      >
                        <LogOut className="w-4 h-4" /> Sign out
                      </button>
                    </div>
                  </section>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <UsernameGate />
    </div>
  );
}
