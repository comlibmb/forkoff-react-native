/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Primary accent color - Violet (Purple theme)
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6', // Main primary - Violet 500
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        // Dark theme colors (GitHub-inspired from Figma)
        dark: {
          50: '#c9d1d9',   // Primary text
          100: '#b1bac4',
          200: '#8b949e',  // Secondary text
          300: '#6e7681',
          400: '#484f58',
          500: '#30363d',  // Border color
          600: '#21262d',
          700: '#161b22',  // Card background
          800: '#0d1117',  // Main background
          900: '#010409',
          950: '#000000',
        },
        success: {
          50: '#aff5b4',
          100: '#7ee787',
          200: '#56d364',
          300: '#3fb950',
          400: '#2ea043',
          500: '#238636', // From Figma
          600: '#196c2e',
          700: '#0f5323',
        },
        warning: {
          50: '#fff8c5',
          100: '#fae17d',
          200: '#f2cc60',
          300: '#e3b341', // From Figma
          400: '#d29922',
          500: '#bb8009',
          600: '#9e6a03',
        },
        error: {
          50: '#ffdce0',
          100: '#ffb4b4',
          200: '#ff8c8c',
          300: '#f85149', // From Figma
          400: '#da3633',
          500: '#cf222e',
          600: '#a40e26',
        },
        info: {
          50: '#ddf4ff',
          100: '#b6e3ff',
          200: '#80ccff',
          300: '#54aeff',
          400: '#218bff',
          500: '#1f6feb',
          600: '#1158c7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'], // From Figma headings
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'card': '12px', // Card border radius from Figma
        'button': '4px', // Small button radius from Figma
        'pill': '9999px', // Pill/badge radius
      },
      spacing: {
        '18': '72px',
        '22': '88px',
      },
    },
  },
  plugins: [],
};
