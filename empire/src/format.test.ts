import { describe, expect, it } from 'vitest';
import type { Photo } from './db';
import { formatCoords, formatDay, groupByDay, mapsUrl, parseTags } from './format';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const photo = (takenAt: number) => ({ id: String(takenAt), takenAt }) as Photo;

describe('groupByDay', () => {
  it('groups consecutive photos by calendar day', () => {
    const groups = groupByDay([photo(at(2026, 5, 2, 18)), photo(at(2026, 5, 2, 8)), photo(at(2026, 5, 1, 23))]);
    expect(groups.map((g) => [g.day, g.photos.length])).toEqual([
      ['2026-05-02', 2],
      ['2026-05-01', 1],
    ]);
  });
});

describe('formatDay', () => {
  it('labels today and yesterday', () => {
    const now = at(2026, 5, 2, 15);
    expect(formatDay(at(2026, 5, 2, 1), now)).toBe('Today');
    expect(formatDay(at(2026, 5, 1, 23), now)).toBe('Yesterday');
    expect(formatDay(at(2026, 4, 1), now)).toMatch(/2026/);
  });
});

describe('parseTags', () => {
  it('normalizes, strips # and dedupes', () => {
    expect(parseTags('Roof, #damage  roof,, Before')).toEqual(['roof', 'damage', 'before']);
    expect(parseTags('  ')).toEqual([]);
  });
});

describe('location helpers', () => {
  it('formats coordinates and builds map links', () => {
    expect(formatCoords()).toBe('');
    expect(formatCoords(30.26721, -97.74306)).toBe('30.26721, -97.74306');
    expect(mapsUrl({ lat: 1, lng: 2, address: 'x' })).toContain('query=1%2C2');
    expect(mapsUrl({ address: '1 Main St' })).toContain('query=1%20Main%20St');
  });
});
