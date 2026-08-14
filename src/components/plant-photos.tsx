import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Camera, ImagePlus, Images } from "lucide-react";
import { format } from "date-fns";
import { createPlantPhoto, getPhotoSignedUrls, listPlantPhotos } from "@/lib/plants.functions";
import { uploadPlantPhotoFile } from "@/lib/photo-upload";

export type PlantPhoto = Awaited<ReturnType<typeof listPlantPhotos>>[number];

export function usePlantPhotos(plantId: string, limit?: number) {
  return useQuery({
    queryKey: ["plant_photos", plantId, limit ?? "all"],
    queryFn: () => listPlantPhotos({ data: { plant_id: plantId, ...(limit ? { limit } : {}) } }),
  });
}

export function usePhotoUrls(paths: string[]) {
  const key = paths.slice().sort().join("|");
  return useQuery({
    queryKey: ["photo_urls", key],
    queryFn: () => getPhotoSignedUrls({ data: { paths } }),
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000,
  });
}

export function UploadPhotoButton({ plantId, className }: { plantId: string; className?: string }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState(false);

  const mut = useMutation({
    mutationFn: async (file: File) => {
      const uploaded = await uploadPlantPhotoFile(plantId, file);
      return createPlantPhoto({ data: { plant_id: plantId, caption: caption.trim() || null, ...uploaded } });
    },
    onSuccess: () => {
      toast.success("Photo added");
      setCaption("");
      qc.invalidateQueries({ queryKey: ["plant_photos", plantId] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setPending(false),
  });

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setPending(true);
          mut.mutate(file);
        }}
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Optional note (e.g. new leaf unfurling)"
          className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <ImagePlus className="w-4 h-4" /> {pending ? "Uploading…" : "Upload photo"}
        </button>
      </div>
    </div>
  );
}

export function LatestPhotoCard({ plantId, plantName }: { plantId: string; plantName: string }) {
  const { data: photos, isLoading } = usePlantPhotos(plantId, 1);
  const latest = photos?.[0];
  const { data: urls } = usePhotoUrls(latest ? [latest.storage_path] : []);
  const url = latest ? urls?.[latest.storage_path] : undefined;

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" /> Photo journal
        </h2>
        <Link
          to="/plants/$id/photos"
          params={{ id: plantId }}
          className="text-xs text-primary flex items-center gap-1 hover:underline"
        >
          <Images className="w-3.5 h-3.5" /> View all photos
        </Link>
      </div>

      <UploadPhotoButton plantId={plantId} className="mb-4" />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading photos…</p>
      ) : !latest ? (
        <p className="text-sm text-muted-foreground">
          No photos yet. Upload one to start tracking {plantName}&apos;s progress.
        </p>
      ) : (
        <figure>
          {url ? (
            <img
              src={url}
              alt={`Latest photo of ${plantName}`}
              className="rounded-xl w-full max-h-96 object-contain bg-muted"
              loading="lazy"
            />
          ) : (
            <div className="rounded-xl w-full h-48 bg-muted animate-pulse" />
          )}
          <figcaption className="mt-2 text-xs text-muted-foreground">
            {format(new Date(latest.taken_at), "MMM d, yyyy · HH:mm")}
            {latest.caption ? ` — ${latest.caption}` : ""}
          </figcaption>
        </figure>
      )}
    </section>
  );
}
