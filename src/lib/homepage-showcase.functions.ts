import { createServerFn } from "@tanstack/react-start";

const SHOWCASE_SLUGS = [
  "monstera-deliciosa-swiss-cheese-plant",
  "calathea-orbifolia-round-leaf-calathea",
] as const;

function catalogStoragePath(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  const marker = "/plant-images/";
  const markerIndex = imageUrl.indexOf(marker);
  if (markerIndex < 0) return null;
  return decodeURIComponent(imageUrl.slice(markerIndex + marker.length).split("?")[0]);
}

export const getHomepageShowcaseImages = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: species, error } = await supabaseAdmin
    .from("plant_species")
    .select("common_name, slug, image_url")
    .in("slug", [...SHOWCASE_SLUGS])
    .is("archived_at", null);

  if (error || !species?.length) return {};

  const imageRows = species.flatMap((row) => {
    const path = catalogStoragePath(row.image_url);
    return path ? [{ ...row, path }] : [];
  });
  if (!imageRows.length) return {};

  const { data: signedImages, error: signedError } = await supabaseAdmin.storage
    .from("plant-images")
    .createSignedUrls(imageRows.map((row) => row.path), 60 * 60 * 24);

  if (signedError || !signedImages) return {};

  return Object.fromEntries(
    imageRows.flatMap((row, index) => {
      const signedUrl = signedImages[index]?.signedUrl;
      return signedUrl ? [[row.slug, { src: signedUrl, alt: row.common_name }]] : [];
    }),
  );
});