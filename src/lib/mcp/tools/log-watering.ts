import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { logWatering } from "@/lib/assistant/tool-helpers.server";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "log_watering",
  title: "Log watering",
  description: "Log that the user watered a plant. Accepts the plant nickname or ID and an optional amount in milliliters.",
  inputSchema: {
    identifier: z.string().describe("The plant nickname or UUID."),
    amount_ml: z.number().int().optional().describe("Optional amount of water in milliliters."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ identifier, amount_ml }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const email = ctx.getUserEmail();
    const result = await logWatering(supabase, email, identifier, amount_ml ?? null);
    return {
      content: [{ type: "text", text: `Watered ${result.plant.nickname}.` }],
      structuredContent: result,
    };
  },
});
