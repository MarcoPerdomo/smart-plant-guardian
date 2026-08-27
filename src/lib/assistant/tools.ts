import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  listUserPlants,
  getPlantInsights,
  logWatering,
  addUserPlant,
  searchPlantCatalog,
} from "./tool-helpers.server";

type ToolDeps = {
  supabase: SupabaseClient<Database>;
  userEmail: string;
  claims?: Record<string, unknown>;
};

export function createAssistantTools(deps: ToolDeps) {
  return {
    list_plants: tool({
      description: "List the user's plants with their current status and latest sensor reading.",
      parameters: z.object({}),
      execute: async () => {
        return await listUserPlants(deps.supabase, deps.userEmail, deps.claims);
      },
    }),

    get_plant_insights: tool({
      description: "Get detailed insights for a specific plant by nickname or ID, including recent sensor readings, AI summaries, and watering history.",
      parameters: z.object({
        identifier: z.string().describe("The plant nickname or UUID."),
      }),
      execute: async ({ identifier }) => {
        return await getPlantInsights(deps.supabase, deps.userEmail, identifier, deps.claims);
      },
    }),

    log_watering: tool({
      description: "Log that the user watered a plant. Accepts the plant nickname or ID and an optional amount in milliliters.",
      parameters: z.object({
        identifier: z.string().describe("The plant nickname or UUID."),
        amount_ml: z.number().int().optional().describe("Optional amount of water in milliliters."),
      }),
      execute: async ({ identifier, amount_ml }) => {
        return await logWatering(deps.supabase, deps.userEmail, identifier, amount_ml ?? null, deps.claims);
      },
    }),

    add_plant: tool({
      description: "Add a new plant to the user's garden. Requires a nickname and the plant species/common name.",
      parameters: z.object({
        nickname: z.string().describe("A friendly nickname for the plant, e.g. 'Monstera Deliciosa'."),
        species_name: z.string().describe("The plant species or common name, e.g. 'Monstera deliciosa'."),
      }),
      execute: async ({ nickname, species_name }) => {
        return await addUserPlant(deps.supabase, deps.userEmail, nickname, species_name, deps.claims);
      },
    }),

    search_catalog: tool({
      description: "Search the Verdant plant catalog for care information about a houseplant.",
      parameters: z.object({
        q: z.string().describe("Search term such as a common name or scientific name."),
      }),
      execute: async ({ q }) => {
        return await searchPlantCatalog(deps.supabase, q);
      },
    }),
  };
}

export type AssistantTools = ReturnType<typeof createAssistantTools>;
