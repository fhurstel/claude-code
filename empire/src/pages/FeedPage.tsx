import { listProjects, listRecentPhotos } from '../db';
import { groupByDay } from '../format';
import { useAsync } from '../hooks';
import { TabBar, TopBar } from '../components/Layout';
import { Thumb } from '../components/Thumb';

export function FeedPage() {
  const { data, loading } = useAsync(async () => {
    const [photos, projects] = await Promise.all([listRecentPhotos(120), listProjects()]);
    return { photos, names: new Map(projects.map((p) => [p.id, p.name])) };
  }, []);

  return (
    <>
      <TopBar title="Recent activity" />
      <main className="page">
        {!loading && data?.photos.length === 0 && (
          <div className="empty">
            <p className="empty-icon" aria-hidden>
              ◷
            </p>
            <h2>Nothing yet</h2>
            <p className="muted">Photos from every project show up here as you take them.</p>
          </div>
        )}
        {data &&
          groupByDay(data.photos).map((g) => (
            <section key={g.day} className="day">
              <h2 className="day-label">{g.label}</h2>
              <div className="grid">
                {g.photos.map((p) => (
                  <Thumb key={p.id} photo={p} caption={data.names.get(p.projectId)} />
                ))}
              </div>
            </section>
          ))}
      </main>
      <TabBar />
    </>
  );
}
