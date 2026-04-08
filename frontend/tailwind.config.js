/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 1. Βάζουμε τη Brutalist γραμματοσειρά
      fontFamily: {
        'brutal': ['Space Grotesk', 'sans-serif'],
      },
      // 2. Οι χαρακτηριστικές "σκληρές" σκιές του Neo-Brutalism
      boxShadow: {
        'brutal': '4px 4px 0px 0px rgba(0,0,0,1)',
        'brutal-hover': '2px 2px 0px 0px rgba(0,0,0,1)',
      },
      // 3. Χρώματα που "χτυπάνε" στο μάτι
      colors: {
        'brutal-bg': '#FDFBF7', // Ένα "σπασμένο" λευκό του χαρτιού
        'brutal-primary': '#FF5722', // Έντονο πορτοκαλο-κόκκινο
        'brutal-secondary': '#CDDC39', // Έντονο λαχανί
      }
    },
  },
  plugins: [],
}
