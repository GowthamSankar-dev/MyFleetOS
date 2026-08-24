import { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Activity, Navigation, Plus, X, QrCode, Copy, Check, LogOut, User as UserIcon, AlertCircle, Menu, Settings, Moon, Sun, Bell, LayoutDashboard, Truck } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { getAvatarUrl, fetchPairingRequests } from '../api/fleetApi'
import { useTheme } from '../context/ThemeContext'
import SettingsModal from './SettingsModal'
import { motion, AnimatePresence } from 'framer-motion'

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : 'http://localhost:8000')
).replace(/\/$/, '')

// The backend host — live Render public backend
// Removed BACKEND_HOST since URLs should now point to frontend

/**
 * TopBar — shows page title, last update time, Connect GPS button,
 *          and user profile chip in the top right.
 */
export default function TopBar({ title, lastMessage, onToggleMobileMenu, hideSeparator }) {
  const [showQr, setShowQr] = useState(false)
  const [showLoginNotice, setShowLoginNotice] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  
  // Notifications state
  const [notifications, setNotifications] = useState([])
  const [activeToasts, setActiveToasts] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  
  const { user, logout } = useAuth()
  const { isDarkMode, toggleTheme } = useTheme()

  // Reset avatar error when user changes
  useEffect(() => {
    setAvatarError(false)
  }, [user?.avatar_url])

  // Poll for pairing requests
  useEffect(() => {
    if (!user || user.role === 'driver') return
    const load = async () => {
      try {
        const requests = await fetchPairingRequests('pending')
        setNotifications(prev => {
          // Keep non-pair notifications
          const otherNotifs = prev.filter(n => n.type !== 'pair')
          // Map pending requests to notifications
          const pairNotifs = requests.map(req => ({
            id: `pair_${req.id}`,
            type: 'pair',
            text: `Pair request from ${req.device_id}`,
            time: req.created_at,
            read: false
          }))
          return [...pairNotifs, ...otherNotifs].sort((a, b) => new Date(b.time) - new Date(a.time))
        })
      } catch { /* ignore */ }
    }
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [user])

  // Listen for geofence alerts
  useEffect(() => {
    if (!lastMessage || !user || user.role === 'driver') return
    if (lastMessage.event === 'geofence_alert') {
      const newAlert = {
        id: `alert_${Date.now()}_${Math.random()}`,
        type: 'alert',
        text: lastMessage.message || `${lastMessage.vehicle_name} left zone ${lastMessage.zone_name}`,
        time: lastMessage.timestamp || new Date().toISOString(),
        read: false
      }
      setNotifications(prev => [newAlert, ...prev].slice(0, 50)) // keep last 50
      
      // Add to toasts (prevent duplicates)
      setActiveToasts(prev => {
        if (prev.some(t => t.text === newAlert.text)) return prev
        return [...prev, newAlert]
      })
      
      // Auto-remove toast after 5s
      setTimeout(() => {
        setActiveToasts(prev => prev.filter(t => t.id !== newAlert.id))
      }, 5000)
    }
  }, [lastMessage, user])

  // Update unread count
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length)
  }, [notifications])

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const lastTime = lastMessage?.timestamp
    ? format(new Date(lastMessage.timestamp), 'HH:mm:ss')
    : null

  // Build the GPS URL with the user's account code to point to the frontend `/gps` route
  const accountCode = user?.account_code || ''
  const GPS_URL = accountCode
    ? `${window.location.origin}/gps?code=${accountCode}`
    : `${window.location.origin}/gps`

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(GPS_URL)}&bgcolor=ffffff&color=0f172a&margin=10`

  const handleConnectClick = () => {
    if (!user) {
      setShowLoginNotice(true)
    } else {
      setShowQr(true)
    }
  }

  const copyCode = () => {
    if (accountCode) {
      navigator.clipboard.writeText(accountCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const copyUrl = () => {
    if (GPS_URL) {
      navigator.clipboard.writeText(GPS_URL)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    }
  }

  return (
    <>
      <header className="relative flex items-center justify-between px-3.5 py-2.5 md:p-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 transition-colors">
        {/* Left Section (Map width) */}
        <div className={`flex items-center justify-between md:flex-1 md:px-6 md:py-3.5 ${hideSeparator ? '' : 'md:border-r border-slate-200 dark:border-slate-800'}`}>
          <div className="flex items-center gap-3 md:flex-1">
            {/* Mobile Menu Button */}
            {onToggleMobileMenu && (
              <button
                onClick={onToggleMobileMenu}
                className="md:hidden p-1.5 rounded text-slate-600 dark:text-[#17b385] hover:text-slate-900 dark:hover:text-[#14a076] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Open Navigation"
              >
                <Menu size={20} />
              </button>
            )}

            {/* Logo */}
            <div className="flex items-center gap-1 md:gap-1.5 shrink-0 transition-colors">
              <img src="/logo.png" alt="myfleetOS icon" className="h-7 md:h-8 object-contain" />
              <span className="font-bold text-lg md:text-xl tracking-tight text-[#06375d] dark:text-[#14a076]">
                MyFleetOS
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          {user?.role !== 'driver' && (
            <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 items-center gap-2 justify-center shrink-0 z-10">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-4 py-1.5 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'text-brand-primary dark:text-[#17b385] [text-shadow:0_0_12px_rgba(6,53,93,0.5)] dark:[text-shadow:0_0_12px_rgba(23,179,133,0.6)]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <span>Dashboard</span>
              </NavLink>
              <NavLink
                to="/vehicles"
                className={({ isActive }) =>
                  `px-4 py-1.5 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'text-brand-primary dark:text-[#17b385] [text-shadow:0_0_12px_rgba(6,53,93,0.5)] dark:[text-shadow:0_0_12px_rgba(23,179,133,0.6)]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <span>Vehicles</span>
              </NavLink>
            </nav>
          )}
          
          {/* Empty spacer to keep nav perfectly centered */}
          <div className="hidden md:block flex-1" />
        </div>

        {/* Right Section (Sidebar width) */}
        <div className="flex items-center justify-end md:w-80 shrink-0 md:px-6 md:py-3.5 gap-2 md:gap-4">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notifications Button */}
          {user?.role !== 'driver' && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications)
                  setShowProfileMenu(false)
                  if (!showNotifications) markAllAsRead()
                }}
                className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative"
                title="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>
              
              {showNotifications && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="fixed top-16 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] sm:absolute sm:top-full sm:left-auto sm:right-0 sm:translate-x-0 mt-2 sm:w-80 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1 animate-fade-in flex flex-col max-h-[80vh]">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h3>
                      {notifications.length > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-[11px] font-medium text-brand-primary dark:text-[#17b385] hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                          <Bell size={24} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                          {notifications.map((n) => (
                            <div key={n.id} className={`p-3 md:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!n.read ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
                              <div className="flex gap-3">
                                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
                                  n.type === 'pair' 
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500' 
                                    : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-500'
                                }`}>
                                  {n.type === 'pair' ? <Navigation size={14} /> : <AlertCircle size={14} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-slate-900 dark:text-slate-200 font-medium leading-snug">
                                    {n.text}
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                    {format(new Date(n.time), 'MMM d, h:mm a')}
                                  </p>
                                  {n.type === 'pair' && (
                                    <Link 
                                      to="/vehicles" 
                                      onClick={() => setShowNotifications(false)}
                                      className="inline-block mt-2 text-[11px] font-semibold text-brand-primary dark:text-[#17b385] hover:underline"
                                    >
                                      Go to Vehicles to approve →
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Connect GPS button */}
          {user?.role !== 'driver' && (
            <button
              id="connect-phone-btn"
              onClick={handleConnectClick}
              className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-1.5 rounded text-xs font-semibold
                         bg-brand-primary dark:bg-[#17b385] text-white hover:bg-brand-primary/90 dark:hover:bg-[#14a076] transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Plus size={16} className="sm:w-[13px] sm:h-[13px] shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Connect GPS</span>
            </button>
          )}

          {/* User Profile / Login (Rightmost Top Bar) */}
          <div className="pl-2 md:pl-3 relative">
            {user ? (
              <>
                <button
                  onClick={() => {
                    setShowProfileMenu(!showProfileMenu)
                    setShowNotifications(false)
                  }}
                  className="flex items-center p-1 -m-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-brand-primary/20 dark:bg-[#17b385]/20 text-brand-primary dark:text-[#17b385] flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden ring-2 ring-transparent hover:ring-brand-primary/30 dark:hover:ring-[#17b385]/30 transition-all">
                    {user.avatar_url && !avatarError ? (
                      <img 
                        src={getAvatarUrl(user.avatar_url)} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      user.full_name ? user.full_name[0].toUpperCase() : 'U'
                    )}
                  </div>
                </button>

                {showProfileMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1 animate-fade-in">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 mb-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.full_name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false)
                          setShowSettings(true)
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                      >
                        <Settings size={15} />
                        <span className="font-medium">Account Settings</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false)
                          setShowLogoutConfirm(true)
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                      >
                        <LogOut size={15} />
                        <span className="font-medium">Sign Out</span>
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors"
              >
                <UserIcon size={14} />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Login Required Warning Modal ─────────────────────────────────── */}
      {showLoginNotice && (
        <div
          id="login-notice-backdrop"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={(e) => e.target.id === 'login-notice-backdrop' && setShowLoginNotice(false)}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center gap-4 text-center shadow-xl rounded max-w-xs w-full animate-fade-in transition-colors relative">
            <button
              onClick={() => setShowLoginNotice(false)}
              className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Sign In Required</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Please log in to your account first to generate your pairing code and connect GPS devices.
              </p>
            </div>
            <Link
              to="/login"
              onClick={() => setShowLoginNotice(false)}
              className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold text-xs rounded shadow-sm transition-colors text-center"
            >
              Sign In to Your Account
            </Link>
          </div>
        </div>
      )}

      {/* ── QR / Account Code Modal ──────────────────────────────────────── */}
      {showQr && (
        <div
          id="qr-modal-backdrop"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={(e) => e.target.id === 'qr-modal-backdrop' && setShowQr(false)}
        >
          <div
            className="relative bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center gap-4 shadow-xl max-w-sm w-full animate-fade-in transition-colors"
          >
            {/* Close button */}
            <button
              id="qr-close-btn"
              onClick={() => setShowQr(false)}
              className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <QrCode size={20} className="text-brand-primary dark:text-[#17b385]" />
              <span className="text-sm font-bold tracking-tight">Connect GPS Tracker</span>
            </div>

            {/* Account Code — prominent display */}
            {accountCode && (
              <div className="w-full bg-brand-primary/10 dark:bg-[#17b385]/10 border border-brand-primary/30 dark:border-[#17b385]/30 rounded p-4 text-center transition-colors">
                <p className="text-[10px] text-brand-primary/80 dark:text-[#17b385]/80 font-bold uppercase tracking-wider mb-1">Your Account Code</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl font-bold font-mono text-brand-primary dark:text-[#17b385] tracking-widest">{accountCode}</p>
                  <button
                    onClick={copyCode}
                    className="p-1.5 rounded bg-white dark:bg-slate-800 border border-brand-primary/30 dark:border-[#17b385]/30 text-brand-primary dark:text-[#17b385] hover:bg-brand-primary/20 dark:hover:bg-[#17b385]/20
                               transition-colors cursor-pointer"
                    title="Copy code"
                  >
                    {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-brand-primary/60 dark:text-[#17b385]/60 mt-1.5">Share this code or scan QR below</p>
              </div>
            )}

            {/* QR Code */}
            <div
              className="rounded overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-inner transition-colors"
            >
              <img
                src={qrSrc}
                alt="GPS Sender QR Code"
                width={200}
                height={200}
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              <div style={{ display: 'none' }} className="w-[200px] h-[200px] items-center justify-center text-xs text-slate-500 text-center p-4">
                Type URL manually into your phone
              </div>
            </div>

            {/* URL with Copy Button */}
            <div className="text-center w-full">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Or open this link on your phone:</p>
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 p-1.5 rounded border border-slate-200 dark:border-slate-800 transition-colors">
                <a
                  href={GPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-brand-primary dark:text-[#17b385] hover:underline truncate flex-1 text-left px-1"
                  title={GPS_URL}
                >
                  {GPS_URL}
                </a>
                <button
                  onClick={copyUrl}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300
                             hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-medium transition-colors cursor-pointer shrink-0"
                  title="Copy link"
                >
                  {copiedUrl ? (
                    <>
                      <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Logout Confirmation Modal ────────────────────────────────────── */}
      {showLogoutConfirm && (
        <div
          id="logout-confirm-backdrop"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4 animate-fade-in"
          onClick={(e) => e.target.id === 'logout-confirm-backdrop' && setShowLogoutConfirm(false)}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center gap-4 text-center shadow-xl rounded max-w-xs w-full animate-fade-in transition-colors">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-500 flex items-center justify-center">
              <LogOut size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Sign Out</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Are you sure you want to sign out of your account?</p>
            </div>
            <div className="flex w-full gap-3 mt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false)
                  logout()
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded shadow-sm transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal ─────────────────────────────────────────────── */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      
      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {activeToasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 dark:bg-slate-800 text-white shadow-xl rounded px-4 py-3 min-w-[280px] max-w-sm border border-slate-700 pointer-events-auto flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
                <Bell size={16} className="animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white mb-0.5">Geofence Alert</h4>
                <p className="text-xs text-slate-300 leading-relaxed break-words">{toast.text}</p>
              </div>
              <button 
                onClick={() => setActiveToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}
