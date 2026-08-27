import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPlantsTool from "./tools/list-plants";
import getPlantInsightsTool from "./tools/get-plant-insights";
import logWateringTool from "./tools/log-watering";
import addPlantTool from "./tools/add-plant";
import searchCatalogTool from "./tools/search-catalog";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "verdant",
  title: "Verdant",
  version: "0.1.0",
  instructions:
    "Verdant is a plant care assistant. Use these tools to help the user manage their houseplants: list_plants to see their garden, get_plant_insights for detailed status, log_watering to record watering, add_plant to register a new plant, and search_catalog to look up care information.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listPlantsTool, getPlantInsightsTool, logWateringTool, addPlantTool, searchCatalogTool],
});
