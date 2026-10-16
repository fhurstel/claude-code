import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export function TopBar({ title, back, actions }: { title: ReactNode; back?: string | true; actions?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="topbar">
      {back ? (
        <button
          className="icon-btn"
          aria-label="Back"
          onClick={() => (back === true ? navigate(-1) : navigate(back))}
        >
          ‹
        </button>
      ) : (
        <span className="brand" aria-hidden>
          ♜
        </span>
      )}
      <h1>{title}</h1>
      <div className="topbar-actions">{actions}</div>
    </header>
  );
}

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      <NavLink to="/" end>
        <span aria-hidden>▦</span>Projects
      </NavLink>
      <NavLink to="/feed">
        <span aria-hidden>◷</span>Feed
      </NavLink>
    </nav>
  );
}
