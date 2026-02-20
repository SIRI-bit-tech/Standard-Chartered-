// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
export const API_VERSION = 'v1'
export const API_ENDPOINTS = {
  // Auth
  AUTH_REGISTER: '/api/v1/auth/register',
  AUTH_LOGIN: '/api/v1/auth/login',
  AUTH_LOGOUT: '/api/v1/auth/logout',
  AUTH_SESSION: '/api/v1/auth/session',
  AUTH_REFRESH: '/api/v1/auth/refresh',

  // Accounts
  ACCOUNTS: '/api/v1/accounts',
  ACCOUNT_DETAIL: '/api/v1/accounts/:id',
  ACCOUNT_BALANCE: '/api/v1/accounts/:id/balance',
  ACCOUNT_TRANSACTIONS: '/api/v1/accounts/:id/transactions',
  ACCOUNT_STATEMENTS: '/api/v1/accounts/:id/statements',

  // Transfers
  TRANSFERS: '/api/v1/transfers',
  TRANSFER_INTERNAL: '/api/v1/transfers/internal',
  TRANSFER_DOMESTIC: '/api/v1/transfers/domestic',
  TRANSFER_INTERNATIONAL: '/api/v1/transfers/international',
  BENEFICIARIES: '/api/v1/transfers/beneficiaries',

  // Loans
  LOAN_PRODUCTS: '/api/v1/loans/products',
  LOAN_APPLICATIONS: '/api/v1/loans/applications',
  LOAN_ACCOUNTS: '/api/v1/loans/accounts',

  // Notifications
  NOTIFICATIONS: '/api/v1/notifications',
  NOTIFICATION_SETTINGS: '/api/v1/notifications/settings',

  // Profile
  PROFILE: '/api/v1/profile',
  PROFILE_SETTINGS: '/api/v1/profile/settings',
  PROFILE_DOCUMENTS: '/api/v1/profile/documents',
  LOGIN_HISTORY: '/api/v1/profile/login-history',

  // Support
  SUPPORT_TICKETS: '/api/v1/support/tickets',
  SUPPORT_CHAT: '/api/v1/support/chat',

  // Bills
  BILL_PAYEES: '/api/v1/bills/payees',
  BILL_PAY: '/api/v1/bills/pay',
}

