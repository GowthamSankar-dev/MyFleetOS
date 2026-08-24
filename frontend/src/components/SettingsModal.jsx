import { useState, useRef, useEffect } from 'react'
import { Camera, X, User, CheckCircle, Shield, UserCircle, Trash2, Key, Video } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { updateProfile, changePassword, requestChangePasswordOTP } from '../api/fleetApi'
import { useAuth } from '../context/AuthContext'
import { getAvatarUrl } from '../api/fleetApi'
import ImageCropModal from './ImageCropModal'

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : 'http://localhost:8000')
).replace(/\/$/, '')

export default function SettingsModal({ onClose }) {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  
  // Profile State
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [isRecordingEnabled, setIsRecordingEnabled] = useState(user?.is_recording_enabled ?? true)
  const [avatarFile, setAvatarFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(user?.avatar_url ? getAvatarUrl(user.avatar_url) : null)
  const [uncroppedImageSrc, setUncroppedImageSrc] = useState(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const fileInputRef = useRef(null)

  // Security State
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [otpRequested, setOtpRequested] = useState(false)
  const [otpCode, setOtpCode] = useState('')

  // Shared UI State
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (e) => {
        setUncroppedImageSrc(e.target.result)
      }
      reader.readAsDataURL(file)
      e.target.value = null
    }
  }

  const handleCropComplete = (croppedBlob) => {
    setAvatarFile(croppedBlob)
    setPreviewUrl(URL.createObjectURL(croppedBlob))
    setUncroppedImageSrc(null)
    setRemoveAvatar(false)
    setSuccess(false)
    setError(null)
  }

  const handleRemoveAvatar = () => {
    setRemoveAvatar(true)
    setAvatarFile(null)
    setPreviewUrl(null)
    setSuccess(false)
    setError(null)
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append('full_name', fullName)
      formData.append('is_recording_enabled', isRecordingEnabled)
      
      if (avatarFile) {
        formData.append('avatar', avatarFile, 'avatar.jpg')
      }
      if (removeAvatar) {
        formData.append('remove_avatar', 'true')
      }

      const updatedUser = await updateProfile(formData)
      updateUser(updatedUser)
      setSuccess(true)
      setSuccessMessage('Profile updated successfully!')
      
      // Auto close after brief success message
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to update profile.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      if (!otpRequested) {
        // Step 1: Request OTP
        await requestChangePasswordOTP(currentPassword)
        setOtpRequested(true)
        setSuccess(true)
        setSuccessMessage('OTP sent to your email!')
        setTimeout(() => setSuccess(false), 3000)
      } else {
        // Step 2: Verify and change password
        await changePassword(currentPassword, newPassword, otpCode)
        setSuccess(true)
        setSuccessMessage('Password changed successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setOtpCode('')
        setOtpRequested(false)
        
        setTimeout(() => {
          onClose()
        }, 1500)
      }
    } catch (err) {
      setError(err.message || (otpRequested ? 'Failed to change password.' : 'Failed to request OTP.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded shadow-xl w-full max-w-sm overflow-hidden transition-colors border border-transparent dark:border-slate-800"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 transition-colors">
          <h2 className="font-bold text-slate-900 dark:text-white text-base">Account Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-2 pt-2 gap-2 border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => { setActiveTab('profile'); setError(null); setSuccess(false) }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'profile' 
                ? 'text-brand-primary dark:text-[#17b385] border-b-2 border-brand-primary dark:border-[#17b385]' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <UserCircle size={16} /> Profile
          </button>
          <button
            onClick={() => { setActiveTab('security'); setError(null); setSuccess(false); setIsChangingPassword(false) }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'security' 
                ? 'text-brand-primary dark:text-[#17b385] border-b-2 border-brand-primary dark:border-[#17b385]' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Shield size={16} /> Security
          </button>
        </div>

        <div className="p-6">
          {error && <p className="text-xs text-rose-600 dark:text-rose-400 mb-4">{error}</p>}
          
          <AnimatePresence>
            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-transparent dark:border-emerald-900/30 p-2 rounded"
              >
                <CheckCircle size={14} />
                {successMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === 'profile' ? (
            <form onSubmit={handleProfileSubmit}>
              {/* Avatar Upload */}
              <div className="flex flex-col items-center mb-6">
                <div 
                  className="relative w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer group overflow-hidden transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-slate-400 dark:text-slate-500" />
                  )}
                  
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={24} className="text-white" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">Click to change photo</p>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-rose-500 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 size={12} />
                    Remove Profile Picture
                  </button>
                )}
              </div>

              {/* Name Input */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    setSuccess(false)
                    setError(null)
                  }}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary dark:focus:border-[#17b385] focus:ring-1 focus:ring-brand-primary/50 dark:focus:ring-[#17b385]/50 transition-colors"
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading || (!avatarFile && fullName === user?.full_name && !removeAvatar)}
                className="w-full bg-brand-primary dark:bg-[#17b385] hover:bg-brand-secondary dark:hover:bg-[#14a076] text-white font-semibold text-sm py-2.5 rounded transition-colors disabled:opacity-50 flex justify-center cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Save Profile'
                )}
              </button>
            </form>
          ) : !isChangingPassword ? (
            <div className="py-1">
              <div className="flex items-center justify-between p-2 sm:p-3 mb-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded transition-colors">
                <div className="flex items-center gap-2">
                  <Key size={20} className="text-brand-primary dark:text-[#17b385] shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">Password</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Secure your account</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(true)}
                  className="text-xs font-semibold text-[#1e496d] dark:text-[#17b385] transition-colors flex items-center gap-1 cursor-pointer px-3 py-1.5 border border-brand-primary/20 hover:border-brand-primary/50 dark:border-[#17b385]/20 dark:hover:border-[#17b385]/50 rounded bg-white dark:bg-slate-900 hover:bg-brand-primary/5 dark:hover:bg-[#17b385]/5 shadow-sm"
                >
                  Change
                </button>
              </div>
              
              <div className="flex items-center justify-between p-2 sm:p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded transition-colors">
                <div className="flex items-center gap-2">
                  <Video size={20} className="text-brand-primary dark:text-[#17b385] shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">Session Recording</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Record route history for all vehicles</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const newValue = !isRecordingEnabled;
                    setIsRecordingEnabled(newValue);
                    try {
                      const formData = new FormData();
                      formData.append('is_recording_enabled', newValue);
                      const updatedUser = await updateProfile(formData);
                      updateUser(updatedUser);
                    } catch (e) {
                      setIsRecordingEnabled(!newValue);
                    }
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isRecordingEnabled ? 'bg-brand-primary dark:bg-[#17b385]' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isRecordingEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Change Password</h3>
                <button 
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setError(null);
                    setSuccess(false);
                    setCurrentPassword('');
                    setNewPassword('');
                  }} 
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  disabled={otpRequested}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                    setSuccess(false)
                    setError(null)
                  }}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary dark:focus:border-[#17b385] focus:ring-1 focus:ring-brand-primary/50 dark:focus:ring-[#17b385]/50 transition-colors disabled:opacity-50"
                />
              </div>
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  disabled={otpRequested}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    setSuccess(false)
                    setError(null)
                  }}
                  required
                  minLength={6}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary dark:focus:border-[#17b385] focus:ring-1 focus:ring-brand-primary/50 dark:focus:ring-[#17b385]/50 transition-colors disabled:opacity-50"
                />
              </div>

              {otpRequested && (
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Verification Code (OTP)</label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value)
                      setSuccess(false)
                      setError(null)
                    }}
                    required
                    maxLength={6}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary dark:focus:border-[#17b385] focus:ring-1 focus:ring-brand-primary/50 dark:focus:ring-[#17b385]/50 transition-colors text-center tracking-widest font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Please enter the 6-digit code sent to your email.</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !currentPassword || newPassword.length < 6 || (otpRequested && otpCode.length < 6)}
                className="w-full bg-brand-primary dark:bg-[#17b385] hover:bg-brand-secondary dark:hover:bg-[#14a076] text-white font-semibold text-sm py-2.5 rounded transition-colors disabled:opacity-50 flex justify-center cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : otpRequested ? (
                  'Verify & Change Password'
                ) : (
                  'Request OTP'
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
      {uncroppedImageSrc && (
        <ImageCropModal
          imageSrc={uncroppedImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={() => setUncroppedImageSrc(null)}
        />
      )}
    </div>
  )
}
