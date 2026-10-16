const MAX_EDGE = 2048;
const THUMB_EDGE = 480;

async function toJpeg(source: CanvasImageSource, width: number, height: number, maxEdge: number, quality: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvasToBlob(canvas, quality);
}

export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.85) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), 'image/jpeg', quality),
  );
}

/** Downscales a captured file to a storable JPEG plus a grid thumbnail. */
export async function processImage(file: Blob) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const [image, thumb] = await Promise.all([
      toJpeg(bitmap, bitmap.width, bitmap.height, MAX_EDGE, 0.85),
      toJpeg(bitmap, bitmap.width, bitmap.height, THUMB_EDGE, 0.75),
    ]);
    return { image, thumb };
  } finally {
    bitmap.close();
  }
}

export async function makeThumb(image: Blob) {
  const bitmap = await createImageBitmap(image);
  try {
    return await toJpeg(bitmap, bitmap.width, bitmap.height, THUMB_EDGE, 0.75);
  } finally {
    bitmap.close();
  }
}

export interface Position {
  lat: number;
  lng: number;
}

let lastFix: { at: number; pos: Position } | undefined;

/** Best-effort device location; resolves undefined when denied or unavailable. */
export function currentPosition(maxAgeMs = 120_000): Promise<Position | undefined> {
  if (lastFix && Date.now() - lastFix.at < maxAgeMs) return Promise.resolve(lastFix.pos);
  if (!('geolocation' in navigator)) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pos = { lat: coords.latitude, lng: coords.longitude };
        lastFix = { at: Date.now(), pos };
        resolve(pos);
      },
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: maxAgeMs },
    );
  });
}
