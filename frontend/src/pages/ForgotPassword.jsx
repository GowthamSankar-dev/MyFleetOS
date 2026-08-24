import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { requestPasswordReset, resetPassword } from '../api/fleetApi'
import OTPInput from '../components/OTPInput'

export default function ForgotPassword() {
  const [step, setStep] = useState(1) // 1: Email, 2: OTP, 3: New Passwords
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const navigate = useNavigate()

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)
    
    try {
      await requestPasswordReset(email)
      setSuccess('If this email is registered, an OTP has been sent.')
      setStep(2)
    } catch (err) {
      setError(err.message || 'Failed to request OTP')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOtpNext = (e) => {
    e.preventDefault()
    if (code.length === 6) {
      setStep(3)
      setError(null)
      setSuccess(null)
    } else {
      setError("Please enter the full 6-digit code.")
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    try {
      await resetPassword(email, code, newPassword)
      setSuccess('Password has been successfully reset.')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm max-w-md w-full p-8 transition-colors">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-4 flex flex-col items-center gap-1 transition-colors">
            <img src="/logo.png" alt="myfleetOS icon" className="h-14 w-auto object-contain" />
            <span className="font-bold text-2xl tracking-tight text-[#06375d] dark:text-[#14a076]">
              MyFleetOS
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Reset Password</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {step === 1 && 'Enter your email to receive a reset code'}
            {step === 2 && 'Enter the 6-digit code sent to your email'}
            {step === 3 && 'Create a new secure password'}
          </p>
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

        {step === 1 && (
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
              {isSubmitting ? 'Sending…' : 'Send Reset Code'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleOtpNext} className="space-y-4">
            <div className="text-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
              Sent to: <span className="font-bold text-slate-900 dark:text-white">{email}</span>
            </div>
            
            <OTPInput value={code} onChange={setCode} />

            <button
              type="submit"
              disabled={code.length !== 6}
              className="w-full py-2.5 bg-brand-primary dark:bg-[#17b385] hover:bg-brand-primary/90 dark:hover:bg-[#17b385]/90 text-white font-semibold text-xs rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50 mt-4"
            >
              Next
            </button>
            
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              Back to request code
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded pl-9 pr-10 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-primary transition-colors"
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
                  placeholder="Minimum 6 characters"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded pl-9 pr-10 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-primary transition-colors"
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

            <button
              type="submit"
              disabled={isSubmitting || newPassword.length < 6}
              className="w-full py-2.5 bg-brand-primary dark:bg-[#17b385] hover:bg-brand-primary/90 dark:hover:bg-[#17b385]/90 text-white font-semibold text-xs rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Resetting…' : 'Reset Password'}
            </button>
            
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              Back to enter code
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          Remembered your password?{' '}
          <Link to="/login" className="text-brand-primary dark:text-[#17b385] font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </>
  )
}
