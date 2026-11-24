export type ProfileImageKind = 'avatar' | 'cover';

// Spark plan has no Cloud Storage bucket, so images are compressed client-side
// and stored as base64 data URLs: avatar inline on the user doc (small) and
// cover in a separate userCovers doc (too large for the users doc).
const MAX_DIM: Record<ProfileImageKind, number> = { avatar: 160, cover: 1080 };
const QUALITY: Record<ProfileImageKind, number> = { avatar: 0.72, cover: 0.7 };
const MAX_CHARS: Record<ProfileImageKind, number> = { avatar: 55000, cover: 780000 };

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // HEIC and some formats fail createImageBitmap; fall back to <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not read this image. Try a JPG or PNG.'));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

export async function compressProfileImage(
  kind: ProfileImageKind,
  file: File
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }

  const source = await decodeImage(file);
  const width = 'width' in source ? source.width : 0;
  const height = 'height' in source ? source.height : 0;
  if (!width || !height) {
    throw new Error('Could not read this image. Try a JPG or PNG.');
  }

  const maxDim = MAX_DIM[kind];
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image.');
  ctx.drawImage(source, 0, 0, w, h);
  if ('close' in source) source.close();

  const cap = MAX_CHARS[kind];
  let quality = QUALITY[kind];
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > cap && quality > 0.4) {
    quality = Math.max(0.4, quality - 0.08);
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  if (dataUrl.length > cap) {
    const shrink = document.createElement('canvas');
    shrink.width = Math.max(1, Math.round(w * 0.75));
    shrink.height = Math.max(1, Math.round(h * 0.75));
    shrink.getContext('2d')?.drawImage(canvas, 0, 0, shrink.width, shrink.height);
    dataUrl = shrink.toDataURL('image/jpeg', 0.6);
  }

  if (!dataUrl.startsWith('data:image/jpeg') || dataUrl.length > cap) {
    throw new Error('Could not process image. Try a smaller JPG or PNG.');
  }
  return dataUrl;
}