// Currency mapping by country - Comprehensive list for all countries
export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  AF: 'AFN', AL: 'ALL', DZ: 'DZD', AD: 'EUR', AO: 'AOA', AG: 'XCD', AR: 'ARS', AM: 'AMD', AU: 'AUD', AT: 'EUR', AZ: 'AZN',
  BS: 'BSD', BH: 'BHD', BD: 'BDT', BB: 'BBD', BY: 'BYN', BE: 'EUR', BZ: 'BZD', BJ: 'XOF', BT: 'BTN', BO: 'BOB', BA: 'BAM',
  BW: 'BWP', BR: 'BRL', BN: 'BND', BG: 'BGN', BF: 'XOF', BI: 'BIF', KH: 'KHR', CM: 'XAF', CA: 'CAD', CV: 'CVE',
  CF: 'XAF', TD: 'XAF', CL: 'CLP', CN: 'CNY', CO: 'COP', KM: 'KMF', CG: 'XAF', CR: 'CRC', HR: 'EUR', CU: 'CUP',
  CY: 'EUR', CZ: 'CZK', DK: 'DKK', DJ: 'DJF', DM: 'XCD', DO: 'DOP', EC: 'USD', EG: 'EGP', SV: 'USD', GQ: 'XAF',
  ER: 'ERN', EE: 'EUR', SZ: 'SZL', ET: 'ETB', FJ: 'FJD', FI: 'EUR', FR: 'EUR', GA: 'XAF', GM: 'GMD', GE: 'GEL',
  DE: 'EUR', GH: 'GHS', GR: 'EUR', GD: 'XCD', GT: 'GTQ', GN: 'GNF', GW: 'XOF', GY: 'GYD', HT: 'HTG', HN: 'HNL',
  HK: 'HKD', HU: 'HUF', IS: 'ISK', IN: 'INR', ID: 'IDR', IR: 'IRR', IQ: 'IQD', IE: 'EUR', IL: 'ILS', IT: 'EUR',
  CI: 'XOF', JM: 'JMD', JP: 'JPY', JO: 'JOD', KZ: 'KZT', KE: 'KES', KI: 'AUD', KW: 'KWD', KG: 'KGS', LA: 'LAK',
  LV: 'EUR', LB: 'LBP', LS: 'LSL', LR: 'LRD', LY: 'LYD', LI: 'CHF', LT: 'EUR', LU: 'EUR', MG: 'MGA', MW: 'MWK', MY: 'MYR',
  MV: 'MVR', ML: 'XOF', MT: 'EUR', MH: 'USD', MR: 'MRU', MU: 'MUR', MX: 'MXN', FM: 'USD', MD: 'MDL', MC: 'EUR', MN: 'MNT',
  ME: 'EUR', MA: 'MAD', MZ: 'MZN', MM: 'MMK', NA: 'NAD', NR: 'AUD', NP: 'NPR', NL: 'EUR', NZ: 'NZD', NI: 'NIO', NE: 'XOF',
  NG: 'NGN', KP: 'KPW', MK: 'MKD', NO: 'NOK', OM: 'OMR', PK: 'PKR', PW: 'USD', PA: 'PAB', PG: 'PGK', PY: 'PYG', PE: 'PEN',
  PH: 'PHP', PL: 'PLN', PT: 'EUR', QA: 'QAR', RO: 'RON', RU: 'RUB', RW: 'RWF', KN: 'XCD', LC: 'XCD', VC: 'XCD', WS: 'WST', SM: 'EUR',
  ST: 'STN', SA: 'SAR', SN: 'XOF', RS: 'RSD', SC: 'SCR', SL: 'SLL', SG: 'SGD', SK: 'EUR', SI: 'EUR', SB: 'SBD', SO: 'SOS',
  ZA: 'ZAR', KR: 'KRW', SS: 'SSP', ES: 'EUR', LK: 'LKR', SD: 'SDG', SR: 'SRD', SE: 'SEK', CH: 'CHF', SY: 'SYP', TW: 'TWD', TJ: 'TJS',
  TZ: 'TZS', TH: 'THB', TL: 'USD', TG: 'XOF', TO: 'TOP', TT: 'TTD', TN: 'TND', TR: 'TRY', TM: 'TMT', TV: 'AUD', UG: 'UGX', UA: 'UAH',
  AE: 'AED', GB: 'GBP', US: 'USD', UY: 'UYU', UZ: 'UZS', VU: 'VUV', VA: 'EUR', VE: 'VES', VN: 'VND', YE: 'YER', ZM: 'ZMW', ZW: 'ZWL',
}

// Account types
export const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking Account' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'crypto', label: 'Crypto Account' },
]

// Transaction types
export const TRANSACTION_TYPES = {
  DEBIT: 'debit',
  CREDIT: 'credit',
  TRANSFER: 'transfer',
  PAYMENT: 'payment',
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  INTEREST: 'interest',
  FEE: 'fee',
}

// Transfer types
export const TRANSFER_TYPES = {
  INTERNAL: 'internal',
  DOMESTIC: 'domestic',
  INTERNATIONAL: 'international',
  ACH: 'ach',
  WIRE: 'wire',
}

// Transfer fees
export const TRANSFER_FEES = {
  INTERNAL: 0,
  DOMESTIC: 2.5,
  INTERNATIONAL: 25,
  ACH: 0,
  WIRE: 15,
}

// User tiers
export const USER_TIERS = {
  STANDARD: 'standard',
  PRIORITY: 'priority',
  PREMIUM: 'premium',
}

// Authentication provider
export const AUTH_PROVIDER = (process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'better-auth') as 'better-auth' | 'clerk'



// Cloudinary configuration
export const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ''

// Notification types
export const NOTIFICATION_TYPES = {
  TRANSACTION: 'transaction',
  SECURITY: 'security',
  SYSTEM: 'system',
  LOAN: 'loan',
  ALERT: 'alert',
  OFFER: 'offer',
}

// Date formatting
export const DATE_FORMAT = 'MMM dd, yyyy'
export const DATETIME_FORMAT = 'MMM dd, yyyy hh:mm a'
export const TIME_FORMAT = 'hh:mm a'

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const DEFAULT_LIMIT = 20

