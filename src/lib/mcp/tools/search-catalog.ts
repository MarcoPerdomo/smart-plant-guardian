import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { searchPlantCatalog } from "@/lib/assistant/tool-helpers.server";
import { supabaseForUser, hasPremium, PREMIUM_REQUIRED_MESSAGE } from "../supabase";

export default defineTool({
  name: "search_catalog",
  title: "Search plant catalog",
  description: "Search the Verdant plant catalog for care information about a houseplant.",
  inputSchema: {
    q: z.string().describe("Search term such as a common name or scientific name."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ q }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    if (!(await hasPremium(supabase, ctx))) {
      return { content: [{ type: "text", text: PREMIUM_REQUIRED_MESSAGE }], isError: true };
    }
    const results = await searchPlantCatalog(supabase, q);
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      structuredContent: { results },
    };
  },
});
