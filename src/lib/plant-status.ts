// Shared plant-status logic. No server imports — safe on client and server.

export type PlantStatus = "healthy" | "attention" | "thirsty" | "unknown";

export interface StatusInput {
  soil_moisture: number | null;
  species_moisture_min: number | null;
  species_moisture_max: number | null;
  last_reading_at: string | null;
  last_watered_at: string | null;
  water_frequency_days: number | null;
}

export function computeStatus(i: StatusInput): { status: PlantStatus; label: string } {
  const now = Date.now();
  if (i.last_reading_at) {
    const age = (now - new Date(i.last_reading_at).getTime()) / (1000 * 60 * 60);
    if (age > 48) return { status: "unknown", label: "No recent sensor data" };
  } else if (!i.last_watered_at) {
    return { status: "unknown", label: "Waiting for first reading" };
  }
  if (i.soil_moisture != null && i.species_moisture_min != null) {
    if (i.soil_moisture < i.species_moisture_min - 5) return { status: "thirsty", label: "Needs water" };
    if (i.species_moisture_max != null && i.soil_moisture > i.species_moisture_max + 10) {
      return { status: "attention", label: "Overwatered" };
    }
  }
  return { status: "healthy", label: "Looking good" };
}

export function predictNextWatering(
  lastWatered: string | null,
  frequencyDays: number | null,
  soilMoisture: number | null,
  moistureMin: number | null,
): { date: Date | null; label: string } {
  if (soilMoisture != null && moistureMin != null && soilMoisture < moistureMin) {
    return { date: new Date(), label: "Water today" };
  }
  if (!frequencyDays) return { date: null, label: "—" };
  const base = lastWatered ? new Date(lastWatered) : new Date();
  const next = new Date(base.getTime() + frequencyDays * 24 * 60 * 60 * 1000);
  const days = Math.max(0, Math.round((next.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  if (days === 0) return { date: next, label: "Water today" };
  if (days === 1) return { date: next, label: "Tomorrow" };
  return { date: next, label: `In ${days} days` };
}