// Session timeout (in minutes)
export const SESSION_TIMEOUT = 15

// Countries list - Comprehensive list of all countries
export const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan', currency: 'AFN' },
  { code: 'AL', name: 'Albania', currency: 'ALL' },
  { code: 'DZ', name: 'Algeria', currency: 'DZD' },
  { code: 'AD', name: 'Andorra', currency: 'EUR' },
  { code: 'AO', name: 'Angola', currency: 'AOA' },
  { code: 'AG', name: 'Antigua and Barbuda', currency: 'XCD' },
  { code: 'AR', name: 'Argentina', currency: 'ARS' },
  { code: 'AM', name: 'Armenia', currency: 'AMD' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'AT', name: 'Austria', currency: 'EUR' },
  { code: 'AZ', name: 'Azerbaijan', currency: 'AZN' },
  { code: 'BS', name: 'Bahamas', currency: 'BSD' },
  { code: 'BH', name: 'Bahrain', currency: 'BHD' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT' },
  { code: 'BB', name: 'Barbados', currency: 'BBD' },
  { code: 'BY', name: 'Belarus', currency: 'BYN' },
  { code: 'BE', name: 'Belgium', currency: 'EUR' },
  { code: 'BZ', name: 'Belize', currency: 'BZD' },
  { code: 'BJ', name: 'Benin', currency: 'XOF' },
  { code: 'BT', name: 'Bhutan', currency: 'BTN' },
  { code: 'BO', name: 'Bolivia', currency: 'BOB' },
  { code: 'BA', name: 'Bosnia and Herzegovina', currency: 'BAM' },
  { code: 'BW', name: 'Botswana', currency: 'BWP' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
  { code: 'BN', name: 'Brunei', currency: 'BND' },
  { code: 'BG', name: 'Bulgaria', currency: 'BGN' },
  { code: 'BF', name: 'Burkina Faso', currency: 'XOF' },
  { code: 'BI', name: 'Burundi', currency: 'BIF' },
  { code: 'KH', name: 'Cambodia', currency: 'KHR' },
  { code: 'CM', name: 'Cameroon', currency: 'XAF' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'CV', name: 'Cape Verde', currency: 'CVE' },
  { code: 'CF', name: 'Central African Republic', currency: 'XAF' },
  { code: 'TD', name: 'Chad', currency: 'XAF' },
  { code: 'CL', name: 'Chile', currency: 'CLP' },
  { code: 'CN', name: 'China', currency: 'CNY' },
  { code: 'CO', name: 'Colombia', currency: 'COP' },
  { code: 'KM', name: 'Comoros', currency: 'KMF' },
  { code: 'CG', name: 'Congo', currency: 'XAF' },
  { code: 'CR', name: 'Costa Rica', currency: 'CRC' },
  { code: 'HR', name: 'Croatia', currency: 'EUR' },
  { code: 'CU', name: 'Cuba', currency: 'CUP' },
  { code: 'CY', name: 'Cyprus', currency: 'EUR' },
  { code: 'CZ', name: 'Czech Republic', currency: 'CZK' },
  { code: 'DK', name: 'Denmark', currency: 'DKK' },
  { code: 'DJ', name: 'Djibouti', currency: 'DJF' },
  { code: 'DM', name: 'Dominica', currency: 'XCD' },
  { code: 'DO', name: 'Dominican Republic', currency: 'DOP' },
  { code: 'EC', name: 'Ecuador', currency: 'USD' },
  { code: 'EG', name: 'Egypt', currency: 'EGP' },
  { code: 'SV', name: 'El Salvador', currency: 'USD' },
  { code: 'GQ', name: 'Equatorial Guinea', currency: 'XAF' },
  { code: 'ER', name: 'Eritrea', currency: 'ERN' },
  { code: 'EE', name: 'Estonia', currency: 'EUR' },
  { code: 'SZ', name: 'Eswatini', currency: 'SZL' },
  { code: 'ET', name: 'Ethiopia', currency: 'ETB' },
  { code: 'FJ', name: 'Fiji', currency: 'FJD' },
  { code: 'FI', name: 'Finland', currency: 'EUR' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'GA', name: 'Gabon', currency: 'XAF' },
  { code: 'GM', name: 'Gambia', currency: 'GMD' },
  { code: 'GE', name: 'Georgia', currency: 'GEL' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'GH', name: 'Ghana', currency: 'GHS' },
  { code: 'GR', name: 'Greece', currency: 'EUR' },
  { code: 'GD', name: 'Grenada', currency: 'XCD' },
  { code: 'GT', name: 'Guatemala', currency: 'GTQ' },
  { code: 'GN', name: 'Guinea', currency: 'GNF' },
  { code: 'GW', name: 'Guinea-Bissau', currency: 'XOF' },
  { code: 'GY', name: 'Guyana', currency: 'GYD' },
  { code: 'HT', name: 'Haiti', currency: 'HTG' },
  { code: 'HN', name: 'Honduras', currency: 'HNL' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
  { code: 'HU', name: 'Hungary', currency: 'HUF' },
  { code: 'IS', name: 'Iceland', currency: 'ISK' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR' },
  { code: 'IR', name: 'Iran', currency: 'IRR' },
  { code: 'IQ', name: 'Iraq', currency: 'IQD' },
  { code: 'IE', name: 'Ireland', currency: 'EUR' },
  { code: 'IL', name: 'Israel', currency: 'ILS' },
  { code: 'IT', name: 'Italy', currency: 'EUR' },
  { code: 'CI', name: 'Ivory Coast', currency: 'XOF' },
  { code: 'JM', name: 'Jamaica', currency: 'JMD' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'JO', name: 'Jordan', currency: 'JOD' },
  { code: 'KZ', name: 'Kazakhstan', currency: 'KZT' },
  { code: 'KE', name: 'Kenya', currency: 'KES' },
  { code: 'KI', name: 'Kiribati', currency: 'AUD' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD' },
  { code: 'KG', name: 'Kyrgyzstan', currency: 'KGS' },
  { code: 'LA', name: 'Laos', currency: 'LAK' },
  { code: 'LV', name: 'Latvia', currency: 'EUR' },
  { code: 'LB', name: 'Lebanon', currency: 'LBP' },
  { code: 'LS', name: 'Lesotho', currency: 'LSL' },
  { code: 'LR', name: 'Liberia', currency: 'LRD' },
  { code: 'LY', name: 'Libya', currency: 'LYD' },
  { code: 'LI', name: 'Liechtenstein', currency: 'CHF' },
  { code: 'LT', name: 'Lithuania', currency: 'EUR' },
  { code: 'LU', name: 'Luxembourg', currency: 'EUR' },
  { code: 'MG', name: 'Madagascar', currency: 'MGA' },
  { code: 'MW', name: 'Malawi', currency: 'MWK' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR' },
  { code: 'MV', name: 'Maldives', currency: 'MVR' },
  { code: 'ML', name: 'Mali', currency: 'XOF' },
  { code: 'MT', name: 'Malta', currency: 'EUR' },
  { code: 'MH', name: 'Marshall Islands', currency: 'USD' },
  { code: 'MR', name: 'Mauritania', currency: 'MRU' },
  { code: 'MU', name: 'Mauritius', currency: 'MUR' },
  { code: 'MX', name: 'Mexico', currency: 'MXN' },
  { code: 'FM', name: 'Micronesia', currency: 'USD' },
  { code: 'MD', name: 'Moldova', currency: 'MDL' },
  { code: 'MC', name: 'Monaco', currency: 'EUR' },
  { code: 'MN', name: 'Mongolia', currency: 'MNT' },
  { code: 'ME', name: 'Montenegro', currency: 'EUR' },
  { code: 'MA', name: 'Morocco', currency: 'MAD' },
  { code: 'MZ', name: 'Mozambique', currency: 'MZN' },
  { code: 'MM', name: 'Myanmar', currency: 'MMK' },
  { code: 'NA', name: 'Namibia', currency: 'NAD' },
  { code: 'NR', name: 'Nauru', currency: 'AUD' },
  { code: 'NP', name: 'Nepal', currency: 'NPR' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD' },
  { code: 'NI', name: 'Nicaragua', currency: 'NIO' },
  { code: 'NE', name: 'Niger', currency: 'XOF' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
  { code: 'KP', name: 'North Korea', currency: 'KPW' },
  { code: 'MK', name: 'North Macedonia', currency: 'MKD' },
  { code: 'NO', name: 'Norway', currency: 'NOK' },
  { code: 'OM', name: 'Oman', currency: 'OMR' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR' },
  { code: 'PW', name: 'Palau', currency: 'USD' },
  { code: 'PA', name: 'Panama', currency: 'PAB' },
  { code: 'PG', name: 'Papua New Guinea', currency: 'PGK' },
  { code: 'PY', name: 'Paraguay', currency: 'PYG' },
  { code: 'PE', name: 'Peru', currency: 'PEN' },
  { code: 'PH', name: 'Philippines', currency: 'PHP' },
  { code: 'PL', name: 'Poland', currency: 'PLN' },
  { code: 'PT', name: 'Portugal', currency: 'EUR' },
  { code: 'QA', name: 'Qatar', currency: 'QAR' },
  { code: 'RO', name: 'Romania', currency: 'RON' },
  { code: 'RU', name: 'Russia', currency: 'RUB' },
  { code: 'RW', name: 'Rwanda', currency: 'RWF' },
  { code: 'KN', name: 'Saint Kitts and Nevis', currency: 'XCD' },
  { code: 'LC', name: 'Saint Lucia', currency: 'XCD' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', currency: 'XCD' },
  { code: 'WS', name: 'Samoa', currency: 'WST' },
  { code: 'SM', name: 'San Marino', currency: 'EUR' },
  { code: 'ST', name: 'Sao Tome and Principe', currency: 'STN' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' },
  { code: 'SN', name: 'Senegal', currency: 'XOF' },
  { code: 'RS', name: 'Serbia', currency: 'RSD' },
  { code: 'SC', name: 'Seychelles', currency: 'SCR' },
  { code: 'SL', name: 'Sierra Leone', currency: 'SLL' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'SK', name: 'Slovakia', currency: 'EUR' },
  { code: 'SI', name: 'Slovenia', currency: 'EUR' },
  { code: 'SB', name: 'Solomon Islands', currency: 'SBD' },
  { code: 'SO', name: 'Somalia', currency: 'SOS' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'KR', name: 'South Korea', currency: 'KRW' },
  { code: 'SS', name: 'South Sudan', currency: 'SSP' },
  { code: 'ES', name: 'Spain', currency: 'EUR' },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR' },
  { code: 'SD', name: 'Sudan', currency: 'SDG' },
  { code: 'SR', name: 'Suriname', currency: 'SRD' },
  { code: 'SE', name: 'Sweden', currency: 'SEK' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF' },
  { code: 'SY', name: 'Syria', currency: 'SYP' },
  { code: 'TW', name: 'Taiwan', currency: 'TWD' },
  { code: 'TJ', name: 'Tajikistan', currency: 'TJS' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS' },
  { code: 'TH', name: 'Thailand', currency: 'THB' },
  { code: 'TL', name: 'Timor-Leste', currency: 'USD' },
  { code: 'TG', name: 'Togo', currency: 'XOF' },
  { code: 'TO', name: 'Tonga', currency: 'TOP' },
  { code: 'TT', name: 'Trinidad and Tobago', currency: 'TTD' },
  { code: 'TN', name: 'Tunisia', currency: 'TND' },
  { code: 'TR', name: 'Turkey', currency: 'TRY' },
  { code: 'TM', name: 'Turkmenistan', currency: 'TMT' },
  { code: 'TV', name: 'Tuvalu', currency: 'AUD' },
  { code: 'UG', name: 'Uganda', currency: 'UGX' },
  { code: 'UA', name: 'Ukraine', currency: 'UAH' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'UY', name: 'Uruguay', currency: 'UYU' },
  { code: 'UZ', name: 'Uzbekistan', currency: 'UZS' },
  { code: 'VU', name: 'Vanuatu', currency: 'VUV' },
  { code: 'VA', name: 'Vatican City', currency: 'EUR' },
  { code: 'VE', name: 'Venezuela', currency: 'VES' },
  { code: 'VN', name: 'Vietnam', currency: 'VND' },
  { code: 'YE', name: 'Yemen', currency: 'YER' },
  { code: 'ZM', name: 'Zambia', currency: 'ZMW' },
  { code: 'ZW', name: 'Zimbabwe', currency: 'ZWL' },
]
