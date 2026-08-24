import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Map, MapPin, Shield, Zap, ChevronRight, Moon, Sun, Github, Linkedin, Mail } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { FenceIcon } from '../components/icons/FenceIcon'

export default function Landing() {
  const { isDarkMode, toggleTheme } = useTheme()
  const features = [
    {
      icon: <Map className="text-brand-primary dark:text-[#17b385]" size={24} />,
      title: "Live GPS Tracking",
      description: "Monitor your fleet's exact location in real-time with sub-second latency updates directly to your dashboard."
    },
    {
      icon: <Shield className="text-brand-primary dark:text-[#17b385]" size={24} />,
      title: "Secure Device Pairing",
      description: "Approve devices securely using one-time pairing codes and manage access permissions for every vehicle."
    },
    {
      icon: <FenceIcon className="text-brand-primary dark:text-[#17b385]" size={24} />,
      title: "Geofencing Alerts",
      description: "Create virtual boundaries and receive instant notifications when vehicles enter or exit designated zones."
    },
    {
      icon: <Zap className="text-brand-primary dark:text-[#17b385]" size={24} />,
      title: "Role-Based Dashboards",
      description: "Dedicated interfaces for both Fleet Owners and Drivers, tailored to their specific tracking and management needs."
    }
  ]

  return (
    <>
      <div className="min-h-screen w-full flex flex-col pt-6 pb-20">
        
        {/* Navigation Bar */}
        <nav className="w-full max-w-6xl mx-auto px-6 flex items-center justify-between mb-8">
          <div className="flex items-center">
            <img src="/logo.png" alt="myfleetOS" className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]" />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link 
              to="/login" 
              className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link 
              to="/register" 
              className="text-sm font-semibold bg-brand-primary dark:bg-[#17b385] text-white px-5 py-2.5 rounded shadow-sm hover:shadow-md hover:bg-brand-primary/90 dark:hover:bg-[#17b385]/90 transition-all"
            >
              Get Started
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-6 flex flex-col items-center justify-center text-center mt-4 md:mt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 mb-8"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
            Real-time tracking system v1.0 is live
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-6 max-w-4xl"
          >
            <span className="block">Fleet Management,</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-blue-500 dark:from-[#17b385] dark:to-blue-400 mt-2 md:mt-6">Simplified.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-10"
          >
            Track your vehicles in real-time, manage access seamlessly, and empower your drivers with an intuitive GPS sender app.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center px-4 sm:px-0"
          >
            <Link 
              to="/register" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3.5 rounded font-bold text-sm shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95"
            >
              Start tracking for free
              <ChevronRight size={16} />
            </Link>
          </motion.div>
        </main>

        {/* Features Section */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="w-full max-w-6xl mx-auto px-6 mt-24 md:mt-32"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div 
                key={idx} 
                className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-6 rounded hover:bg-white dark:hover:bg-slate-900 transition-colors shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="w-full max-w-6xl mx-auto px-6 mt-16 md:mt-24 pt-6 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} myfleetOS. All rights reserved.</p>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <a href="https://github.com/GowthamSankar-dev" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors" title="GitHub">
              <Github size={18} />
            </a>
            <a href="https://www.linkedin.com/in/gowtham-sankar-b141b6351/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors" title="LinkedIn">
              <Linkedin size={18} />
            </a>
            <a href="mailto:gowthamsankarjayaraman@gmail.com" className="hover:text-slate-900 dark:hover:text-white transition-colors" title="Email">
              <Mail size={18} />
            </a>
          </div>
        </footer>

      </div>
    </>
  )
}
