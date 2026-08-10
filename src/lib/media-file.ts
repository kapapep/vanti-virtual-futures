/** Reads an image file and returns a downscaled JPEG data URL suitable for a post. */
export async function fileToPostImageDataUrl(file: File, maxEdge = 1280): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 15 * 1024 * 1024) throw new Error("That image is too large (max 15MB).");

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let quality = 0.82;
  let url = canvas.toDataURL("image/jpeg", quality);
  while (url.length > 1_400_000 && quality > 0.4) {
    quality -= 0.12;
    url = canvas.toDataURL("image/jpeg", quality);
  }
  if (url.length > 1_800_000) throw new Error("That image is too detailed. Try a smaller one.");
  return url;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read that recording."));
    reader.readAsDataURL(blob);
  });
}

/** Maps a MediaRecorder mime type to the audio format name the moderation model expects. */
export function audioFormatFromMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg")) return "mp3";
  return "webm";
}

export const MAX_AUDIO_SECONDS = 10;
