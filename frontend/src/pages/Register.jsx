import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Mail, User, AlertCircle, CheckCircle, Eye, EyeOff, Users, Car, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { requestRegisterOtp, checkHealth } from '../api/fleetApi'
import OTPInput from '../components/OTPInput'

export default function Register() {
  const [step, setStep] = useState(1) // 1: Form, 2: OTP
  const [formSlide, setFormSlide] = useState(1) // 1: Info, 2: Password
  const [role, setRole] = useState('owner') // 'owner' | 'driver'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToPolicy, setAgreedToPolicy] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)
  const [retryCountdown, setRetryCountdown] = useState(null)
  const keepAliveRef = useRef(null)
  const retryTimerRef = useRef(null)
  const retryFnRef = useRef(null)
  
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/'

  // Keep Render awake while user is reading their email and entering the OTP.
  // Pings /health every 25 s so the server never goes back to sleep.
  useEffect(() => {
    if (step === 2) {
      keepAliveRef.current = setInterval(() => {
        checkHealth().catch(() => {})
      }, 25000)
    }
    return () => {
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current)
        keepAliveRef.current = null
      }
    }
  }, [step])

  // Auto-retry countdown cleanup
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearInterval(retryTimerRef.current)
    }
  }, [])

  const startAutoRetry = (retryFn) => {
    retryFnRef.current = retryFn
    let count = 8
    setRetryCountdown(count)
    retryTimerRef.current = setInterval(() => {
      count -= 1
      setRetryCountdown(count)
      if (count <= 0) {
        clearInterval(retryTimerRef.current)
        retryTimerRef.current = null
        setRetryCountdown(null)
        retryFnRef.current?.()
      }
    }, 1000)
  }

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    
    setIsSubmitting(true)
    try {
      await requestRegisterOtp(email)
      setSuccess('Registration OTP sent to your email.')
      setStep(2)
      // Pre-warm the Render backend while the user reads their email,
      // so it's fully awake when they click 'Verify & Register'.
      // keep-alive interval starts via useEffect above
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setIsSubmitting(false)
    }
  }

  const doRegister = async () => {
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)
    try {
      await register(email, password, fullName, code, role)
      navigate(role === 'driver' ? '/gps' : returnTo)
    } catch (err) {
      // Render free tier cold start — auto-retry in 8 seconds
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setError('Server is waking up… retrying automatically.')
        startAutoRetry(doRegister)
      } else {
        setError(err.message || 'Registration failed')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegister = (e) => {
    e.preventDefault()
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current)
      retryTimerRef.current = null
      setRetryCountdown(null)
    }
    doRegister()
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm max-w-md w-full p-8 transition-colors">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-4 flex flex-col items-center gap-1 transition-colors">
            <img src="/logo.png" alt="ShowMyFleet icon" className="h-14 w-auto object-contain" />
            <span className="font-bold text-2xl tracking-tight text-[#06375d] dark:text-[#14a076]">
              ShowMyFleet
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Create your Account</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Start tracking your private vehicles live</p>
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

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            
            {formSlide === 1 ? (
              <>
                {/* Role Selector */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setRole('owner')}
                    className={`flex flex-col items-center justify-center p-3 rounded border-2 transition-all cursor-pointer ${
                      role === 'owner'
                        ? 'border-brand-primary dark:border-[#17b385] bg-brand-primary/5 dark:bg-[#17b385]/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <Users size={24} className={`mb-2 ${role === 'owner' ? 'text-brand-primary dark:text-[#17b385]' : 'text-slate-400'}`} />
                    <span className={`text-xs font-semibold ${role === 'owner' ? 'text-brand-primary dark:text-[#17b385]' : 'text-slate-600 dark:text-slate-400'}`}>Fleet Owner</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setRole('driver')}
                    className={`flex flex-col items-center justify-center p-3 rounded border-2 transition-all cursor-pointer ${
                      role === 'driver'
                        ? 'border-brand-primary dark:border-[#17b385] bg-brand-primary/5 dark:bg-[#17b385]/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <Car size={24} className={`mb-2 ${role === 'driver' ? 'text-brand-primary dark:text-[#17b385]' : 'text-slate-400'}`} />
                    <span className={`text-xs font-semibold ${role === 'driver' ? 'text-brand-primary dark:text-[#17b385]' : 'text-slate-600 dark:text-slate-400'}`}>Driver / Vehicle</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Peter Parker"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-primary transition-colors [&:-webkit-autofill]:!shadow-[inset_0_0_0px_1000px_#fff] [&:-webkit-autofill]:![-webkit-text-fill-color:#0F172A] dark:[&:-webkit-autofill]:!shadow-[inset_0_0_0px_1000px_#020617] dark:[&:-webkit-autofill]:![-webkit-text-fill-color:#F1F5F9]"
                    />
                  </div>
                </div>

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
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-primary transition-colors [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#fff] [&:-webkit-autofill]:[-webkit-text-fill-color:#0F172A] dark:[&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#020617] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#F1F5F9]"
                    />
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    if (fullName && email) setFormSlide(2)
                  }}
                  disabled={!fullName || !email}
                  className="w-full py-2.5 bg-brand-primary dark:bg-[#17b385] hover:bg-brand-primary/90 dark:hover:bg-[#17b385]/90 text-white font-semibold text-xs rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50 mt-4"
                >
                  Next Step
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded pl-9 pr-10 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-primary transition-colors [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#fff] [&:-webkit-autofill]:[-webkit-text-fill-color:#0F172A] dark:[&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#020617] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#F1F5F9]"
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
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Re-enter Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Minimum 6 characters"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded pl-9 pr-10 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-primary transition-colors [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#fff] [&:-webkit-autofill]:[-webkit-text-fill-color:#0F172A] dark:[&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#020617] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#F1F5F9]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="privacy-policy"
                    checked={agreedToPolicy}
                    onChange={(e) => setAgreedToPolicy(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
                    required
                  />
                  <label htmlFor="privacy-policy" className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    I agree to the <button type="button" onClick={() => setShowPolicy(true)} className="text-brand-primary dark:text-[#17b385] hover:underline font-semibold cursor-pointer">Privacy Policy</button>.
                  </label>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormSlide(1)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded shadow-sm transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-brand-primary dark:bg-[#17b385] hover:bg-brand-primary/90 dark:hover:bg-[#17b385]/90 text-white font-semibold text-xs rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing…' : 'Create Account'}
                  </button>
                </div>
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
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
              {isSubmitting
                ? 'Verifying…'
                : retryCountdown !== null
                ? `Retrying in ${retryCountdown}s…`
                : 'Verify & Register'}
            </button>
            
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              Back to form
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-primary dark:text-[#17b385] font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>

      {showPolicy && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowPolicy(false)}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl rounded max-w-sm w-full relative transition-colors" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowPolicy(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer">
              <X size={18} />
            </button>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Privacy Policy</h3>
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-3 leading-relaxed">
              <p>
                <strong>ShowMyFleet</strong> values your privacy. If you choose to register and use our platform, your GPS data will <strong>only</strong> be collected when you actively click "Start Sharing" in the GPS Sender dashboard.
              </p>
              <p>
                Your real-time location is strictly used to display your position to the specific fleet owner you have paired with. 
              </p>
              <p>
                We do not sell, trade, or otherwise transfer your location data to outside parties. You have full control and can stop sharing your location at any time.
              </p>
            </div>
            <button
              onClick={() => { setShowPolicy(false); setAgreedToPolicy(true); }}
              className="mt-6 w-full py-2.5 bg-brand-primary dark:bg-[#17b385] hover:bg-brand-primary/90 dark:hover:bg-[#17b385]/90 text-white font-semibold text-xs rounded transition-colors shadow-sm cursor-pointer"
            >
              I Agree
            </button>
          </div>
        </div>
      )}
    </>
  )
}
