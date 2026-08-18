import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { listUserPlants } from "@/lib/plants.functions";
import { getListingDraftForPlant, createListing } from "@/lib/marketplace.functions";
import {
  MARKETPLACE_COUNTRIES,
  PLANT_SIZES,
  BOX_SIZES,
  DISCLOSURE_KINDS,
  euros,
  quote,
} from "@/lib/marketplace-shared";
import { toast } from "sonner";
import { Leaf, Plus, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/marketplace/new")({
  component: NewListing,
  validateSearch: (s: Record<string, unknown>): { plant?: string } =>
    typeof s['plant'] === "string" ? { plant: s['plant'] as string } : {},
  head: () => ({
    meta: [
      { title: "List a plant — Verdant Marketplace" },
      { name: "description", content: "Create a transparent marketplace listing for a plant from your garden." },
      { property: "og:title", content: "List a plant — Verdant Marketplace" },
      { property: "og:description", content: "Create a transparent marketplace listing for a plant from your garden." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Disclosure = { kind: string; description: string; occurred_on: string | null; resolved_on: string | null };

function NewListing() {
  const navigate = useNavigate();
  const { plant: plantParam } = Route.useSearch();
  const [plantId, setPlantId] = useState<string>(plantParam ?? "");

  const { data: plants } = useQuery({ queryKey: ["user_plants"], queryFn: () => listUserPlants() });
  const { data: draft } = useQuery({
    queryKey: ["listing_draft", plantId],
    queryFn: () => getListingDraftForPlant({ data: { plant_id: plantId } }),
    enabled: !!plantId,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [size, setSize] = useState<string>("m");
  const [ageMonths, setAgeMonths] = useState<string>("");
  const [health, setHealth] = useState<string>("4");
  const [country, setCountry] = useState<string>("NL");
  const [allowPickup, setAllowPickup] = useState(true);
  const [allowShipping, setAllowShipping] = useState(false);
  const [shipping, setShipping] = useState("7.95");
  const [boxSize, setBoxSize] = useState<string>("m");
  const [cover, setCover] = useState<string | null>(null);
  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [publish, setPublish] = useState(true);

  useEffect(() => {
    if (!draft) return;
    setTitle(draft.suggested.title ?? "");
    setSize(draft.suggested.size ?? "m");
    setAgeMonths(draft.suggested.age_months != null ? String(draft.suggested.age_months) : "");
    setCountry(draft.suggested.country_code ?? "NL");
    setCover(draft.photos[0]?.storage_path ?? null);
  }, [draft]);

  const createMut = useMutation({
    mutationFn: () =>
      createListing({
        data: {
          plant_id: plantId || null,
          species_id: (draft?.suggested.species_id ?? null) as string | null,
          title,
          description: description || null,
          price_cents: Math.round(Number(price || 0) * 100),
          size: (size || null) as never,
          age_months: ageMonths ? Number(ageMonths) : null,
          health_rating: health ? Number(health) : null,
          country_code: country as never,
          allow_pickup: allowPickup,
          allow_shipping: allowShipping,
          shipping_cents: allowShipping ? Math.round(Number(shipping || 0) * 100) : 0,
          box_size: (allowShipping ? boxSize : null) as never,
          cover_photo_path: cover,
          publish,
          disclosures: disclosures.filter((d) => d.description.trim().length > 1) as never,
        },
      }),
    onSuccess: (row: { id: string }) => {
      toast.success(publish ? "Listing published" : "Draft saved");
      navigate({ to: "/marketplace/$id", params: { id: row.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const priceCents = Math.round(Number(price || 0) * 100);
  const q = quote({ itemCents: priceCents, shippingCents: 0, commissionBps: 700 });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">List a plant</h1>
        <p className="text-sm text-muted-foreground">
          Honest listings build the community — disclose any past pests or damage.
        </p>
      </div>

      <section className="rounded-2xl border border-border p-5 space-y-3">
        <Label>Plant from your garden</Label>
        <select
          value={plantId}
          onChange={(e) => setPlantId(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
        >
          <option value="">Select a plant…</option>
          {(plants ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.nickname}</option>
          ))}
        </select>

        {draft && draft.existing_listing && (
          <p className="text-xs text-warning-foreground bg-warning/15 rounded-md px-3 py-2">
            This plant already has a {draft.existing_listing.status} listing.{" "}
            <Link to="/marketplace/$id" params={{ id: draft.existing_listing.id }} className="underline">View it</Link>
          </p>
        )}

        {draft && draft.photos.length > 0 && (
          <div>
            <Label>Cover photo</Label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {draft.photos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setCover(p.storage_path)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 ${cover === p.storage_path ? "border-primary" : "border-transparent"}`}
                >
                  {p.url ? <img src={p.url} alt="" className="w-full h-full object-cover" /> : <Leaf className="w-5 h-5 m-auto text-primary/30" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border p-5 grid gap-4 md:grid-cols-2">
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="Monstera Deliciosa, well rooted" />
        </Field>
        <Field label="Price (€)">
          <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className={input} placeholder="25.00" />
        </Field>
        <Field label="Size">
          <select value={size} onChange={(e) => setSize(e.target.value)} className={input}>
            {PLANT_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Age (months)">
          <input value={ageMonths} onChange={(e) => setAgeMonths(e.target.value)} inputMode="numeric" className={input} placeholder="18" />
        </Field>
        <Field label="Health rating">
          <select value={health} onChange={(e) => setHealth(e.target.value)} className={input}>
            {[1, 2, 3, 4, 5].map((h) => <option key={h} value={h}>{h} / 5</option>)}
          </select>
        </Field>
        <Field label="Country">
          <select value={country} onChange={(e) => setCountry(e.target.value)} className={input}>
            {MARKETPLACE_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={input} placeholder="How you cared for it, why you're rehoming it…" />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-border p-5 space-y-3">
        <h2 className="font-display text-lg font-semibold">Delivery</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={allowPickup} onChange={(e) => setAllowPickup(e.target.checked)} /> Local pickup
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={allowShipping} onChange={(e) => setAllowShipping(e.target.checked)} /> Shipping (you arrange the carrier)
        </label>
        {allowShipping && (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Shipping price (€)">
              <input value={shipping} onChange={(e) => setShipping(e.target.value)} inputMode="decimal" className={input} />
            </Field>
            <Field label="Box size">
              <select value={boxSize} onChange={(e) => setBoxSize(e.target.value)} className={input}>
                {BOX_SIZES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </Field>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Transparency log</h2>
            <p className="text-xs text-muted-foreground">Past pests, diseases or leaf damage — buyers see these.</p>
          </div>
          <button
            type="button"
            onClick={() => setDisclosures((d) => [...d, { kind: "pest", description: "", occurred_on: null, resolved_on: null }])}
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        {disclosures.map((d, i) => (
          <div key={i} className="rounded-lg border border-border p-3 grid gap-2 md:grid-cols-[140px_1fr_auto]">
            <select
              value={d.kind}
              onChange={(e) => setDisclosures((arr) => arr.map((x, j) => (j === i ? { ...x, kind: e.target.value } : x)))}
              className={input}
            >
              {DISCLOSURE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
            <input
              value={d.description}
              onChange={(e) => setDisclosures((arr) => arr.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
              placeholder="Spider mites in March, treated and resolved"
              className={input}
            />
            <button type="button" onClick={() => setDisclosures((arr) => arr.filter((_, j) => j !== i))} className="px-2 text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border p-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Buyer pays</span>
          <span className="font-medium">{euros(priceCents)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Verdant commission (7%)</span>
          <span>-{euros(q.commissionCents)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
          <span>You receive</span>
          <span>{euros(q.sellerNetCents)}</span>
        </div>
        <label className="flex items-center gap-2 text-sm pt-2">
          <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> Publish immediately
        </label>
        <button
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending || !title || !price}
          className="w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />} {publish ? "Publish listing" : "Save draft"}
        </button>
      </section>
    </div>
  );
}

const input = "w-full px-3 py-2 rounded-md border border-border bg-background text-sm";

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  );
}
