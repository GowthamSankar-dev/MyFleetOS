import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Mail, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { requestOtpLogin, verifyOtpLogin } from '../api/fleetApi'
import OTPInput from '../components/OTPInput'

export default function Login() {
  const [mode, setMode] = useState('password') // 'password' or 'otp'
  const [otpStep, setOtpStep] = useState(1) // 1: request, 2: verify
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/'

  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const user = await login(email, password)
      navigate(user.role === 'driver' ? '/gps' : returnTo)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)
    try {
      await requestOtpLogin(email)
      setSuccess('If this email is registered, an OTP has been sent.')
      setOtpStep(2)
    } catch (err) {
      setError(err.message || 'Failed to request OTP')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const data = await verifyOtpLogin(email, code)
      localStorage.setItem('fleet_token', data.access_token)
      window.location.href = data.user.role === 'driver' ? '/gps' : returnTo
    } catch (err) {
      setError(err.message || 'Invalid OTP')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'password' ? 'otp' : 'password')
    setOtpStep(1)
    setError(null)
    setSuccess(null)
    setCode('')
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm max-w-md w-full p-8 transition-colors">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-3 transition-colors">
            <img src="/logo.png" alt="myfleetOS" className="h-8 w-auto object-contain" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sign in to Fleet Tracker</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage your private vehicles and live GPS tracking</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-brand-accent/10 border border-brand-accent/30 rounded flex items-center gap-2 text-xs text-brand-accent">
            <CheckCircle size={14} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Password Mode */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-primary transition-colors [&:-webkit-autofill]:!shadow-[inset_0_0_0px_1000px_#fff] [&:-webkit-autofill]:![-webkit-text-fill-color:#0F172A] dark:[&:-webkit-autofill]:!shadow-[inset_0_0_0px_1000px_#020617] dark:[&:-webkit-autofill]:![-webkit-text-fill-color:#F1F5F9]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
                <Link to="/forgot-password" className="text-[10px] text-brand-primary dark:text-[#17b385] hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded pl-9 pr-10 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-primary transition-colors [&:-webkit-autofill]:!shadow-[inset_0_0_0px_1000px_#fff] [&:-webkit-autofill]:![-webkit-text-fill-color:#0F172A] dark:[&:-webkit-autofill]:!shadow-[inset_0_0_0px_1000px_#020617] dark:[&:-webkit-autofill]:![-webkit-text-fill-color:#F1F5F9]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-brand-primary dark:bg-[#17b385] hover:bg-brand-primary/90 dark:hover:bg-[#17b385]/90 text-white font-semibold text-xs rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        {/* OTP Mode */}
        {mode === 'otp' && otpStep === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-primary transition-colors"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting || !email}
              className="w-full py-2.5 bg-brand-primary dark:bg-[#17b385] hover:bg-brand-primary/90 dark:hover:bg-[#17b385]/90 text-white font-semibold text-xs rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Sending Code…' : 'Send Login Code'}
            </button>
          </form>
        )}

        {mode === 'otp' && otpStep === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
              Enter the 6-digit code sent to<br/> <span className="font-bold text-slate-900 dark:text-white">{email}</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-normal">If code is not received, please check your spam folder.</p>
            </div>
            
            <OTPInput value={code} onChange={setCode} />
            
            <button
              type="submit"
              disabled={isSubmitting || code.length !== 6}
              className="w-full py-2.5 bg-brand-primary dark:bg-[#17b385] hover:bg-brand-primary/90 dark:hover:bg-[#17b385]/90 text-white font-semibold text-xs rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50 mt-4"
            >
              {isSubmitting ? 'Verifying…' : 'Verify & Sign In'}
            </button>
          </form>
        )}

        {/* Toggle Mode */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2 items-center text-xs">
          <button
            type="button"
            onClick={toggleMode}
            className="text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {mode === 'password' ? 'Sign in with a one-time code instead' : 'Sign in with a password instead'}
          </button>
        </div>

        <div className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-primary dark:text-[#17b385] font-semibold hover:underline">
            Create Account
          </Link>
        </div>
      </div>
    </>
  )
}
