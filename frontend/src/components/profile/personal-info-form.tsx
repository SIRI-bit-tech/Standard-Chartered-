import { useEffect, useState } from "react"
import { CountrySelector } from "@/components/ui/country-selector"

export interface PersonalInfo {
  first_name: string
  last_name: string
  phone: string
  country: string
  street_address: string
  city: string
  state: string
  postal_code: string
  email: string
}

interface Props {
  value: PersonalInfo
  disabled?: boolean
  onChange: (v: PersonalInfo) => void
  onSubmit: (e: React.FormEvent) => void
}

export function PersonalInfoForm({ value, disabled, onChange, onSubmit }: Props) {
  const [local, setLocal] = useState<PersonalInfo>(value)

  useEffect(() => {
    setLocal(value)
  }, [value])

  const update = (patch: Partial<PersonalInfo>) => {
    const next = { ...local, ...patch }
    setLocal(next)
    onChange(next)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">First Name</label>
          <input
            type="text"
            value={local.first_name}
            onChange={(e) => update({ first_name: e.target.value })}
            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-white text-gray-900"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Last Name</label>
          <input
            type="text"
            value={local.last_name}
            onChange={(e) => update({ last_name: e.target.value })}
            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-white text-gray-900"
            disabled={disabled}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Email Address</label>
        <input
          type="email"
          value={local.email}
          disabled
          className="w-full px-4 py-2 border border-border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Phone Number</label>
          <input
            type="tel"
            value={local.phone}
            onChange={(e) => update({ phone: e.target.value })}
            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-white text-gray-900"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Country</label>
          <CountrySelector
            value={local.country || ""}
            onChange={(v) => update({ country: v })}
            placeholder="Select your country"
            disabled={disabled}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Street Address</label>
        <input
          type="text"
          value={local.street_address || ""}
          onChange={(e) => update({ street_address: e.target.value })}
          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-white text-gray-900"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">City</label>
          <input
            type="text"
            value={local.city || ""}
            onChange={(e) => update({ city: e.target.value })}
            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-white text-gray-900"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">State/Province</label>
          <input
            type="text"
            value={local.state || ""}
            onChange={(e) => update({ state: e.target.value })}
            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-white text-gray-900"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Postal Code</label>
          <input
            type="text"
            value={local.postal_code || ""}
            onChange={(e) => update({ postal_code: e.target.value })}
            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-white text-gray-900"
            disabled={disabled}
          />
        </div>
      </div>

      {!disabled && (
        <button
          type="submit"
          className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition font-medium"
        >
          Save Changes
        </button>
      )}
    </form>
  )
}
