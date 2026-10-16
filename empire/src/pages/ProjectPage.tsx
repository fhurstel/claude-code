import { useRef, useState, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addPhoto, getProject, listPhotos } from '../db';
import { currentPosition, processImage } from '../media';
import { groupByDay, mapsUrl } from '../format';
import { useAsync } from '../hooks';
import { TopBar } from '../components/Layout';
import { Thumb } from '../components/Thumb';

export function ProjectPage() {
  const { id = '' } = useParams();
  const { data, loading, reload } = useAsync(
    async () => ({ project: await getProject(id), photos: await listPhotos(id) }),
    [id],
  );
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [error, setError] = useState('');

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = '';
    if (!files.length) return;
    setError('');
    setProgress({ done: 0, total: files.length });
    const pos = await currentPosition();
    let failed = 0;
    for (const [i, file] of files.entries()) {
      try {
        const { image, thumb } = await processImage(file);
        await addPhoto({ projectId: id, image, thumb, takenAt: file.lastModified || Date.now(), ...pos });
      } catch {
        failed++;
      }
      setProgress({ done: i + 1, total: files.length });
    }
    setProgress(undefined);
    if (failed) setError(`${failed} file${failed === 1 ? '' : 's'} could not be read as an image.`);
    reload();
  }

  if (loading && !data) return <TopBar title="" back="/" />;
  const project = data?.project;
  if (!project)
    return (
      <>
        <TopBar title="Not found" back="/" />
        <main className="page">
          <p>This project doesn’t exist anymore.</p>
        </main>
      </>
    );

  const photos = data.photos;
  return (
    <>
      <TopBar
        title={project.name}
        back="/"
        actions={
          <Link to={`/projects/${id}/edit`} className="btn btn-sm" aria-label="Edit project">
            Edit
          </Link>
        }
      />
      <main className="page page-with-fab">
        <section className="project-head">
          {project.address && <p>{project.address}</p>}
          {project.client && <p className="muted">Client: {project.client}</p>}
          <div className="row wrap">
            {(project.address || project.lat != null) && (
              <a className="btn btn-sm" href={mapsUrl(project)} target="_blank" rel="noreferrer">
                🗺 Directions
              </a>
            )}
            <button className="btn btn-sm" onClick={() => uploadRef.current?.click()}>
              ⤒ Upload
            </button>
            {photos.length > 0 && (
              <Link className="btn btn-sm" to={`/projects/${id}/report`}>
                📄 Report
              </Link>
            )}
          </div>
        </section>

        {progress && (
          <div className="banner" role="status">
            Saving photos… {progress.done}/{progress.total}
          </div>
        )}
        {error && (
          <div className="banner banner-error" role="alert">
            {error}
          </div>
        )}

        {photos.length === 0 && !progress && (
          <div className="empty">
            <p className="empty-icon" aria-hidden>
              📸
            </p>
            <h2>No photos yet</h2>
            <p className="muted">Tap the camera to document this job. Photos are stamped with time and location.</p>
          </div>
        )}

        {groupByDay(photos).map((g) => (
          <section key={g.day} className="day">
            <h2 className="day-label">
              {g.label} <span className="muted small">· {g.photos.length}</span>
            </h2>
            <div className="grid">
              {g.photos.map((p) => (
                <Thumb key={p.id} photo={p} />
              ))}
            </div>
          </section>
        ))}
      </main>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFiles} data-testid="camera-input" />
      <input ref={uploadRef} type="file" accept="image/*" multiple hidden onChange={onFiles} data-testid="upload-input" />
      <button className="fab" aria-label="Take photo" onClick={() => cameraRef.current?.click()} disabled={!!progress}>
        📷
      </button>
    </>
  );
}
