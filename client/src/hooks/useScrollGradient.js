import { useEffect, useRef, useState } from 'react';

// Helper: convert hex like #rrggbb to {r,g,b}
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToCss({ r, g, b }) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  return {
    r: lerp(c1.r, c2.r, t),
    g: lerp(c1.g, c2.g, t),
    b: lerp(c1.b, c2.b, t),
  };
}

/**
 * useScrollGradient
 * Returns a CSS background string (solid color) that smoothly interpolates
 * between three sentiment colors as the user scrolls: top (green) -> middle (amber) -> bottom (pink).
 */
export default function useScrollGradient(options = {}) {
  const topColor = hexToRgb(options.topColor || '#10B981'); // green
  const middleColor = hexToRgb(options.middleColor || '#F59E0B'); // amber
  const bottomColor = hexToRgb(options.bottomColor || '#FCA5A5'); // light pink

  const [bg, setBg] = useState(rgbToCss(topColor));
  const ticking = useRef(false);

  useEffect(() => {
    function compute() {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || window.pageYOffset || doc.scrollTop || 0;
      const winH = window.innerHeight || doc.clientHeight;
      const docH = Math.max(doc.scrollHeight, doc.offsetHeight, doc.clientHeight);
      const maxScroll = Math.max(1, docH - winH);
      const ratio = Math.min(1, Math.max(0, scrollTop / maxScroll));

      let color;
      if (ratio <= 0.5) {
        const t = ratio / 0.5; // 0..1 from top->middle
        color = lerpColor(topColor, middleColor, t);
      } else {
        const t = (ratio - 0.5) / 0.5; // 0..1 middle->bottom
        color = lerpColor(middleColor, bottomColor, t);
      }

      setBg(rgbToCss(color));
      ticking.current = false;
    }

    function onScroll() {
      if (!ticking.current) {
        ticking.current = true;
        window.requestAnimationFrame(compute);
      }
    }

    // initial compute
    window.requestAnimationFrame(compute);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [topColor, middleColor, bottomColor]);

  // Return background style value (we'll use a subtle gradient to add depth)
  const background = `linear-gradient(to bottom, ${bg} 0%, ${bg} 100%)`;
  return background;
}
