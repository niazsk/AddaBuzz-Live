export type ProfileImageKind = 'avatar' | 'cover';

const MAX_DIM: Record<ProfileImageKind, number> = { avatar: 256, cover: 1280 };

async function compressToJpeg(file: File, maxDim: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not process image.'))),
      'image/jpeg',
      0.85
    );
  });
}

/**
 * Uploads a profile image (avatar or cover) using free, reliable image hosts
 * without requiring any paid Firebase Cloud Storage or billing cards.
 */
export async function uploadProfileImage(
  _uid: string,
  kind: ProfileImageKind,
  file: File
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }

  const blob = await compressToJpeg(file, MAX_DIM[kind]);

  // Strategy 1: Imgur API
  try {
    const formData = new FormData();
    formData.append('image', blob, `${kind}.jpg`);

    const res = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        Authorization: 'Client-ID 546c25a59c58ad7',
      },
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.data && data.data.link) {
        return data.data.link;
      }
    }
  } catch (err) {
    console.warn('Imgur upload fallback triggered:', err);
  }

  // Strategy 2: Catbox fallback
  try {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', blob, `${kind}.jpg`);

    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const text = (await res.text()).trim();
      if (text.startsWith('http://') || text.startsWith('https://')) {
        return text;
      }
    }
  } catch (err) {
    console.warn('Catbox upload fallback triggered:', err);
  }

  throw new Error('Image upload failed. Please check your internet connection and try again.');
}
