/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0f1e',
        card: 'rgba(255,255,255,0.05)',
        primary: '#6399ff',
        success: '#00c896',
        warning: '#f5a623',
        danger: '#ff3b30',
        purple: '#b48fff',
        border: 'rgba(255,255,255,0.08)',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
