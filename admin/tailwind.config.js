module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6f7ee', 100: '#c3ebd5', 200: '#8fd8ae',
          300: '#5bc586', 400: '#2db15e', 500: '#00a651',
          600: '#008040', 700: '#006030', 800: '#004020', 900: '#002010'
        },
        dark: {
          bg: '#0d1117', surface: '#161b22', card: '#1c2128',
          border: '#30363d', muted: '#484f58'
        }
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
};
