/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'app-primary': 'var(--color-primary)',
        'app-secondary': 'var(--color-secondary)',
        'app-accent': 'var(--color-accent)',
      }
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}

