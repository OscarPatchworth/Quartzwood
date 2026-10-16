import { Outlet, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import EntityPage from './pages/EntityPage'
import GroupPage from './pages/GroupPage'
import BoxPage from './pages/BoxPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Header from './components/Header'

function Layout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/entity/:id" element={<EntityPage />} />
        <Route path="/group/:id" element={<GroupPage />} />
        <Route path="/box/:id" element={<BoxPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
    </Routes>
  )
}

export default App