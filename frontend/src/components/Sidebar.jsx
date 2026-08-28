import { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Truck, Navigation, Wifi, WifiOff, Shield, X, Github, Linkedin, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchPairingRequests } from '../api/fleetApi'
import { FenceIcon } from './icons/FenceIcon'

/**
 * Sidebar — simple clean left navigation panel with mobile drawer support and device status.
 */
export default function Sidebar({ isConnected, vehicleCount, isOpen, onClose }) {
  const { user } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)

  // Poll for pending pairing requests
  useEffect(() => {
    if (!user) { setPendingCount(0); return }

    const load = async () => {
      try {
        const requests = await fetchPairingRequests('pending')
        setPendingCount(requests.length)
      } catch { /* ignore */ }
    }

    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [user])

  const prevPendingCountRef = useRef(pendingCount)

  // Play a bell sound when a new pair request is received
  useEffect(() => {
    if (pendingCount > prevPendingCountRef.current) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        const ctx = new AudioContext()
        
        // Simple 2-tone bell/chime
        const playTone = (freq, startTime, duration) => {
          const osc = ctx.createOscillator()
          const gainNode = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, startTime)
          
          gainNode.gain.setValueAtTime(0, startTime)
          gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05)
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
          
          osc.connect(gainNode)
          gainNode.connect(ctx.destination)
          
          osc.start(startTime)
          osc.stop(startTime + duration)
        }
        
        const now = ctx.currentTime
        playTone(880, now, 0.6) // A5
        playTone(1108.73, now + 0.15, 0.8) // C#6
        
      } catch (e) {
        console.warn('Audio play failed', e)
      }
    }
    prevPendingCountRef.current = pendingCount
  }, [pendingCount])

  const navItems = [
    { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/vehicles',   icon: Truck,           label: 'Vehicles', badge: pendingCount },
  ]

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-56 transition-colors">
      {/* ── Logo & Header ────────────────────────────────────────────────── */}
      <div className="relative flex flex-col items-center justify-center px-5 py-6 border-b border-slate-200 dark:border-slate-800">
        <div className="w-12 h-12 shrink-0 flex items-center justify-center transition-colors">
          <img src="/logo.png" alt="ShowMyFleet" className="w-full h-full object-contain" />
        </div>
        <p className="font-bold text-lg tracking-tight text-[#06375d] dark:text-[#14a076] mt-2">
          ShowMyFleet
        </p>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="md:hidden absolute top-4 right-4 p-1 rounded text-slate-400 dark:text-[#17b385]/70 hover:text-slate-600 dark:hover:text-[#17b385] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Nav items ────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-primary/10 dark:bg-[#17b385]/10 text-brand-primary dark:text-[#17b385] font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            {badge > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full
                             bg-amber-500 text-white text-[10px] font-bold animate-pulse">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      {/* ── Social Links Footer ────────────────────────────────────────── */}
      <div className="p-4 shrink-0 mt-auto border-t border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center justify-center gap-4">
          <a href="https://github.com/GowthamSankar-dev" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" title="GitHub">
            <Github size={16} />
          </a>
          <a href="https://www.linkedin.com/in/gowtham-sankar-b141b6351/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" title="LinkedIn">
            <Linkedin size={16} />
          </a>
          <a href="mailto:gowthamsankarjayaraman@gmail.com" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" title="Email">
            <Mail size={16} />
          </a>
        </div>
      </div>
    </div>
  )

  return (
    <>


      {/* Mobile Slide-over Drawer Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={onClose}
          />
          <aside className="relative z-10 flex flex-col h-full max-w-xs w-full shadow-2xl animate-slide-in">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}


