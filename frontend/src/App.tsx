import { Outlet, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import EntityPage from './pages/EntityPage'
import GroupPage from './pages/GroupPage'
import BoxPage from './pages/BoxPage'
import CollectionPage from './pages/CollectionPage'
import SearchPage from './pages/SearchPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Header from './components/Header'
import { RequireAuth } from './auth/RequireAuth'

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

        {/* Logged-in only: everything here talks to [Authorize] endpoints */}
        <Route element={<RequireAuth />}>
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/entity/:id" element={<EntityPage />} />
          <Route path="/group/:id" element={<GroupPage />} />
          <Route path="/box/:id" element={<BoxPage />} />
        </Route>

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
    </Routes>
  )
}

export default App