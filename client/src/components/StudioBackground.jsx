import { useMemo } from 'react';

const STAR_COUNT = 70;

function useStars() {
  return useMemo(() => Array.from({ length: STAR_COUNT }, (_, i) => {
    const seed = (i * 1597 + 31337) % 10000;
    return {
      id: i,
      x: (seed * 73) % 100,
      y: (seed * 37) % 85,
      size: 1.5 + (seed % 10) * 0.25,
      duration: 2 + (seed % 40) * 0.1,
      delay: (seed % 50) * 0.1,
      color: i % 5 === 0 ? 'rgba(255,184,0,0.85)' : i % 7 === 0 ? 'rgba(0,212,255,0.8)' : 'rgba(240,244,255,0.7)',
      opacity: 0.15 + (seed % 45) / 100,
    };
  }), []);
}

export default function StudioBackground() {
  const stars = useStars();

  return (
    <div className="studio-container" aria-hidden="true">

      {/* ── Couche 1 : Fond profond multi-halos ──────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 90% 60% at 50% 115%, rgba(26,62,255,0.13) 0%, transparent 60%),
          radial-gradient(ellipse 50% 40% at 8% 55%, rgba(139,0,255,0.09) 0%, transparent 55%),
          radial-gradient(ellipse 50% 40% at 92% 55%, rgba(26,62,255,0.09) 0%, transparent 55%),
          radial-gradient(ellipse 35% 25% at 50% 8%, rgba(255,184,0,0.05) 0%, transparent 50%),
          radial-gradient(ellipse 60% 50% at 50% 50%, rgba(5,12,34,0.4) 0%, transparent 80%),
          var(--sky, #020510)
        `,
      }}/>

      {/* ── Couche 2 : Halos latéraux fixes ─────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 35% 80% at 0% 50%, rgba(26,62,255,0.06) 0%, transparent 70%),
          radial-gradient(ellipse 35% 80% at 100% 50%, rgba(139,0,255,0.05) 0%, transparent 70%)
        `,
      }}/>

      {/* ── Couche 3 : Grille de perspective SVG ────────────────────────── */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05 }}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="studio-grid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="var(--chrome, #A0AEC0)" strokeWidth="0.6"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#studio-grid)"/>
        {/* Lignes de perspective vers le centre bas */}
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(x => (
          <line key={x}
            x1={`${x}%`} y1="0%"
            x2="50%" y2="100%"
            stroke="rgba(26,62,255,0.04)" strokeWidth="0.8"
          />
        ))}
        {/* Lignes horizontales perspective (plus serrées vers le haut) */}
        {[15, 28, 40, 52, 63, 73, 82, 90].map((y, i) => (
          <line key={y}
            x1="0%" y1={`${y}%`}
            x2="100%" y2={`${y}%`}
            stroke="rgba(77,159,255,0.04)" strokeWidth="0.5"
          />
        ))}
      </svg>

      {/* ── Couche 4 : Spot lumineux gauche ─────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: 0, left: '-8%',
        width: '45%', height: '80%',
        background: 'conic-gradient(from 83deg at 4% 0%, transparent 0deg, rgba(26,62,255,0.07) 14deg, transparent 28deg)',
        transformOrigin: '4% 0%',
        animation: 'spot-sweep 8s ease-in-out infinite',
        pointerEvents: 'none',
      }}/>

      {/* ── Couche 5 : Spot lumineux droit ──────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: 0, right: '-8%',
        width: '45%', height: '80%',
        background: 'conic-gradient(from 269deg at 96% 0%, transparent 0deg, rgba(139,0,255,0.06) 14deg, transparent 28deg)',
        transformOrigin: '96% 0%',
        animation: 'spot-sweep 10s ease-in-out 4s infinite reverse',
        pointerEvents: 'none',
      }}/>

      {/* ── Couche 6 : Spot central doré ────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: 0, left: '30%',
        width: '40%', height: '65%',
        background: 'conic-gradient(from 79deg at 50% 0%, transparent 0deg, rgba(255,184,0,0.05) 18deg, transparent 36deg)',
        transformOrigin: '50% 0%',
        animation: 'spot-sweep 13s ease-in-out 2s infinite',
        pointerEvents: 'none',
      }}/>

      {/* ── Couche 7 : Étoiles / particules scintillantes ───────────────── */}
      {stars.map(s => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            borderRadius: '50%',
            background: s.color,
            boxShadow: s.id % 5 === 0
              ? `0 0 ${s.size * 3}px rgba(255,184,0,0.6)`
              : s.id % 7 === 0
              ? `0 0 ${s.size * 3}px rgba(0,212,255,0.6)`
              : `0 0 ${s.size * 2}px rgba(255,255,255,0.35)`,
            opacity: s.opacity,
            animation: `star-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}

      {/* ── Couche 8 : Lignes horizontales chromées ──────────────────────── */}
      <div style={{
        position: 'absolute', bottom: '14%', left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(160,174,192,0.12) 15%, rgba(160,174,192,0.28) 50%, rgba(160,174,192,0.12) 85%, transparent 100%)',
      }}/>
      <div style={{
        position: 'absolute', top: '8%', left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(26,62,255,0.08) 25%, rgba(77,159,255,0.18) 50%, rgba(26,62,255,0.08) 75%, transparent 100%)',
      }}/>

      {/* ── Couche 9 : Bande lumineuse bas ──────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, transparent 0%, var(--purple, #8B00FF) 15%, var(--blue-light, #4D9FFF) 35%, var(--teal, #00D4FF) 50%, var(--gold, #FFB800) 65%, var(--teal, #00D4FF) 80%, transparent 100%)',
        opacity: 0.7,
        filter: 'blur(0.5px)',
        animation: 'studio-pulse 2s ease-in-out infinite',
      }}/>
      <div style={{
        position: 'absolute', bottom: '2px', left: 0, right: 0,
        height: '16px',
        background: 'linear-gradient(180deg, rgba(77,159,255,0.1) 0%, transparent 100%)',
      }}/>

      {/* ── Couche 10 : Scanlines overlay très léger ────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0, 0, 0, 0.05) 2px,
          rgba(0, 0, 0, 0.05) 4px
        )`,
        pointerEvents: 'none',
      }}/>
    </div>
  );
}
