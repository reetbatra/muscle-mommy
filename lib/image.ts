/**
 * Shrinks a photo before it leaves the phone.
 *
 * Two reasons. A photo straight out of an iPhone library is several megabytes,
 * which is a slow upload on gym wifi and buys nothing: no vision model needs
 * more than about 1600px to tell paneer from tofu. And library photos are
 * often HEIC, which not every model accepts, so re-encoding to JPEG here also
 * removes a whole class of failure.
 *
 * Any failure returns the original file. A slightly slow upload beats a lost
 * meal.
 */
export async function downscaleImage(
  file: File,
  { maxEdge = 1600, quality = 0.82 }: { maxEdge?: number; quality?: number } = {},
): Promise<File> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);

    // Already small and already a format everything reads.
    if (longest <= maxEdge && file.type === "image/jpeg") {
      bitmap.close();
      return file;
    }

    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob || blob.size === 0) return file;

    const name = file.name.replace(/\.[^.]+$/, "") || "meal";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
