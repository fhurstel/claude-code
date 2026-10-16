import { useState } from 'react';
import { Link } from 'react-router-dom';
import { listProjects, type ProjectSummary } from '../db';
import { useAsync, useObjectUrl } from '../hooks';
import { TabBar, TopBar } from '../components/Layout';

function ProjectCard({ project }: { project: ProjectSummary }) {
  const cover = useObjectUrl(project.cover);
  return (
    <Link to={`/projects/${project.id}`} className="card project-card">
      <div className="cover">{cover ? <img src={cover} alt="" /> : <span aria-hidden>📷</span>}</div>
      <div className="project-card-body">
        <strong>{project.name}</strong>
        {project.address && <span className="muted">{project.address}</span>}
        <span className="muted small">
          {project.photoCount} photo{project.photoCount === 1 ? '' : 's'}
          {project.client && ` · ${project.client}`}
        </span>
      </div>
    </Link>
  );
}

export function ProjectsPage() {
  const { data: projects, loading } = useAsync(listProjects, []);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = (projects ?? []).filter(
    (p) => !q || [p.name, p.address, p.client].some((f) => f.toLowerCase().includes(q)),
  );

  return (
    <>
      <TopBar
        title="Projects"
        actions={
          <Link to="/projects/new" className="btn btn-primary btn-sm">
            + New
          </Link>
        }
      />
      <main className="page">
        {projects && projects.length > 0 && (
          <input
            className="search"
            type="search"
            placeholder="Search projects, addresses, clients"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
        {!loading && projects?.length === 0 && (
          <div className="empty">
            <p className="empty-icon" aria-hidden>
              🏗️
            </p>
            <h2>Start your first project</h2>
            <p className="muted">Every job site gets a project. Snap photos, mark them up and send reports.</p>
            <Link to="/projects/new" className="btn btn-primary">
              Create project
            </Link>
          </div>
        )}
        <div className="list">
          {shown.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
        {q && shown.length === 0 && <p className="muted center">No projects match “{query}”.</p>}
      </main>
      <TabBar />
    </>
  );
}
