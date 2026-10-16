import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deletePhoto, getPhoto, getProject, listPhotos, updatePhoto } from '../db';
import { formatCoords, formatStamp, parseTags } from '../format';
import { makeThumb } from '../media';
import { useAsync, useObjectUrl } from '../hooks';
import { TopBar } from '../components/Layout';
import { Annotator } from '../components/Annotator';

export function PhotoPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, loading, reload } = useAsync(async () => {
    const photo = await getPhoto(id);
    if (!photo) return undefined;
    const [project, siblings] = await Promise.all([getProject(photo.projectId), listPhotos(photo.projectId)]);
    return { photo, project, siblings };
  }, [id]);
  const photo = data?.photo;
  const url = useObjectUrl(photo?.annotated ?? photo?.image);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState('');
  const [saved, setSaved] = useState(false);
  const [marking, setMarking] = useState(false);

  // Sync the editable fields only when switching photos, so reloads after a save keep unsaved edits.
  useEffect(() => {
    setNote(photo?.note ?? '');
    setTags(photo?.tags.join(', ') ?? '');
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo?.id]);

  if (loading && !data) return <TopBar title="" back />;
  if (!photo)
    return (
      <>
        <TopBar title="Photo not found" back="/" />
        <main className="page">
          <p>This photo was deleted.</p>
        </main>
      </>
    );

  const index = data.siblings.findIndex((p) => p.id === id);
  const newer = data.siblings[index - 1];
  const older = data.siblings[index + 1];
  const dirty = note !== photo.note || parseTags(tags).join() !== photo.tags.join();

  async function saveDetails() {
    await updatePhoto(id, { note: note.trim(), tags: parseTags(tags) });
    setSaved(true);
    reload();
  }

  async function saveMarkup(blob: Blob) {
    await updatePhoto(id, { annotated: blob, thumb: await makeThumb(blob) });
    setMarking(false);
    reload();
  }

  async function clearMarkup() {
    if (!photo || !confirm('Remove all markup and restore the original photo?')) return;
    await updatePhoto(id, { annotated: undefined, thumb: await makeThumb(photo.image) });
    reload();
  }

  async function share() {
    if (!photo) return;
    const file = new File([photo.annotated ?? photo.image], `empire-${photo.takenAt}.jpg`, { type: 'image/jpeg' });
    const text = [data?.project?.name, formatStamp(photo.takenAt), photo.note].filter(Boolean).join('\n');
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text }).catch(() => {});
    } else {
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(file), download: file.name });
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  }

  async function remove() {
    if (!photo || !confirm('Delete this photo?')) return;
    await deletePhoto(id);
    navigate(`/projects/${photo.projectId}`, { replace: true });
  }

  if (marking)
    return <Annotator source={photo.annotated ?? photo.image} onSave={saveMarkup} onCancel={() => setMarking(false)} />;

  return (
    <>
      <TopBar
        title={data.project?.name ?? 'Photo'}
        back={`/projects/${photo.projectId}`}
        actions={
          <button className="btn btn-sm" onClick={share}>
            Share
          </button>
        }
      />
      <main className="page photo-page">
        <figure className="photo-view">
          {url && <img src={url} alt={photo.note || 'Job site photo'} />}
          <figcaption className="stamp" data-testid="stamp">
            <span>{formatStamp(photo.takenAt)}</span>
            {photo.lat != null && <span>📍 {formatCoords(photo.lat, photo.lng)}</span>}
            {data.project?.address && <span>{data.project.address}</span>}
          </figcaption>
          {newer && (
            <Link className="nav-arrow left" to={`/photos/${newer.id}`} replace aria-label="Newer photo">
              ‹
            </Link>
          )}
          {older && (
            <Link className="nav-arrow right" to={`/photos/${older.id}`} replace aria-label="Older photo">
              ›
            </Link>
          )}
        </figure>

        <div className="row wrap">
          <button className="btn" onClick={() => setMarking(true)}>
            ✎ Mark up
          </button>
          {photo.annotated && (
            <button className="btn" onClick={clearMarkup}>
              Restore original
            </button>
          )}
          <button className="btn btn-danger" onClick={remove}>
            Delete
          </button>
        </div>

        <div className="form">
          <label>
            Notes
            <textarea
              rows={3}
              value={note}
              placeholder="What does this photo show?"
              onChange={(e) => {
                setNote(e.target.value);
                setSaved(false);
              }}
            />
          </label>
          <label>
            Tags
            <input
              value={tags}
              placeholder="before, roof, damage"
              onChange={(e) => {
                setTags(e.target.value);
                setSaved(false);
              }}
            />
          </label>
          {photo.tags.length > 0 && (
            <div className="tags">
              {photo.tags.map((t) => (
                <span key={t} className="tag">
                  #{t}
                </span>
              ))}
            </div>
          )}
          <button className="btn btn-primary btn-block" onClick={saveDetails} disabled={!dirty}>
            {saved && !dirty ? '✓ Saved' : 'Save notes'}
          </button>
        </div>
      </main>
    </>
  );
}
