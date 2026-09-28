export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return value.replace('T', ' ').replace(/\.\d+Z?$/, '').slice(0, 16);
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return hours ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m ${String(remainder).padStart(2, '0')}s`;
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters == null || !Number.isFinite(meters)) return '—';
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

export function titleCase(value: string): string {
  return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
