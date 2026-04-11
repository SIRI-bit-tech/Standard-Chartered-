'use client'

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"
import type { TwoFactorSetupPayload } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QRCodeSVG } from "qrcode.react"
import { ShieldCheck, ShieldAlert, Key, Trash2, ShieldX, AlertTriangle, Fingerprint, Smartphone, CreditCard } from 'lucide-react'
import { ConfirmModal } from "@/components/ui/confirm-modal"
import { useToast } from "@/hooks/use-toast"
import { parseApiError } from "@/utils/error-handler"
import { parseRegistrationOptions, encodeCredential } from "@/utils/webauthn"
import { useAuthStore } from "@/lib/store"

export function SecurityPanel() {
  const [busy, setBusy] = useState(false)
  const [enabled, setEnabled] = useState<boolean>(false)
  const [biometricsEnabled, setBiometricsEnabled] = useState<boolean>(false)
  const [showSetup, setShowSetup] = useState(false)
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [showBiometricDisableModal, setShowBiometricDisableModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { toast } = useToast()
  const { user, setUser } = useAuthStore()
  const [setupData, setSetupData] = useState<TwoFactorSetupPayload | null>(null)
  const [otp, setOtp] = useState('')
  const [disableOtp, setDisableOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null)
  const [pwdErrorFields, setPwdErrorFields] = useState<string[]>([])
  const [pinOpen, setPinOpen] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinSuccess, setPinSuccess] = useState<string | null>(null)
  const [pinErrorFields, setPinErrorFields] = useState<string[]>([])

  const loadStatus = async () => {
    try {
      const prof = await apiClient.get<{ success: boolean; data: any }>('/api/v1/profile')
      setEnabled(!!prof?.data?.two_factor_enabled)
      setBiometricsEnabled(!!prof?.data?.biometric_enabled)
    } catch { /* no-op */ }
  }

  useEffect(() => { loadStatus() }, [])

  const beginSetup = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await apiClient.post<{ success: boolean; enabled?: boolean; secret?: string; otpauth_uri?: string }>('/api/v1/security/2fa/setup', {})
      if (res?.enabled && !res?.secret) {
        setEnabled(true)
        return
      }
      setSetupData({ secret: res.secret!, otpauth_uri: res.otpauth_uri! })
      setShowSetup(true)
    } finally {
      setBusy(false)
    }
  }

  const confirmSetup = async () => {
    if (!otp || otp.length !== 6) return
    setBusy(true)
    setError(null)
    try {
      const res = await apiClient.post<{ success: boolean }>('/api/v1/security/2fa/verify', {
        code: otp,
        trust_device: false
      })
      if (res?.success) {
        setEnabled(true)
        setShowSetup(false)
        setOtp('')
        loadStatus()
      } else {
        setError('Verification failed. Check the code and try again.')
      }
    } catch (e: any) {
      const { message } = parseApiError(e)
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  const handleDisable2fa = async () => {
    if (!disableOtp || disableOtp.length !== 6) return
    setBusy(true)
    setError(null)
    try {
      const res = await apiClient.post<{ success: boolean }>('/api/v1/security/2fa/disable', { code: disableOtp })
      if (res?.success) {
        setEnabled(false)
        setShowDisableModal(false)
        setDisableOtp('')
        loadStatus()
      }
    } catch (e: any) {
      const { message } = parseApiError(e)
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  const submitPasswordChange = async () => {
    setPwdError(null)
    setPwdSuccess(null)
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError('All fields are required.')
      return
    }
    if (newPwd !== confirmPwd) {
      setPwdError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const res = await apiClient.post<{ success: boolean; message?: string }>('/api/v1/security/password/change', {
        current_password: currentPwd,
        new_password: newPwd,
        confirm_password: confirmPwd
      })
      if (res?.success) {
        setPwdSuccess(res.message || 'Password changed successfully.')
        setCurrentPwd('')
        setNewPwd('')
        setConfirmPwd('')
        setTimeout(() => setPwdOpen(false), 2000)
      }
    } catch (e: any) {
      const { message, errorFields } = parseApiError(e)
      setPwdError(message)
      setPwdErrorFields(errorFields)
    } finally {
      setBusy(false)
    }
  }

  const submitPinChange = async () => {
    setPinError(null)
    setPinSuccess(null)
    if (!currentPin || !newPin || !confirmPin) {
      setPinError('All fields are required.')
      return
    }
    if (newPin !== confirmPin) {
      setPinError('New PIN and confirmation do not match.')
      return
    }
    if (newPin.length !== 4) {
      setPinError('PIN must be exactly 4 digits.')
      return
    }
    setBusy(true)
    try {
      const res = await apiClient.post<{ success: boolean; message?: string }>('/api/v1/security/transfer-pin/change', {
        current_pin: currentPin,
        new_pin: newPin,
        confirm_pin: confirmPin
      })
      if (res?.success) {
        setPinSuccess(res.message || 'Transfer PIN changed successfully.')
        setCurrentPin('')
        setNewPin('')
        setConfirmPin('')
        setTimeout(() => {
          setPinOpen(false)
          setPinSuccess(null)
        }, 2000)
      }
    } catch (e: any) {
      const { message, errorFields } = parseApiError(e)
      setPinError(message)
      setPinErrorFields(errorFields)
    } finally {
      setBusy(false)
    }
  }

  const handleRegisterBiometrics = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await apiClient.post<{
        success: boolean;
        public_key_credential_creation_options: string
      }>('/api/v1/security/biometrics/register/start', {})

      if (!res.success) throw new Error('Failed to start biometric registration')
      const options = parseRegistrationOptions(res.public_key_credential_creation_options)
      const credential = await navigator.credentials.create({
        publicKey: options
      }) as any

      if (!credential) throw new Error('Biometric registration cancelled or failed')

      const finishRes = await apiClient.post<{ success: boolean; message: string }>('/api/v1/security/biometrics/register', {
        credential_id: credential.id,
        public_key_credential: encodeCredential(credential)
      })

      if (finishRes.success) {
        toast({
          title: "Biometrics Enabled",
          description: "You can now log in using your fingerprint or face scan.",
          variant: "success"
        })
        setBiometricsEnabled(true)
        if (user) setUser({ ...user, biometric_enabled: true })
        // Small delay before loading status to ensure UI confirms the local state first
        setTimeout(() => loadStatus(), 500)
      }
    } catch (e: any) {
      console.error('Biometric registration error:', e)
      const { message } = parseApiError(e)
      toast({
        title: "Registration Failed",
        description: message || "This device might not support Passkeys, or you cancelled the request.",
        variant: "destructive"
      })
    } finally {
      setBusy(false)
    }
  }

  const handleDisableBiometrics = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await apiClient.post<{ success: boolean }>('/api/v1/security/biometrics/disable', {})
      if (res?.success) {
        setBiometricsEnabled(false)
        toast({
          title: "Success",
          description: "Biometric authentication has been disabled.",
        })
        loadStatus()
      }
    } catch (e: any) {
      const { message } = parseApiError(e)
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Biometrics Section */}
      <div className="p-6 bg-gray-50 rounded-2xl border border-border/50">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className={`p-3 rounded-full ${biometricsEnabled ? 'bg-indigo-100' : 'bg-primary/10'}`}>
            {biometricsEnabled ? <Fingerprint className="w-6 h-6 text-indigo-600" /> : <Smartphone className="w-6 h-6 text-primary" />}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">Biometric Authentication</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Use your device's fingerprint or face scan to log into your account instantly. Faster and more secure than passwords.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {!biometricsEnabled ? (
                <button
                  onClick={handleRegisterBiometrics}
                  className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white rounded-xl hover:opacity-90 transition-all font-semibold shadow-sm shadow-primary/20 disabled:opacity-50"
                  disabled={busy}
                >
                  Enable Biometrics
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex items-center gap-2 p-2 px-4 bg-green-50 text-green-700 rounded-xl border border-green-100 font-bold text-sm">
                    <ShieldCheck className="w-4 h-4" />
                    Enabled on this account
                  </div>
                  <button
                    onClick={() => setShowBiometricDisableModal(true)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all font-semibold disabled:opacity-50"
                    disabled={busy}
                  >
                    Disable Biometrics
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Section */}
      <div className="p-6 bg-gray-50 rounded-2xl border border-border/50">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className={`p-3 rounded-full ${enabled ? 'bg-green-100' : 'bg-primary/10'}`}>
            {enabled ? <ShieldCheck className="w-6 h-6 text-green-600" /> : <ShieldAlert className="w-6 h-6 text-primary" />}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">Two-Factor Authentication</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Add an extra layer of security to your account by requiring a code from your mobile device.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {!enabled ? (
                <button
                  onClick={beginSetup}
                  className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white rounded-xl hover:opacity-90 transition-all font-semibold shadow-sm shadow-primary/20 disabled:opacity-50"
                  disabled={busy}
                >
                  Enable 2FA
                </button>
              ) : (
                <button
                  onClick={() => setShowDisableModal(true)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all font-semibold disabled:opacity-50"
                  disabled={busy}
                >
                  Disable 2FA
                </button>
              )}
            </div>
            {error && <p className="text-sm text-red-600 font-medium mt-3">{error}</p>}
          </div>
        </div>
      </div>

      {/* Transfer PIN Section */}
      <div className="p-6 bg-white rounded-2xl border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="p-3 rounded-full bg-green-50">
            <CreditCard className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">Transfer PIN</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Change your 4-digit transfer PIN used for authorizing transactions and transfers.
            </p>
            <div className="mt-4">
              <button
                onClick={() => setPinOpen(true)}
                className="w-full sm:w-auto px-6 py-2.5 border border-border rounded-xl hover:bg-gray-50 transition-all font-semibold text-gray-700 disabled:opacity-50"
                disabled={busy}
              >
                Change Transfer PIN
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="p-6 bg-white rounded-2xl border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="p-3 rounded-full bg-blue-50">
            <Key className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">Account Password</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Update your account password regularly to keep your account secure.
            </p>
            <div className="mt-4">
              <button
                onClick={() => setPwdOpen(true)}
                className="w-full sm:w-auto px-6 py-2.5 border border-border rounded-xl hover:bg-gray-50 transition-all font-semibold text-gray-700 disabled:opacity-50"
                disabled={busy}
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-border/50" />

      {/* Danger Zone */}
      <div className="pt-2">
        <div className="flex items-center gap-2 text-red-600 mb-4 px-2">
          <Trash2 className="w-5 h-5" />
          <h3 className="text-lg font-bold">Danger Zone</h3>
        </div>
        <div className="p-6 border border-red-100 bg-red-50/30 rounded-2xl">
          <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
            Deleting your account is permanent and cannot be undone. All your banking history, documents, and personal data will be erased immediately from our systems.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full sm:w-auto mt-6 px-8 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-bold text-sm shadow-sm"
            disabled={busy}
          >
            {busy ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          setBusy(true);
          try {
            const res = await apiClient.delete<{ success: boolean }>('/api/v1/profile');
            if (res.success) {
              toast({
                title: "Account Deleted",
                description: "Your account has been successfully deleted.",
              });
              window.localStorage.clear();
              window.location.href = '/';
            }
          } catch (e: any) {
            setError(e?.response?.data?.detail || "Failed to delete account. Please contact support.");
          } finally {
            setBusy(false);
          }
        }}
        title="Delete Account?"
        description="Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently removed."
        confirmText="Yes, Delete Everything"
        variant="destructive"
      />

      <ConfirmModal
        isOpen={showBiometricDisableModal}
        onClose={() => setShowBiometricDisableModal(false)}
        onConfirm={async () => {
          setShowBiometricDisableModal(false);
          await handleDisableBiometrics();
        }}
        title="Disable Biometric Authentication?"
        description="Are you sure you want to disable biometric login? You will need to use your password and potentially 2FA to log in next time."
        confirmText="Yes, Disable"
        variant="destructive"
      />

      {/* Password Dialog */}
      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent className="w-[95%] sm:max-w-md rounded-2xl p-6 shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">Update Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {pwdError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 font-medium">{pwdError}</div>}
            {pwdSuccess && <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm border border-green-100 font-medium">{pwdSuccess}</div>}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Current Password</label>
              <input
                type="password"
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all ${pwdErrorFields.includes('current_password') ? 'border-red-500 ring-red-500/20' : 'border-border'}`}
                value={currentPwd}
                onChange={(e) => {
                  setCurrentPwd(e.target.value);
                  if (pwdErrorFields.includes('current_password')) setPwdErrorFields(prev => prev.filter(f => f !== 'current_password'));
                  setPwdError(null);
                }}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">New Password</label>
              <input
                type="password"
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all ${pwdErrorFields.includes('new_password') ? 'border-red-500 ring-red-500/20' : 'border-border'}`}
                value={newPwd}
                onChange={(e) => {
                  setNewPwd(e.target.value);
                  if (pwdErrorFields.includes('new_password')) setPwdErrorFields(prev => prev.filter(f => f !== 'new_password'));
                  setPwdError(null);
                }}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Confirm Password</label>
              <input
                type="password"
                className="w-full px-4 py-3 bg-gray-50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                className="flex-1 py-3 border border-border rounded-xl hover:bg-gray-50 transition-all font-bold text-gray-500 order-2 sm:order-1"
                onClick={() => setPwdOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-3 bg-primary text-white rounded-xl hover:opacity-90 transition-all font-bold shadow-lg shadow-primary/20 disabled:opacity-50 order-1 sm:order-2"
                disabled={busy}
                onClick={submitPasswordChange}
              >
                {busy ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Transfer PIN Dialog */}
      <Dialog open={pinOpen} onOpenChange={(o) => setPinOpen(o)}>
        <DialogContent className="w-[95%] sm:max-w-md rounded-2xl overflow-hidden p-0 shadow-2xl">
          <div className="bg-green-500/5 p-6 border-b border-green-500/10">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-green-600" />
              Change Transfer PIN
            </DialogTitle>
          </div>

          <div className="p-6 space-y-4">
            {pinError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600 font-medium">{pinError}</p>
              </div>
            )}

            {pinSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm text-green-600 font-medium">{pinSuccess}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Current PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-center text-xl font-mono tracking-[0.5rem] ${pinErrorFields.includes('current_pin') ? 'border-red-500 ring-red-500/20' : 'border-border'}`}
                value={currentPin}
                onChange={(e) => {
                  setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                  if (pinErrorFields.includes('current_pin')) setPinErrorFields(prev => prev.filter(f => f !== 'current_pin'));
                  setPinError(null);
                }}
                placeholder="••••"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">New PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-center text-xl font-mono tracking-[0.5rem] ${pinErrorFields.includes('new_pin') ? 'border-red-500 ring-red-500/20' : 'border-border'}`}
                value={newPin}
                onChange={(e) => {
                  setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                  if (pinErrorFields.includes('new_pin')) setPinErrorFields(prev => prev.filter(f => f !== 'new_pin'));
                  setPinError(null);
                }}
                placeholder="••••"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Confirm New PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                className="w-full px-4 py-3 bg-gray-50 border border-border rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-center text-xl font-mono tracking-[0.5rem]"
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                  setPinError(null);
                }}
                placeholder="••••"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                className="flex-1 py-3 border border-border rounded-xl hover:bg-gray-50 transition-all font-bold text-gray-500 order-2 sm:order-1"
                onClick={() => {
                  setPinOpen(false);
                  setCurrentPin('');
                  setNewPin('');
                  setConfirmPin('');
                  setPinError(null);
                  setPinSuccess(null);
                  setPinErrorFields([]);
                }}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-bold shadow-lg shadow-green-600/20 disabled:opacity-50 order-1 sm:order-2"
                disabled={busy || currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
                onClick={submitPinChange}
              >
                {busy ? 'Updating...' : 'Change PIN'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2FA Setup Dialog */}
      <Dialog open={showSetup} onOpenChange={(o) => setShowSetup(o)}>
        <DialogContent className="w-[95%] sm:max-w-md rounded-2xl overflow-hidden p-0 shadow-2xl">
          <div className="bg-primary/5 p-6 border-b border-primary/10">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
              Secure your account
            </DialogTitle>
          </div>

          <div className="p-6">
            {setupData && (
              <div className="space-y-6">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Scan this QR code with your authenticator app, or enter the manual code below.
                </p>
                <div className="flex flex-col items-center gap-6">
                  <div className="p-4 bg-white border border-border rounded-2xl shadow-sm">
                    <QRCodeSVG
                      value={setupData.otpauth_uri}
                      className="w-40 h-40 sm:w-48 sm:h-48"
                      title="Authenticator QR code"
                    />
                  </div>

                  <div className="w-full space-y-4">
                    <div className="p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center">
                      <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Manual Setup Code</div>
                      <div className="font-mono text-base font-bold text-gray-700 tracking-widest uppercase select-all">{setupData.secret}</div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Verification Code</label>
                      <input
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        className="w-full px-4 py-3.5 bg-white border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-center text-xl font-mono tracking-[0.5rem] sm:tracking-[1rem]"
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>

                    <button
                      onClick={confirmSetup}
                      disabled={busy || otp.length !== 6}
                      className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {busy ? 'Verifying...' : 'Verify & Enable'}
                    </button>

                    <button
                      onClick={() => setShowSetup(false)}
                      className="w-full py-2 text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors"
                    >
                      Cancel Setup
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 2FA Disable Dialog */}
      <Dialog open={showDisableModal} onOpenChange={setShowDisableModal}>
        <DialogContent className="w-[95%] sm:max-w-md rounded-2xl overflow-hidden p-0 shadow-2xl">
          <div className="bg-red-50 p-6 border-b border-red-100">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-700">
              <ShieldX className="w-6 h-6" />
              Disable 2FA
            </DialogTitle>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 leading-relaxed">
                  Disabling Two-Factor Authentication will make your account less secure. Please enter your 6-digit code to proceed.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Confirmation Code</label>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    className="w-full px-4 py-3.5 bg-white border border-border rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all text-center text-xl font-mono tracking-[0.5rem] sm:tracking-[1rem]"
                    placeholder="000000"
                    value={disableOtp}
                    onChange={(e) => setDisableOtp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setShowDisableModal(false);
                      setDisableOtp('');
                    }}
                    className="flex-1 py-3 border border-border rounded-xl hover:bg-gray-50 transition-all font-bold text-gray-500 order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDisable2fa}
                    disabled={busy || disableOtp.length !== 6}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all disabled:opacity-50 order-1 sm:order-2"
                  >
                    {busy ? 'Disabling...' : 'Yes, Disable'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
