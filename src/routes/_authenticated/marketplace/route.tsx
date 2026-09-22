import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { amIAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/marketplace")({
  beforeLoad: async ({ location }) => {
    if (location.pathname.startsWith("/marketplace/coming-soon")) return;
    try {
      const { isAdmin } = await amIAdmin();
      if (!isAdmin) throw redirect({ to: "/marketplace/coming-soon" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in (e as any)) throw e;
      throw redirect({ to: "/marketplace/coming-soon" });
    }
  },
  component: () => <Outlet />,
});
