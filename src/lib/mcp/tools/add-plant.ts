import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { addUserPlant } from "@/lib/assistant/tool-helpers.server";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_plant",
  title: "Add plant",
  description: "Add a new plant to the user's garden. Requires a nickname and the plant species/common name.",
  inputSchema: {
    nickname: z.string().describe("A friendly nickname for the plant."),
    species_name: z.string().describe("The plant species or common name."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ nickname, species_name }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const email = ctx.getUserEmail();
    const result = await addUserPlant(supabase, email, nickname, species_name);
    return {
      content: [{ type: "text", text: `Added ${result.plant.nickname} to your garden.` }],
      structuredContent: result,
    };
  },
});
