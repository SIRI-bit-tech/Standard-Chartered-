'use client'

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"
import type { TrustedDevice, LoginHistoryItem, TwoFactorSetupPayload } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QRCodeSVG } from "qrcode.react"

interface Props {
  onRefreshDevices: () => void
}

export function SecurityPanel({ onRefreshDevices }: Props) {
  const [busy, setBusy] = useState(false)
  const [enabled, setEnabled] = useState<boolean>(false)
  const [showSetup, setShowSetup] = useState(false)
  const [setupData, setSetupData] = useState<TwoFactorSetupPayload | null>(null)
  const [otp, setOtp] = useState('')
  const [devices, setDevices] = useState<TrustedDevice[]>([])
  const [history, setHistory] = useState<LoginHistoryItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null)

  /* removed unused deviceInfo */

  const load = async () => {
    try {
      const prof = await apiClient.get<{ success: boolean; data: any }>('/api/v1/profile')
      setEnabled(!!prof?.data?.two_factor_enabled)
      const devs = await apiClient.get<{ success: boolean; data: TrustedDevice[] }>('/api/v1/security/devices')
      if (devs?.success) setDevices(devs.data)
      const hist = await apiClient.get<{ success: boolean; data: LoginHistoryItem[] }>('/api/v1/security/login-history?limit=5')
      if (hist?.success) setHistory(hist.data)
      try {
        onRefreshDevices()
      } catch { /* no-op */ }
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => { load() }, [])

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
        load()
      } else {
        setError('Verification failed. Check the code and try again.')
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Invalid code. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const disable2fa = async () => {
    const code = prompt('Enter a current 2FA code to disable:')
    if (!code) return
    setBusy(true)
    setError(null)
    try {
      const res = await apiClient.post<{ success: boolean }>('/api/v1/security/2fa/disable', { code })
      if (res?.success) {
        setEnabled(false)
        load()
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to disable 2FA.')
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (device_id: string) => {
    setBusy(true)
    try {
      await apiClient.delete('/api/v1/security/devices/revoke', { params: { device_id } })
      setDevices((d) => d.filter((x) => x.device_id !== device_id))
      try {
        onRefreshDevices()
      } catch { /* no-op */ }
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
        setPwdOpen(false)
      } else {
        setPwdError('Failed to change password.')
      }
    } catch (e: any) {
      setPwdError(e?.response?.data?.detail || 'Failed to change password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Authentication</h3>
        <div className="flex flex-col md:flex-row gap-3">
          <button onClick={() => setPwdOpen(true)} className="px-4 py-2 border rounded-lg hover:bg-muted transition" disabled={busy}>
            Change Password
          </button>
          {!enabled ? (
            <button onClick={beginSetup} className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition" disabled={busy}>
              Enable 2FA
            </button>
          ) : (
            <button onClick={disable2fa} className="px-4 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/5 transition" disabled={busy}>
              Disable 2FA
            </button>
          )}
        </div>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {pwdError && <div className="text-sm text-destructive">{pwdError}</div>}
              {pwdSuccess && <div className="text-sm text-success">{pwdSuccess}</div>}
              <div>
                <label className="text-xs text-muted-foreground">Current Password</label>
                <input type="password" className="w-full px-3 py-2 border rounded" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">New Password</label>
                <input type="password" className="w-full px-3 py-2 border rounded" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Confirm New Password</label>
                <input type="password" className="w-full px-3 py-2 border rounded" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <button className="px-4 py-2 border rounded" onClick={() => setPwdOpen(false)} disabled={busy}>Cancel</button>
                <button className="px-4 py-2 bg-primary text-white rounded disabled:opacity-50" disabled={busy} onClick={submitPasswordChange}>
                  Save
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Dialog open={showSetup} onOpenChange={(o) => setShowSetup(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
          </DialogHeader>
          {setupData && (
            <div>
              <p className="text-sm mb-3">Scan this QR code in your authenticator app, or enter the code manually.</p>
              <div className="flex items-center gap-6">
                <QRCodeSVG
                  value={setupData.otpauth_uri}
                  className="w-40 h-40 border rounded"
                  title="Authenticator QR code"
                  includeMargin
                />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">Manual code</div>
                  <div className="font-mono text-sm mb-2">{setupData.secret}</div>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
                  <button onClick={confirmSetup} disabled={busy || otp.length !== 6} className="mt-3 px-4 py-2 bg-primary text-white rounded disabled:opacity-50">
                    Verify & Enable
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <hr className="border-border" />
      <div>
        <h3 className="font-semibold mb-3">Trusted Devices</h3>
        <p className="text-sm text-muted-foreground mb-3">Manage devices that have access to your account.</p>
        <div className="space-y-2">
          {devices.length === 0 && <p className="text-sm text-muted-foreground">No trusted devices</p>}
          {devices.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <p className="text-sm font-medium">{d.device_name || 'Unknown Device'}</p>
                <p className="text-xs text-muted-foreground">{d.ip_address || '—'} • Last seen {d.last_seen ? new Date(d.last_seen).toLocaleString() : '—'}</p>
              </div>
              <button onClick={() => revoke(d.device_id)} className="text-xs px-3 py-1 border rounded hover:bg-muted" disabled={busy}>
                Revoke
              </button>
            </div>
          ))}
        </div>
        <button className="mt-3 px-4 py-2 border rounded-lg hover:bg-muted transition" onClick={load} disabled={busy}>
          Refresh
        </button>
      </div>
      <hr className="border-border" />
      <div>
        <h3 className="font-semibold mb-3">Recent Login Activity</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-2">Date & Time</th>
                <th className="text-left py-2">IP</th>
                <th className="text-left py-2">Location</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-t">
                  <td className="py-2">{new Date(h.created_at).toLocaleString()}</td>
                  <td className="py-2">{h.ip_address || '—'}</td>
                  <td className="py-2">{h.city || '—'}{h.city && h.country ? ', ' : ''}{h.country || ''}</td>
                  <td className="py-2">{h.status === 'successful' ? 'Successful' : 'Failed'}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td className="py-2 text-muted-foreground" colSpan={4}>No login records</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <hr className="border-border" />
        <div className="pt-4 pb-2">
          <h3 className="font-semibold text-destructive mb-3 text-lg">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xl">
            Once you delete your account, there is no going back. All your data, transaction history, and documents will be permanently removed from our servers.
          </p>
          <button
            onClick={async () => {
              if (confirm("Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.")) {
                setBusy(true);
                try {
                  const res = await apiClient.delete<{ success: boolean }>('/api/v1/profile');
                  if (res.success) {
                    alert("Your account has been successfully deleted.");
                    window.localStorage.clear();
                    window.location.href = '/';
                  }
                } catch (e: any) {
                  setError(e?.response?.data?.detail || "Failed to delete account. Please contact support.");
                } finally {
                  setBusy(false);
                }
              }
            }}
            className="px-6 py-2.5 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition text-sm font-semibold shadow-sm"
            disabled={busy}
          >
            {busy ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  )
}
