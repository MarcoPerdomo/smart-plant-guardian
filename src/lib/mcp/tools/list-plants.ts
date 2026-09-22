import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { listUserPlants } from "@/lib/assistant/tool-helpers.server";
import { supabaseForUser, hasPremium, PREMIUM_REQUIRED_MESSAGE } from "../supabase";

export default defineTool({
  name: "list_plants",
  title: "List my plants",
  description: "List the user's plants with their current status and latest sensor reading.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const email = ctx.getUserEmail();
    if (!email) return { content: [{ type: "text", text: "No email in token" }], isError: true };
    const supabase = supabaseForUser(ctx);
    if (!(await hasPremium(supabase, ctx))) {
      return { content: [{ type: "text", text: PREMIUM_REQUIRED_MESSAGE }], isError: true };
    }
    const plants = await listUserPlants(supabase, email);
    return {
      content: [{ type: "text", text: JSON.stringify(plants, null, 2) }],
      structuredContent: { plants },
    };
  },
});
