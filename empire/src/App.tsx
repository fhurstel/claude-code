import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectFormPage } from './pages/ProjectFormPage';
import { ProjectPage } from './pages/ProjectPage';
import { PhotoPage } from './pages/PhotoPage';
import { ReportPage } from './pages/ReportPage';
import { FeedPage } from './pages/FeedPage';

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/projects/new" element={<ProjectFormPage />} />
        <Route path="/projects/:id" element={<ProjectPage />} />
        <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
        <Route path="/projects/:id/report" element={<ReportPage />} />
        <Route path="/photos/:id" element={<PhotoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
