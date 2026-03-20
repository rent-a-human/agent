import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TasksPage } from './pages/TasksPage.tsx'
import { ModelViewerPage } from './pages/ModelViewerPage.tsx'
import { LibraryPage } from './pages/LibraryPage.tsx'
import { CreatePage } from './pages/CreatePage.tsx'
import { AssemblyPage } from './pages/AssemblyPage.tsx'

const isTasksRoute = window.location.pathname === '/agent/tasks';
const isLibraryRoute = window.location.pathname.startsWith('/agent/cad/models/library/');
const isCreateRoute = window.location.pathname === '/agent/cad/create';
const isAssemblyRoute = window.location.pathname === '/agent/cad/assembly';
const isModelRoute = window.location.pathname.startsWith('/agent/cad/models/') && !isLibraryRoute && !isCreateRoute && !isAssemblyRoute;

const partId = isModelRoute ? window.location.pathname.split('/').pop() || null : null;
const libraryType = isLibraryRoute ? window.location.pathname.split('/').filter(Boolean).pop() || null : null;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isTasksRoute ? (
      <TasksPage />
    ) : isLibraryRoute ? (
      <LibraryPage type={libraryType} />
    ) : isAssemblyRoute ? (
      <AssemblyPage />
    ) : isModelRoute ? (
      <ModelViewerPage partId={partId} />
    ) : isCreateRoute ? (
      <CreatePage />
    ) : (
      <App />
    )}
  </StrictMode>,
)
