import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TasksPage } from './pages/TasksPage.tsx'

const isTasksRoute = window.location.pathname === '/agent/tasks';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isTasksRoute ? <TasksPage /> : <App />}
  </StrictMode>,
)
