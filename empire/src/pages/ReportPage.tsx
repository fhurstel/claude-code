import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProject, listPhotos, type Photo } from '../db';
import { formatCoords, formatStamp } from '../format';
import { useAsync, useObjectUrl } from '../hooks';
import { TopBar } from '../components/Layout';

function ReportPhoto({ photo, index }: { photo: Photo; index: number }) {
  const url = useObjectUrl(photo.annotated ?? photo.image);
  return (
    <article className="report-photo">
      {url && <img src={url} alt={photo.note || `Photo ${index}`} />}
      <div className="report-caption">
        <strong>
          {index}. {formatStamp(photo.takenAt)}
        </strong>
        {photo.lat != null && <span className="muted small"> · {formatCoords(photo.lat, photo.lng)}</span>}
        {photo.note && <p>{photo.note}</p>}
        {photo.tags.length > 0 && <p className="muted small">{photo.tags.map((t) => `#${t}`).join(' ')}</p>}
      </div>
    </article>
  );
}

function PickThumb({ photo, selected, onToggle }: { photo: Photo; selected: boolean; onToggle: () => void }) {
  const url = useObjectUrl(photo.thumb);
  return (
    <button className={`pick ${selected ? 'picked' : ''}`} aria-pressed={selected} onClick={onToggle}>
      {url && <img src={url} alt="" />}
      <span className="check" aria-hidden>
        {selected ? '✓' : ''}
      </span>
    </button>
  );
}

export function ReportPage() {
  const { id = '' } = useParams();
  const { data } = useAsync(async () => ({ project: await getProject(id), photos: await listPhotos(id) }), [id]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('Job Site Report');
  const [preparedBy, setPreparedBy] = useState(() => {
    try {
      return localStorage.getItem('empire.preparedBy') ?? '';
    } catch {
      return '';
    }
  });
  const [summary, setSummary] = useState('');
  const [oldestFirst, setOldestFirst] = useState(true);

  useEffect(() => {
    if (data) setSelected(new Set(data.photos.map((p) => p.id)));
  }, [data]);

  if (!data?.project) return <TopBar title="Report" back />;
  const { project } = data;
  const chosen = data.photos.filter((p) => selected.has(p.id));
  if (oldestFirst) chosen.reverse();

  const toggle = (pid: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (!next.delete(pid)) next.add(pid);
      return next;
    });

  function print() {
    try {
      localStorage.setItem('empire.preparedBy', preparedBy);
    } catch {
      /* storage unavailable; not essential */
    }
    window.print();
  }

  return (
    <>
      <div className="no-print">
        <TopBar title="Build report" back={`/projects/${id}`} />
        <main className="page">
          <div className="form">
            <label>
              Report title
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label>
              Prepared by
              <input value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} placeholder="Your name / company" />
            </label>
            <label>
              Summary
              <textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Work completed, issues found, next steps…" />
            </label>
            <label className="check-row">
              <input type="checkbox" checked={oldestFirst} onChange={(e) => setOldestFirst(e.target.checked)} />
              Oldest photos first
            </label>
          </div>
          <div className="row between">
            <h2 className="day-label">
              Photos <span className="muted small">· {selected.size} of {data.photos.length}</span>
            </h2>
            <button
              className="btn btn-sm"
              onClick={() => setSelected(selected.size ? new Set() : new Set(data.photos.map((p) => p.id)))}
            >
              {selected.size ? 'Select none' : 'Select all'}
            </button>
          </div>
          <div className="grid">
            {data.photos.map((p) => (
              <PickThumb key={p.id} photo={p} selected={selected.has(p.id)} onToggle={() => toggle(p.id)} />
            ))}
          </div>
          <button className="btn btn-primary btn-block sticky-bottom" onClick={print} disabled={!chosen.length}>
            📄 Save as PDF / Print
          </button>
          <h2 className="day-label">Preview</h2>
        </main>
      </div>

      <section className="report" data-testid="report">
        <header className="report-head">
          <h1>{title}</h1>
          <h2>{project.name}</h2>
          {project.address && <p>{project.address}</p>}
          {project.client && <p>Client: {project.client}</p>}
          <p className="muted small">
            {preparedBy && `Prepared by ${preparedBy} · `}
            {new Date().toLocaleDateString(undefined, { dateStyle: 'long' })} · {chosen.length} photo
            {chosen.length === 1 ? '' : 's'}
          </p>
          {summary && <p className="report-summary">{summary}</p>}
        </header>
        {chosen.map((p, i) => (
          <ReportPhoto key={p.id} photo={p} index={i + 1} />
        ))}
      </section>
    </>
  );
}
