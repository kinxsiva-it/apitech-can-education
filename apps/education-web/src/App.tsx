import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthProvider'
import { AuthRoutes } from './app/AuthRoutes'
import './features/auth/auth.css'

export default function App() {
  return <BrowserRouter><AuthProvider><AuthRoutes /></AuthProvider></BrowserRouter>
}
