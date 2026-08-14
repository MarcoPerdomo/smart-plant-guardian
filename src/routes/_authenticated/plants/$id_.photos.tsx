import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { deletePlantPhoto, getPlant, updatePlantPhoto } from "@/lib/plants.functions";
import { UploadPhotoButton, usePhotoUrls, usePlantPhotos, type PlantPhoto } from "@/components/plant-photos";

export const Route = createFileRoute("/_authenticated/plants/$id_/photos")({
  component: PlantPhotosPage,
  head: () => ({
    meta: [
      { title: "Plant photo journal — Verdant" },
      { name: "description", content: "Every photo of your plant over time, newest first." },
    ],
  }),
});

function PlantPhotosPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: plantData } = useQuery({ queryKey: ["plant", id], queryFn: () => getPlant({ data: { id } }) });
  const { data: photos, isLoading } = usePlantPhotos(id);
  const { data: urls } = usePhotoUrls((photos ?? []).map((p) => p.storage_path));

  const plantName = plantData?.plant.nickname ?? "your plant";

  const delMut = useMutation({
    mutationFn: (photoId: string) => deletePlantPhoto({ data: { id: photoId } }),
    onSuccess: () => {
      toast.success("Photo deleted");
      qc.invalidateQueries({ queryKey: ["plant_photos", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const groups = groupByDay(photos ?? []);

  return (
    <div>
      <Link to="/plants/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> {plantName}
      </Link>

      <header className="mt-2 mb-6">
        <h1 className="font-display text-3xl font-semibold">Photo journal</h1>
        <p className="text-sm text-muted-foreground">
          {photos?.length ?? 0} photo{(photos?.length ?? 0) === 1 ? "" : "s"} of {plantName}, newest first.
        </p>
      </header>

      <UploadPhotoButton plantId={id} className="mb-8" />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading photos…</p>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No photos yet.
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(([day, items]) => (
            <section key={day}>
              <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">{day}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((photo) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    url={urls?.[photo.storage_path]}
                    plantName={plantName}
                    plantId={id}
                    onDelete={() => {
                      if (confirm("Delete this photo?")) delMut.mutate(photo.id);
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoCard({
  photo,
  url,
  plantName,
  plantId,
  onDelete,
}: {
  photo: PlantPhoto;
  url?: string;
  plantName: string;
  plantId: string;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(photo.caption ?? "");

  const saveMut = useMutation({
    mutationFn: () => updatePlantPhoto({ data: { id: photo.id, caption: caption.trim() || null } }),
    onSuccess: () => {
      toast.success("Caption updated");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["plant_photos", plantId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <figure className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
      {url ? (
        <img
          src={url}
          alt={photo.caption ?? `Photo of ${plantName} taken ${format(new Date(photo.taken_at), "MMM d, yyyy")}`}
          className="w-full aspect-square object-cover bg-muted"
          loading="lazy"
        />
      ) : (
        <div className="w-full aspect-square bg-muted animate-pulse" />
      )}
      <figcaption className="p-3 text-xs flex-1 flex flex-col gap-2">
        <span className="text-muted-foreground">{format(new Date(photo.taken_at), "MMM d, yyyy · HH:mm")}</span>
        {editing ? (
          <div className="flex gap-1.5">
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a note"
              className="flex-1 px-2 py-1.5 rounded-md border border-input bg-background text-xs"
            />
            <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="px-2 py-1.5 rounded-md bg-primary text-primary-foreground text-xs">
              Save
            </button>
            <button onClick={() => { setCaption(photo.caption ?? ""); setEditing(false); }} className="px-2 py-1.5 rounded-md border border-border text-xs">
              Cancel
            </button>
          </div>
        ) : (
          <p className="text-foreground">{photo.caption || <span className="text-muted-foreground">No note</span>}</p>
        )}
        <div className="mt-auto flex gap-3 pt-1">
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-primary flex items-center gap-1 hover:underline">
              <Pencil className="w-3 h-3" /> Edit caption
            </button>
          )}
          <button onClick={onDelete} className="text-destructive flex items-center gap-1 hover:underline">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </figcaption>
    </figure>
  );
}

function groupByDay(photos: PlantPhoto[]): Array<[string, PlantPhoto[]]> {
  const map = new Map<string, PlantPhoto[]>();
  for (const p of photos) {
    const day = format(new Date(p.taken_at), "EEEE, MMM d, yyyy");
    const list = map.get(day);
    if (list) list.push(p);
    else map.set(day, [p]);
  }
  return [...map.entries()];
}
