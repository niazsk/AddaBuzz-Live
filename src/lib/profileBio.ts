export const LEGACY_DEFAULT_BIO = 'New creator on AddaBuzz Live.';

export function visibleBio(bio?: string | null): string {
  const trimmed = bio?.trim() ?? '';
  return trimmed === LEGACY_DEFAULT_BIO ? '' : trimmed;
}
