import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'

export default function Layout({ children }) {
  const { user } = useAuth()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        {user && <Sidebar />}
        <main style={{
          flex:      1,
          padding:   '1.5rem',
          minWidth:  0,
          animation: 'fadeIn 0.25s ease',
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}
