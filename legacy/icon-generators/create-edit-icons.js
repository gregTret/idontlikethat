import fs from 'fs';
import { createCanvas } from 'canvas';

function createEditIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background - rounded square
  ctx.fillStyle = '#5c7cfa';
  const radius = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();
  
  // Draw pencil icon
  ctx.save();
  ctx.translate(size * 0.5, size * 0.5);
  ctx.rotate(-Math.PI / 4); // Rotate 45 degrees
  
  const pencilWidth = size * 0.15;
  const pencilLength = size * 0.6;
  
  // Pencil body
  ctx.fillStyle = 'white';
  ctx.fillRect(-pencilWidth/2, -pencilLength/2, pencilWidth, pencilLength * 0.7);
  
  // Pencil tip
  ctx.beginPath();
  ctx.moveTo(-pencilWidth/2, pencilLength * 0.2);
  ctx.lineTo(0, pencilLength/2);
  ctx.lineTo(pencilWidth/2, pencilLength * 0.2);
  ctx.closePath();
  ctx.fill();
  
  // Pencil eraser
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(-pencilWidth/2, -pencilLength/2, pencilWidth, pencilLength * 0.15);
  
  ctx.restore();
  
  return canvas.toBuffer();
}

// Generate all icon sizes
fs.writeFileSync('icon16.png', createEditIcon(16));
fs.writeFileSync('icon48.png', createEditIcon(48));
fs.writeFileSync('icon128.png', createEditIcon(128));

console.log('Created edit icons');