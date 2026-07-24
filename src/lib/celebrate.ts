/** Lightweight confetti burst — no dependency. */
export function burstConfetti(): void {
  if (typeof document === 'undefined') return;
  const root = document.createElement('div');
  root.setAttribute('aria-hidden', 'true');
  root.style.cssText =
    'pointer-events:none;position:fixed;inset:0;z-index:9999;overflow:hidden;';
  document.body.appendChild(root);

  if (!document.getElementById('pastelly-confetti-style')) {
    const style = document.createElement('style');
    style.id = 'pastelly-confetti-style';
    style.textContent = `
      @keyframes pastelly-confetti-fall {
        0% { transform: translate3d(0,0,0) rotate(0deg); opacity: 1; }
        100% { transform: translate3d(var(--dx), 105vh, 0) rotate(540deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  const colors = ['#f9a8d4', '#93c5fd', '#a7f3d0', '#fde68a', '#c4b5fd', '#fdba74'];
  for (let i = 0; i < 36; i += 1) {
    const bit = document.createElement('span');
    const left = 8 + Math.random() * 84;
    const delay = Math.random() * 0.2;
    const dur = 0.95 + Math.random() * 0.65;
    const size = 6 + Math.random() * 6;
    const dx = `${(Math.random() - 0.5) * 120}px`;
    bit.style.cssText = `
      position:absolute;top:-12px;left:${left}%;
      width:${size}px;height:${size * 0.55}px;
      background:${colors[i % colors.length]};
      border-radius:2px;
      opacity:0.95;
      --dx:${dx};
      animation:pastelly-confetti-fall ${dur}s ${delay}s ease-out forwards;
    `;
    root.appendChild(bit);
  }

  window.setTimeout(() => root.remove(), 2200);
}
