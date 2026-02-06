import type { Config } from 'tailwindcss'

const config: Config = {
  content: ["./src/pages/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}", "*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Standard Chartered Brand Colors
        primary: {
          50: '#e8f4ff',
          100: '#d1e9ff',
          200: '#a2d3ff',
          300: '#73bdff',
          400: '#4ba8ff',
          500: '#0073CF', // Primary Brand Color
          600: '#0059a6',
          700: '#003f7d',
          800: '#002554',
          900: '#000b2b',
        },
        secondary: {
          50: '#eef9f3',
          100: '#ddf3e7',
          200: '#bbe7cf',
          300: '#99dbb7',
          400: '#77cf9f',
          500: '#009A44', // Secondary Brand Color
          600: '#007a36',
          700: '#005a28',
          800: '#003a1a',
          900: '#001a0c',
        },
        accent: {
          50: '#e0f7ff',
          100: '#c1efff',
          200: '#83deff',
          300: '#45ceff',
          400: '#00AEEF', // Light Blue
          500: '#0094d1',
          600: '#0079b3',
          700: '#005f95',
          800: '#004477',
          900: '#002a59',
        },
        success: '#009A44',
        warning: '#F39C12',
        error: '#E74C3C',
        background: '#FFFFFF',
        'text-primary': '#2C2C2C',
        'text-secondary': '#6B6B6B',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
}

export default config
