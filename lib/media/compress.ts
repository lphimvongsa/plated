const DEFAULT_MAX_EDGE = 2048;
const DEFAULT_MAX_BYTES = 1_400_000;
const HARD_MAX_BYTES = 3_500_000;
const MIN_QUALITY = 0.52;

type CompressOptions = {
  maxEdge?: number;
  maxBytes?: number;
  quality?: number;
};

function isProbablyImage(file: File) {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i.test(file.name);
}

function outputName(name: string) {
  const base = name.replace(/\.[^.]+$/, "").trim() || "photo";
  return `${base}.jpg`;
}

function loadImageElement(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image."));
    };
    image.src = url;
  });
}

async function decodeImage(file: File) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Some phones send HEIC that the bitmap decoder rejects.
    }
  }
  return loadImageElement(file);
}

function sourceSize(source: ImageBitmap | HTMLImageElement) {
  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: source.width, height: source.height };
}

function drawToCanvas(source: ImageBitmap | HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process this image.");
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the image."))),
      "image/jpeg",
      quality,
    );
  });
}

function tooLargeMessage() {
  return "This photo is too large to upload. Try a JPEG or PNG, or a smaller image.";
}

/** Shrink phone photos so they fit Next.js / Vercel Server Action body limits. */
export async function compressImageForUpload(file: File, options: CompressOptions = {}): Promise<File> {
  if (typeof window === "undefined") return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  if (!isProbablyImage(file)) return file;

  const maxEdge = options.maxEdge ?? DEFAULT_MAX_EDGE;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  let quality = options.quality ?? 0.82;

  try {
    const source = await decodeImage(file);
    const { width: srcWidth, height: srcHeight } = sourceSize(source);
    if (!srcWidth || !srcHeight) {
      if (source instanceof ImageBitmap) source.close();
      if (file.size > HARD_MAX_BYTES) throw new Error(tooLargeMessage());
      return file;
    }

    let scale = Math.min(1, maxEdge / Math.max(srcWidth, srcHeight));
    let width = Math.max(1, Math.round(srcWidth * scale));
    let height = Math.max(1, Math.round(srcHeight * scale));
    let canvas = drawToCanvas(source, width, height);
    let blob = await canvasToBlob(canvas, quality);

    while (blob.size > maxBytes && (quality > MIN_QUALITY || scale > 0.35)) {
      if (quality > MIN_QUALITY) {
        quality = Math.max(MIN_QUALITY, quality - 0.1);
      } else {
        scale *= 0.82;
        width = Math.max(1, Math.round(srcWidth * scale));
        height = Math.max(1, Math.round(srcHeight * scale));
        canvas = drawToCanvas(source, width, height);
      }
      blob = await canvasToBlob(canvas, quality);
    }

    if (source instanceof ImageBitmap) source.close();

    if (blob.size >= file.size && file.type === "image/jpeg") {
      if (file.size > HARD_MAX_BYTES) throw new Error(tooLargeMessage());
      return file;
    }

    const compressed = new File([blob], outputName(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
    if (compressed.size > HARD_MAX_BYTES) throw new Error(tooLargeMessage());
    return compressed;
  } catch (error) {
    if (error instanceof Error && error.message === tooLargeMessage()) throw error;
    if (file.size > HARD_MAX_BYTES) throw new Error(tooLargeMessage());
    return file;
  }
}
