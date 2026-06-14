import { Game } from './game/Game.js';

const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);
window._debugGame = game;

document.getElementById('startBtn').addEventListener('click', () => {
  document.getElementById('startScreen').classList.add('hidden');
  game.start();
});

document.getElementById('restartBtn').addEventListener('click', () => {
  game.restart();
});
