'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { COUNTRIES } from '@/constants'
import Flag from 'react-country-flag'

interface Country {
  code: string
  name: string
  currency: string
}

interface CountrySelectorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  returnType?: 'code' | 'name'
  disabled?: boolean
}

export function CountrySelector({
  value,
  onChange,
  placeholder = "Select your country",
  className = "",
  returnType = 'name',
  disabled = false
}: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const norm = (s?: string) => (s || '').toString().trim().toLowerCase()
  const selectedCountry =
    COUNTRIES.find(country => country.code === value) ||
    COUNTRIES.find(country => norm(country.name) === norm(value))

  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (country: Country) => {
    onChange(returnType === 'code' ? country.code : country.name)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-left flex items-center justify-between transition-colors text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}`}
      >
        <div className="flex items-center gap-2">
          {selectedCountry ? (
            <>
              <Flag
                countryCode={selectedCountry.code}
                svg
                style={{
                  width: '1.25rem',
                  height: '1.25rem',
                  marginRight: '0.5rem'
                }}
              />
              <span className="text-sm text-gray-900">{selectedCountry.name}</span>
            </>
          ) : value ? (
            <span className="text-sm text-gray-900">{value}</span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-sm text-gray-900 bg-white placeholder:text-gray-400"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No countries found
              </div>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelect(country)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm ${(returnType === 'code' ? country.code === value : country.name === value) ? 'bg-primary/10 text-primary font-medium' : 'text-gray-900'
                    }`}
                >
                  <Flag
                    countryCode={country.code}
                    svg
                    style={{
                      width: '1.125rem',
                      height: '1.125rem',
                      marginRight: '0.5rem'
                    }}
                  />
                  <span className="flex-1 text-gray-900">{country.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
