import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface Project {
  id: string;
  name: string;
  address: string;
  client: string;
  lat?: number;
  lng?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Photo {
  id: string;
  projectId: string;
  image: Blob;
  /** Copy of `image` with markup drawn on it; shown in place of `image` when present. */
  annotated?: Blob;
  thumb: Blob;
  takenAt: number;
  lat?: number;
  lng?: number;
  note: string;
  tags: string[];
}

export interface ProjectSummary extends Project {
  photoCount: number;
  cover?: Blob;
}

interface EmpireDB extends DBSchema {
  projects: { key: string; value: Project; indexes: { updatedAt: number } };
  photos: {
    key: string;
    value: Photo;
    indexes: { projectId: string; takenAt: number };
  };
}

const DB_NAME = 'empire';
let dbPromise: Promise<IDBPDatabase<EmpireDB>> | undefined;

function db() {
  dbPromise ??= openDB<EmpireDB>(DB_NAME, 1, {
    upgrade(d) {
      const projects = d.createObjectStore('projects', { keyPath: 'id' });
      projects.createIndex('updatedAt', 'updatedAt');
      const photos = d.createObjectStore('photos', { keyPath: 'id' });
      photos.createIndex('projectId', 'projectId');
      photos.createIndex('takenAt', 'takenAt');
    },
  });
  return dbPromise;
}

/** Test hook: drop the cached connection and delete the database. */
export async function resetDatabase() {
  if (dbPromise) (await dbPromise).close();
  dbPromise = undefined;
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

const newId = () => crypto.randomUUID();

export async function createProject(input: Pick<Project, 'name' | 'address' | 'client' | 'lat' | 'lng'>) {
  const now = Date.now();
  const project: Project = { ...input, id: newId(), createdAt: now, updatedAt: now };
  await (await db()).put('projects', project);
  return project;
}

export async function getProject(id: string) {
  return (await db()).get('projects', id);
}

export async function updateProject(id: string, changes: Partial<Omit<Project, 'id' | 'createdAt'>>) {
  const d = await db();
  const current = await d.get('projects', id);
  if (!current) throw new Error(`Project ${id} not found`);
  const next = { ...current, ...changes, updatedAt: Date.now() };
  await d.put('projects', next);
  return next;
}

export async function deleteProject(id: string) {
  const tx = (await db()).transaction(['projects', 'photos'], 'readwrite');
  const photoKeys = await tx.objectStore('photos').index('projectId').getAllKeys(id);
  await Promise.all([
    ...photoKeys.map((k) => tx.objectStore('photos').delete(k)),
    tx.objectStore('projects').delete(id),
    tx.done,
  ]);
}

/** Projects, most recently active first, with photo count and newest photo thumbnail. */
export async function listProjects(): Promise<ProjectSummary[]> {
  const d = await db();
  const projects = (await d.getAllFromIndex('projects', 'updatedAt')).reverse();
  return Promise.all(
    projects.map(async (p) => {
      const photos = await d.getAllFromIndex('photos', 'projectId', p.id);
      const newest = photos.reduce<Photo | undefined>((a, b) => (!a || b.takenAt > a.takenAt ? b : a), undefined);
      return { ...p, photoCount: photos.length, cover: newest?.thumb };
    }),
  );
}

export async function addPhoto(input: Omit<Photo, 'id' | 'note' | 'tags'> & Partial<Pick<Photo, 'note' | 'tags'>>) {
  const photo: Photo = { note: '', tags: [], ...input, id: newId() };
  const tx = (await db()).transaction(['projects', 'photos'], 'readwrite');
  const project = await tx.objectStore('projects').get(photo.projectId);
  if (!project) throw new Error(`Project ${photo.projectId} not found`);
  await Promise.all([
    tx.objectStore('photos').put(photo),
    tx.objectStore('projects').put({ ...project, updatedAt: Date.now() }),
    tx.done,
  ]);
  return photo;
}

export async function getPhoto(id: string) {
  return (await db()).get('photos', id);
}

/** A project's photos, newest first. */
export async function listPhotos(projectId: string) {
  const photos = await (await db()).getAllFromIndex('photos', 'projectId', projectId);
  return photos.sort((a, b) => b.takenAt - a.takenAt);
}

/** Newest photos across all projects. */
export async function listRecentPhotos(limit = 60) {
  const d = await db();
  const out: Photo[] = [];
  let cursor = await d.transaction('photos').store.index('takenAt').openCursor(null, 'prev');
  while (cursor && out.length < limit) {
    out.push(cursor.value);
    cursor = await cursor.continue();
  }
  return out;
}

export async function updatePhoto(id: string, changes: Partial<Pick<Photo, 'note' | 'tags' | 'annotated' | 'thumb'>>) {
  const d = await db();
  const current = await d.get('photos', id);
  if (!current) throw new Error(`Photo ${id} not found`);
  const next = { ...current, ...changes };
  await d.put('photos', next);
  return next;
}

export async function deletePhoto(id: string) {
  await (await db()).delete('photos', id);
}
