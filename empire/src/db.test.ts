import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPhoto,
  createProject,
  deletePhoto,
  deleteProject,
  getPhoto,
  getProject,
  listPhotos,
  listProjects,
  listRecentPhotos,
  resetDatabase,
  updatePhoto,
  updateProject,
} from './db';

const blob = (s: string) => new Blob([s], { type: 'image/jpeg' });
const project = (name: string) => createProject({ name, address: '1 Main St', client: 'Acme' });
const photo = (projectId: string, takenAt: number) => addPhoto({ projectId, image: blob('img'), thumb: blob('t'), takenAt });

beforeEach(resetDatabase);

describe('projects', () => {
  it('creates, reads and updates a project', async () => {
    const p = await project('Roof');
    expect(await getProject(p.id)).toMatchObject({ name: 'Roof', address: '1 Main St', client: 'Acme' });
    const updated = await updateProject(p.id, { name: 'Roof v2', lat: 1, lng: 2 });
    expect(updated.updatedAt).toBeGreaterThanOrEqual(p.updatedAt);
    expect(await getProject(p.id)).toMatchObject({ name: 'Roof v2', lat: 1, lng: 2, createdAt: p.createdAt });
  });

  it('rejects updates to a missing project', async () => {
    await expect(updateProject('nope', { name: 'x' })).rejects.toThrow(/not found/);
  });

  it('lists projects by recent activity with counts and newest cover', async () => {
    const a = await project('A');
    await new Promise((r) => setTimeout(r, 5));
    const b = await project('B');
    await new Promise((r) => setTimeout(r, 5));
    await photo(a.id, 100);
    await addPhoto({ projectId: a.id, image: blob('img'), thumb: blob('newest'), takenAt: 200 });

    const list = await listProjects();
    expect(list.map((p) => p.name)).toEqual(['A', 'B']);
    expect(list[0].photoCount).toBe(2);
    expect(await list[0].cover?.text()).toBe('newest');
    expect(list[1]).toMatchObject({ photoCount: 0, cover: undefined });
    expect(b.id).toBeTruthy();
  });

  it('deleting a project removes its photos only', async () => {
    const a = await project('A');
    const b = await project('B');
    const pa = await photo(a.id, 1);
    const pb = await photo(b.id, 2);
    await deleteProject(a.id);
    expect(await getProject(a.id)).toBeUndefined();
    expect(await getPhoto(pa.id)).toBeUndefined();
    expect(await getPhoto(pb.id)).toBeDefined();
  });
});

describe('photos', () => {
  it('requires an existing project', async () => {
    await expect(photo('missing', 1)).rejects.toThrow(/not found/);
  });

  it('lists a project newest first and recent photos across projects', async () => {
    const a = await project('A');
    const b = await project('B');
    await photo(a.id, 10);
    await photo(a.id, 30);
    await photo(b.id, 20);
    expect((await listPhotos(a.id)).map((p) => p.takenAt)).toEqual([30, 10]);
    expect((await listRecentPhotos()).map((p) => p.takenAt)).toEqual([30, 20, 10]);
    expect((await listRecentPhotos(2)).map((p) => p.takenAt)).toEqual([30, 20]);
  });

  it('updates notes, tags and markup, then deletes', async () => {
    const a = await project('A');
    const p = await photo(a.id, 1);
    expect(p).toMatchObject({ note: '', tags: [] });
    await updatePhoto(p.id, { note: 'Cracked shingle', tags: ['roof'], annotated: blob('marked') });
    const got = await getPhoto(p.id);
    expect(got).toMatchObject({ note: 'Cracked shingle', tags: ['roof'] });
    expect(await got?.annotated?.text()).toBe('marked');
    await deletePhoto(p.id);
    expect(await listPhotos(a.id)).toEqual([]);
  });
});
