// Standalone review artifact only; the deployed app uses main.tsx and AuthRoutes.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { EducationWorkspace } from './ui/workspace/EducationWorkspace'
import './index.css'

createRoot(document.getElementById('root')!).render(<StrictMode><EducationWorkspace /></StrictMode>)
