import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

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

export async function uploadProfileImage(
  uid: string,
  kind: ProfileImageKind,
  file: File
): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const blob = await compressToJpeg(file, MAX_DIM[kind]);
  const path = `profilePhotos/${uid}/${kind}.jpg`;
  const snap = await uploadBytes(ref(storage, path), blob, {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=3600',
  });
  return getDownloadURL(snap.ref);
}