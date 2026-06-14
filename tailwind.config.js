/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './*.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        'dirt': '#8B4513',
        'stone': '#696969',
        'ore-gold': '#FFD700',
        'ore-iron': '#B87333',
        'ore-diamond': '#00CED1',
        'ore-coal': '#2F2F2F',
        'ore-emerald': '#50C878',
        'ore-ruby': '#E0115F',
        'lava': '#FF4500',
        'sky-top': '#87CEEB',
        'sky-bottom': '#E0F6FF'
      },
      fontFamily: {
        'game': ['"Press Start 2P"', 'monospace']
      }
    }
  },
  plugins: []
};
