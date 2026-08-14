import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { searchSpecies, lookupOrCreateSpecies, createPlant } from "@/lib/plants.functions";
import { toast } from "sonner";
import { ArrowLeft, Search, Sparkles, Leaf } from "lucide-react";

export const Route = createFileRoute("/_authenticated/plants/new")({
  component: NewPlant,
  head: () => ({ meta: [{ title: "Add plant — Verdant" }, { name: "description", content: "Add a new plant and pair it with an Arduino device." }] }),
});

function NewPlant() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState<{
    id: string;
    common_name: string;
    scientific_name?: string | null;
    image_url?: string | null;
  } | null>(null);
  const [nickname, setNickname] = useState("");
  const [location, setLocation] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [notes, setNotes] = useState("");

  // Load the whole catalog once, then filter locally so typing is instant.
  const { data: catalog = [], isLoading, isError, error } = useQuery({
    queryKey: ["species-catalog"],
    queryFn: () => searchSpecies({ data: { q: "" } }),
    staleTime: 10 * 60 * 1000,
  });

  const results = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((s) => {
      const hay = [s.common_name, s.scientific_name, ...(s.aliases ?? [])]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  })();

  const aiLookup = useMutation({
    mutationFn: (name: string) => lookupOrCreateSpecies({ data: { name } }),
    onSuccess: (row) => { setSelectedSpecies({ id: row.id, common_name: row.common_name, scientific_name: row.scientific_name, image_url: row.image_url }); toast.success(`Added ${row.common_name} to your catalog`); },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMut = useMutation({
    mutationFn: () => createPlant({ data: {
      nickname, species_id: selectedSpecies?.id ?? null,
      location: location || null, device_id: deviceId || null, notes: notes || null,
    } }),
    onSuccess: (row) => { toast.success("Plant added"); navigate({ to: "/plants/$id", params: { id: row.id } }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="font-display text-3xl font-semibold mt-2">Add a plant</h1>

      <div className="mt-8 space-y-6">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium mb-3">1. Pick a species</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search: monstera, pothos, snake plant…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm"
            />
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            {isLoading
              ? "Loading catalog…"
              : isError
                ? <span className="text-destructive">Couldn't load catalog: {(error as Error)?.message}</span>
                : `${results.length} of ${catalog.length} species in catalog`}
          </p>


          <div className="mt-2 max-h-72 overflow-y-auto space-y-1">
            {results.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSpecies({ id: s.id, common_name: s.common_name, scientific_name: s.scientific_name, image_url: s.image_url })}
                className={`w-full text-left px-2 py-2 rounded-md hover:bg-muted text-sm flex items-center gap-3 ${selectedSpecies?.id === s.id ? "bg-muted" : ""}`}
              >
                {s.image_url ? (
                  <img src={s.image_url} alt={s.common_name} loading="lazy" className="w-9 h-9 rounded-md object-cover shrink-0" />
                ) : (
                  <span className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Leaf className="w-4 h-4 text-muted-foreground" />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{s.common_name}</span>{" "}
                  <span className="text-muted-foreground italic">{s.scientific_name}</span>
                </span>
                {s.source === "ai" && <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />}
              </button>
            ))}
            {query.length > 2 && results.length === 0 && (
              <button
                onClick={() => aiLookup.mutate(query)}
                disabled={aiLookup.isPending}
                className="w-full text-left px-3 py-2 rounded-md border border-dashed border-accent/40 text-sm flex items-center gap-2 hover:bg-accent/5"
              >
                <Sparkles className="w-4 h-4 text-accent" />
                {aiLookup.isPending ? "Asking AI…" : `Ask AI for care of "${query}"`}
              </button>
            )}
          </div>

          {selectedSpecies && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
              {selectedSpecies.image_url ? (
                <img src={selectedSpecies.image_url} alt={selectedSpecies.common_name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
              ) : (
                <span className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5 text-muted-foreground" />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Selected</p>
                <p className="font-medium truncate">{selectedSpecies.common_name}</p>
                {selectedSpecies.scientific_name && (
                  <p className="text-xs text-muted-foreground italic truncate">{selectedSpecies.scientific_name}</p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="font-medium">2. Details</h2>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Nickname (e.g. Monty)" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. living room window)" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={2} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" />
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium">3. Pair an Arduino (optional)</h2>
          <p className="text-xs text-muted-foreground mt-1">The device_id your Arduino sends in each POST. Leave empty if you'll add sensors later.</p>
          <input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="e.g. arduino-kitchen-01" className="mt-2 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm font-mono" />
        </section>

        <button
          onClick={() => createMut.mutate()}
          disabled={!nickname || createMut.isPending}
          className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
        >
          {createMut.isPending ? "Adding…" : "Add plant"}
        </button>
      </div>
    </div>
  );
}
