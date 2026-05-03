import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import Layout from './components/common/Layout'
import ProtectedRoute from './components/common/ProtectedRoute'

// Auth pages
import Connexion   from './pages/auth/Connexion'
import Inscription from './pages/auth/Inscription'
import MotDePasseOublie from './pages/auth/MotDePasseOublie'

// Shared pages
import Profil         from './pages/Profil'
import Notifications  from './pages/Notifications'
import NotFound       from './pages/NotFound'

// Client pages
import DashboardClient   from './pages/client/DashboardClient'
import Techniciens       from './pages/client/Techniciens'
import TechnicienDetail  from './pages/client/TechnicienDetail'
import CreerDemande      from './pages/client/CreerDemande'
import MesDemandes       from './pages/client/MesDemandes'
import DetailDemande     from './pages/client/DetailDemande'
import MesPaiements      from './pages/client/MesPaiements'
import PaiementSucces    from './pages/client/PaiementSucces'

// Technicien pages
import DashboardTechnicien  from './pages/technicien/DashboardTechnicien'
import CreerProfil          from './pages/technicien/CreerProfil'
import MonProfil            from './pages/technicien/MonProfil'
import DemandesDisponibles  from './pages/technicien/DemandesDisponibles'
import MesMissions          from './pages/technicien/MesMissions'
import Revenus              from './pages/technicien/Revenus'

// Admin pages
import DashboardAdmin        from './pages/admin/DashboardAdmin'
import Utilisateurs          from './pages/admin/Utilisateurs'
import CategoriesAdmin       from './pages/admin/CategoriesAdmin'
import TechniciensEnAttente  from './pages/admin/TechniciensEnAttente'
import ToutesLesDemandes     from './pages/admin/ToutesLesDemandes'
import RapportFinancier      from './pages/admin/RapportFinancier'

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Layout>
          <Routes>
            {/* Public */}
            <Route path="/"            element={<Navigate to="/connexion" replace />} />
            <Route path="/connexion"   element={<Connexion />} />
            <Route path="/inscription" element={<Inscription />} />
            <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />

            {/* Shared (any authenticated role) */}
            <Route element={<ProtectedRoute roles={['client', 'technicien', 'admin']} />}>
              <Route path="/profil"        element={<Profil />} />
              <Route path="/notifications" element={<Notifications />} />
            </Route>

            {/* Client routes */}
            <Route element={<ProtectedRoute roles={['client']} />}>
              <Route path="/client/dashboard"         element={<DashboardClient />} />
              <Route path="/client/techniciens"       element={<Techniciens />} />
              <Route path="/client/techniciens/:id"   element={<TechnicienDetail />} />
              <Route path="/client/demandes/creer"    element={<CreerDemande />} />
              <Route path="/client/demandes"          element={<MesDemandes />} />
              <Route path="/client/demandes/:id"      element={<DetailDemande />} />
              <Route path="/client/paiements"         element={<MesPaiements />} />
              <Route path="/paiement/succes"          element={<PaiementSucces />} />
            </Route>

            {/* Technicien routes */}
            <Route element={<ProtectedRoute roles={['technicien']} />}>
              <Route path="/technicien/dashboard"    element={<DashboardTechnicien />} />
              <Route path="/technicien/profil/creer" element={<CreerProfil />} />
              <Route path="/technicien/profil"       element={<MonProfil />} />
              <Route path="/technicien/disponibles"  element={<DemandesDisponibles />} />
              <Route path="/technicien/missions"     element={<MesMissions />} />
              <Route path="/technicien/missions/:id" element={<MesMissions />} />
              <Route path="/technicien/revenus"      element={<Revenus />} />
            </Route>

            {/* Admin routes */}
            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="/admin/dashboard"    element={<DashboardAdmin />} />
              <Route path="/admin/utilisateurs" element={<Utilisateurs />} />
              <Route path="/admin/categories"   element={<CategoriesAdmin />} />
              <Route path="/admin/techniciens"  element={<TechniciensEnAttente />} />
              <Route path="/admin/demandes"     element={<ToutesLesDemandes />} />
              <Route path="/admin/finances"     element={<RapportFinancier />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </NotificationProvider>
    </AuthProvider>
  )
}

/* ---- end of App ---- */
function _Unused() {
  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}
