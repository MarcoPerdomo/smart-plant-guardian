import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Search, Loader2, Crosshair, X } from "lucide-react";
import { getProfile } from "@/lib/plants.functions";
import { searchCities, saveLocation, clearLocation } from "@/lib/weather.functions";

interface CityResult {
  name: string;
  region: string | null;
  country_code: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
}

export function LocationSettings() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CityResult[] | null>(null);
  const [locating, setLocating] = useState(false);

  const searchMut = useMutation({
    mutationFn: (query: string) => searchCities({ data: { q: query } }),
    onSuccess: (r) => setResults(r as CityResult[]),
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMut = useMutation({
    mutationFn: (c: CityResult) =>
      saveLocation({
        data: {
          city: c.name || null,
          region: c.region,
          country_code: c.country_code,
          latitude: c.latitude,
          longitude: c.longitude,
          timezone: c.timezone,
        },
      }),
    onSuccess: () => {
      toast.success("Location saved");
      setResults(null);
      setQ("");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["weather"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearMut = useMutation({
    mutationFn: () => clearLocation(),
    onSuccess: () => {
      toast.success("Location cleared");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["weather"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error("Geolocation not available");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        saveMut.mutate({
          name: "My location",
          region: null,
          country_code: null,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timezone: null,
        });
      },
      () => {
        setLocating(false);
        toast.error("Couldn't read your location");
      },
      { timeout: 8000 },
    );
  }

  const hasLocation = profile?.latitude != null && profile?.longitude != null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-semibold flex items-center gap-2">
        <MapPin className="w-5 h-5 text-primary" /> Location
      </h2>
      <p className="text-xs text-muted-foreground mt-1">
        Used for live weather and weather-aware care alerts. City-level only — no street address.
      </p>

      {hasLocation && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <div>
            <div className="font-medium">
              {profile?.city ?? "Saved location"}
              {profile?.region ? `, ${profile.region}` : ""}
              {profile?.country_code ? ` (${profile.country_code})` : ""}
            </div>
            <div className="text-xs text-muted-foreground">{profile?.timezone ?? "—"}</div>
          </div>
          <button onClick={() => clearMut.mutate()} className="p-1.5 rounded-md hover:bg-muted" aria-label="Clear location">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim().length >= 2) searchMut.mutate(q.trim());
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a city — e.g. Amsterdam"
          className="flex-1 px-3 py-2.5 rounded-lg border border-input bg-background text-sm"
        />
        <button type="submit" disabled={searchMut.isPending} className="px-3 rounded-lg border border-border hover:bg-muted">
          {searchMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
        <button type="button" onClick={useMyLocation} className="px-3 rounded-lg border border-border hover:bg-muted" title="Use my current location">
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
        </button>
      </form>

      {results && (
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border overflow-hidden">
          {results.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">No matches.</li>}
          {results.map((c) => (
            <li key={`${c.latitude},${c.longitude}`}>
              <button
                onClick={() => saveMut.mutate(c)}
                disabled={saveMut.isPending}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted flex items-center justify-between"
              >
                <span>
                  {c.name}
                  {c.region ? `, ${c.region}` : ""} {c.country_code ? `· ${c.country_code}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">{c.timezone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
