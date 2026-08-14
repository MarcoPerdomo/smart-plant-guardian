import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { searchSpecies, lookupOrCreateSpecies, createPlant } from "@/lib/plants.functions";
import { toast } from "sonner";
import { ArrowLeft, Search, Sparkles } from "lucide-react";

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

  const { data: results = [] } = useQuery({
    queryKey: ["species-search", query],
    queryFn: () => searchSpecies({ data: { q: query } }),
  });

  const aiLookup = useMutation({
    mutationFn: (name: string) => lookupOrCreateSpecies({ data: { name } }),
    onSuccess: (row) => { setSelectedSpecies({ id: row.id, common_name: row.common_name }); toast.success(`Added ${row.common_name} to your catalog`); },
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

          <div className="mt-3 max-h-56 overflow-y-auto space-y-1">
            {results.map((s) => (
              <button
                key={s.id} onClick={() => setSelectedSpecies({ id: s.id, common_name: s.common_name })}
                className={`w-full text-left px-3 py-2 rounded-md hover:bg-muted text-sm flex justify-between ${selectedSpecies?.id === s.id ? "bg-muted" : ""}`}
              >
                <span><span className="font-medium">{s.common_name}</span> <span className="text-muted-foreground italic">{s.scientific_name}</span></span>
                {s.source === "ai" && <Sparkles className="w-3.5 h-3.5 text-accent" />}
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
            <div className="mt-3 text-xs text-muted-foreground">Selected: <span className="text-foreground font-medium">{selectedSpecies.common_name}</span></div>
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
