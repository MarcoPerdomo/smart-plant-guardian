import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { searchPlantCatalog } from "@/lib/assistant/tool-helpers.server";
import { supabaseForUser } from "../supabase";

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
    const results = await searchPlantCatalog(supabase, q);
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      structuredContent: { results },
    };
  },
});
