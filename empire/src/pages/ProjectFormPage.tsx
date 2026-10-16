import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createProject, deleteProject, getProject, updateProject } from '../db';
import { currentPosition } from '../media';
import { formatCoords } from '../format';
import { TopBar } from '../components/Layout';

export function ProjectFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', address: '', client: '' });
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  useEffect(() => {
    if (!id) return;
    getProject(id).then((p) => {
      if (!p) return navigate('/', { replace: true });
      setForm({ name: p.name, address: p.address, client: p.client });
      setCoords({ lat: p.lat, lng: p.lng });
    });
  }, [id, navigate]);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function locate() {
    setLocating(true);
    setLocError('');
    const pos = await currentPosition(0);
    setLocating(false);
    if (pos) setCoords(pos);
    else setLocError('Location unavailable. Check location permission.');
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const data = { name: form.name.trim(), address: form.address.trim(), client: form.client.trim(), ...coords };
    if (!data.name) return;
    const project = id ? await updateProject(id, data) : await createProject(data);
    navigate(`/projects/${project.id}`, { replace: true });
  }

  async function remove() {
    if (!id || !confirm('Delete this project and all of its photos? This cannot be undone.')) return;
    await deleteProject(id);
    navigate('/', { replace: true });
  }

  return (
    <>
      <TopBar title={id ? 'Edit project' : 'New project'} back />
      <main className="page">
        <form className="form" onSubmit={submit}>
          <label>
            Project name
            <input required autoFocus={!id} value={form.name} onChange={set('name')} placeholder="Smith Roof Replacement" />
          </label>
          <label>
            Address
            <input value={form.address} onChange={set('address')} placeholder="123 Main St, Austin TX" autoComplete="street-address" />
          </label>
          <label>
            Client
            <input value={form.client} onChange={set('client')} placeholder="Jane Smith" />
          </label>
          <div className="field">
            <span>Job site location</span>
            <div className="row">
              <button type="button" className="btn" onClick={locate} disabled={locating}>
                {locating ? 'Locating…' : '📍 Use my location'}
              </button>
              <span className="muted small" data-testid="coords">
                {formatCoords(coords.lat, coords.lng)}
              </span>
            </div>
            {locError && <span className="error small">{locError}</span>}
          </div>
          <button className="btn btn-primary btn-block" type="submit">
            {id ? 'Save changes' : 'Create project'}
          </button>
          {id && (
            <button type="button" className="btn btn-danger btn-block" onClick={remove}>
              Delete project
            </button>
          )}
        </form>
      </main>
    </>
  );
}
