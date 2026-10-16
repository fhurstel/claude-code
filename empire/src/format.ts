import type { Photo } from './db';

export function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Groups photos (already sorted newest first) into consecutive calendar days. */
export function groupByDay(photos: Photo[]) {
  const groups: { day: string; label: string; photos: Photo[] }[] = [];
  for (const p of photos) {
    const day = dayKey(p.takenAt);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.photos.push(p);
    else groups.push({ day, label: formatDay(p.takenAt), photos: [p] });
  }
  return groups;
}

export function formatDay(ts: number, now = Date.now()) {
  if (dayKey(ts) === dayKey(now)) return 'Today';
  if (dayKey(ts) === dayKey(now - 86_400_000)) return 'Yesterday';
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatStamp(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatCoords(lat?: number, lng?: number) {
  return lat == null || lng == null ? '' : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function mapsUrl(p: { address?: string; lat?: number; lng?: number }) {
  const q = p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : p.address ?? '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Splits free text like "roof, Before  #damage" into normalized unique tags. */
export function parseTags(input: string) {
  const tags = input
    .split(/[,\s]+/)
    .map((t) => t.replace(/^#/, '').trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(tags)];
}
