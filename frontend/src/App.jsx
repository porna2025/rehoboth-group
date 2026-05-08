import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import Layout from './components/common/Layout'
import ProtectedRoute from './components/common/ProtectedRoute'
import Spinner from './components/common/Spinner'

const Connexion = lazy(() => import('./pages/auth/Connexion'))
const Inscription = lazy(() => import('./pages/auth/Inscription'))
const MotDePasseOublie = lazy(() => import('./pages/auth/MotDePasseOublie'))

const Profil = lazy(() => import('./pages/Profil'))
const Notifications = lazy(() => import('./pages/Notifications'))
const NotFound = lazy(() => import('./pages/NotFound'))

const DashboardClient = lazy(() => import('./pages/client/DashboardClient'))
const Techniciens = lazy(() => import('./pages/client/Techniciens'))
const TechnicienDetail = lazy(() => import('./pages/client/TechnicienDetail'))
const CreerDemande = lazy(() => import('./pages/client/CreerDemande'))
const MesDemandes = lazy(() => import('./pages/client/MesDemandes'))
const DetailDemande = lazy(() => import('./pages/client/DetailDemande'))
const MesPaiements = lazy(() => import('./pages/client/MesPaiements'))
const PaiementSucces = lazy(() => import('./pages/client/PaiementSucces'))

const DashboardTechnicien = lazy(() => import('./pages/technicien/DashboardTechnicien'))
const CreerProfil = lazy(() => import('./pages/technicien/CreerProfil'))
const MonProfil = lazy(() => import('./pages/technicien/MonProfil'))
const DemandesDisponibles = lazy(() => import('./pages/technicien/DemandesDisponibles'))
const MesMissions = lazy(() => import('./pages/technicien/MesMissions'))
const Revenus = lazy(() => import('./pages/technicien/Revenus'))

const DashboardAdmin = lazy(() => import('./pages/admin/DashboardAdmin'))
const Utilisateurs = lazy(() => import('./pages/admin/Utilisateurs'))
const CategoriesAdmin = lazy(() => import('./pages/admin/CategoriesAdmin'))
const TechniciensEnAttente = lazy(() => import('./pages/admin/TechniciensEnAttente'))
const ToutesLesDemandes = lazy(() => import('./pages/admin/ToutesLesDemandes'))
const RapportFinancier = lazy(() => import('./pages/admin/RapportFinancier'))

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Layout>
          <Suspense fallback={<Spinner fullPage />}>
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
          </Suspense>
        </Layout>
      </NotificationProvider>
    </AuthProvider>
  )
}
