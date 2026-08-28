import { useState, useCallback } from 'react'
import { Routes, Route, useLocation, Outlet, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Dashboard from './pages/Dashboard'
import Vehicles from './pages/Vehicles'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ShareView from './pages/ShareView'
import GPSSender from './pages/GPSSender'
import Landing from './pages/Landing'
import AuthLayout from './components/AuthLayout'
import { useWebSocket } from './hooks/useWebSocket'
import { useVehicles } from './hooks/useVehicles'
import { useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import GlobeLoader from './components/GlobeLoader'

/**
 * App — root component with full authentication & route configuration.
 */
export default function App() {
  const { user, isLoading: authLoading } = useAuth()
  const { lastMessage, isConnected, reconnect } = useWebSocket()
  const { vehicles, locations, locationHistory, isLoading, error, refresh } = useVehicles(lastMessage)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Wrapper to manually resync both REST API and WebSocket when the user clicks Refresh
  const handleRefresh = useCallback(() => {
    refresh()
    if (reconnect) reconnect()
  }, [refresh, reconnect])

  const location = useLocation()

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-950 flex flex-col items-center justify-center z-[9999] transition-colors">
        <GlobeLoader className="w-16 h-16 mb-6 opacity-80" />
        <h1 className="text-2xl font-bold tracking-tight mb-2 text-[#06375d] dark:text-[#14a076]">ShowMyFleet</h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Starting engine...</p>
      </div>
    )
  }

  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  const getPageTitle = (pathname) => {
    if (pathname.startsWith('/vehicles')) return 'Vehicles & Devices'
    if (pathname.startsWith('/requests')) return 'Pairing Requests'
    if (pathname.startsWith('/gps')) return 'GPS Sender'
    if (pathname.startsWith('/geofences')) return 'Geofences'
    return 'Live Map'
  }

  return (
    <Routes>
      {/* Public Share View */}
      <Route path="/share/:shareCode" element={<ShareView />} />

      {/* Main Dashboard Layout */}
      <Route
        path="/*"
        element={
          !user ? (
            <Routes>
              <Route element={<AuthLayout />}>
                <Route index element={<Landing />} />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          ) : user.role === 'driver' ? (
            <div className="flex flex-col fixed inset-0 overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors">
              <TopBar
                title="GPS Sender"
                isConnected={isConnected}
                lastMessage={lastMessage}
                hideSeparator={true}
              />
              <main className="flex flex-col flex-1 overflow-y-auto relative min-h-0">
                <Routes location={location} key={location.pathname}>
                  <Route path="gps" element={<GPSSender />} />
                  <Route path="*" element={<Navigate to="/gps" replace />} />
                </Routes>
              </main>
            </div>
          ) : (
            <div className="flex fixed inset-0 overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors">
              <Sidebar
                isConnected={isConnected}
                vehicleCount={vehicles.length}
                isOpen={isMobileMenuOpen}
                onClose={closeMobileMenu}
              />

              <main className="flex flex-col flex-1 min-w-0 min-h-0">
                {error && (
                  <div className="px-4 md:px-6 py-2 bg-rose-100 border-b border-rose-200 text-rose-700 text-xs font-medium">
                    ⚠ {error}
                  </div>
                )}

                <TopBar
                  title={getPageTitle(location.pathname)}
                  isConnected={isConnected}
                  lastMessage={lastMessage}
                  onVehicleAdded={handleRefresh}
                  onToggleMobileMenu={toggleMobileMenu}
                  hideSeparator={location.pathname.startsWith('/gps')}
                />

                <AnimatePresence mode="wait">
                  <Routes location={location} key={location.pathname}>
                    <Route
                      index
                      element={
                        <Dashboard
                          vehicles={vehicles}
                          locations={locations}
                          locationHistory={locationHistory}
                          isLoading={isLoading}
                          lastMessage={lastMessage}
                          isConnected={isConnected}
                          onRefresh={handleRefresh}
                          onToggleMobileMenu={toggleMobileMenu}
                        />
                      }
                    />
                    <Route
                      path="vehicles"
                      element={
                        <Vehicles
                          vehicles={vehicles}
                          locations={locations}
                          isLoading={isLoading}
                          isConnected={isConnected}
                          lastMessage={lastMessage}
                          onRefresh={handleRefresh}
                          onToggleMobileMenu={toggleMobileMenu}
                        />
                      }
                    />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AnimatePresence>
              </main>
            </div>
          )
        }
      />
    </Routes>
  )
}


