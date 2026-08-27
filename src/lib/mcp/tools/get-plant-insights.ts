import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getPlantInsights } from "@/lib/assistant/tool-helpers.server";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_plant_insights",
  title: "Get plant insights",
  description: "Get detailed insights for a specific plant by nickname or ID, including recent sensor readings, AI summaries, and watering history.",
  inputSchema: {
    identifier: z.string().describe("The plant nickname or UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ identifier }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const email = ctx.getUserEmail();
    const insights = await getPlantInsights(supabase, email, identifier);
    return {
      content: [{ type: "text", text: JSON.stringify(insights, null, 2) }],
      structuredContent: insights,
    };
  },
});
