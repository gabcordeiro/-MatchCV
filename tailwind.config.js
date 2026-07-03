/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Acento principal: terracota (nada de roxo/azul SaaS).
        brand: {
          50: '#FCF3EE',
          100: '#F8E4D9',
          200: '#F0C8B3',
          300: '#E5A585',
          400: '#D97F57',
          500: '#CC6236',
          600: '#B84E24',
          700: '#97401F',
          800: '#78341C',
          900: '#5F2B19',
        },
        // Verde-oliva para "presente/positivo" (keywords encontradas).
        olive: {
          50: '#F5F6EC',
          100: '#E9ECD3',
          200: '#D5DBAF',
          300: '#B9C381',
          400: '#99A557',
          500: '#7C883C',
          600: '#5F692B',
          700: '#4B5324',
          800: '#3D431F',
          900: '#33381C',
        },
        // Neutros quentes (off-white de papel + marrons acinzentados) no lugar
        // do slate frio — remapear aqui reveste o app inteiro de uma vez.
        slate: {
          50: '#FAF7F2',
          100: '#F2EDE4',
          200: '#E6DECF',
          300: '#D3C7B2',
          400: '#AB9E88',
          500: '#867A66',
          600: '#685D4C',
          700: '#50463A',
          800: '#38302A',
          900: '#241F1A',
        },
      },
      fontFamily: {
        sans: ['Archivo', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
