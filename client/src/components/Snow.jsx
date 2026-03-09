import { useMemo } from 'react';

const FLAKES = ['❄', '❅', '❆', '✦', '·'];

export default function Snow({ count = 30 }) {
  const flakes = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 0.6 + Math.random() * 1.4,
    duration: 6 + Math.random() * 14,
    delay: Math.random() * 12,
    char: FLAKES[Math.floor(Math.random() * FLAKES.length)],
    opacity: 0.4 + Math.random() * 0.6,
  })), [count]);

  return (
    <div className="snow-container">
      {flakes.map(f => (
        <div
          key={f.id}
          className="snowflake"
          style={{
            left: `${f.left}%`,
            fontSize: `${f.size}rem`,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
            opacity: f.opacity,
          }}
        >
          {f.char}
        </div>
      ))}
      {/* Mountain silhouette */}
      <svg
        style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', pointerEvents: 'none', zIndex: 0 }}
        viewBox="0 0 1440 200" preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon points="0,200 0,140 120,60 240,120 360,20 480,100 600,40 720,110 840,30 960,90 1080,50 1200,100 1320,60 1440,80 1440,200" fill="#2C1A0E" opacity="0.95"/>
        <polygon points="0,200 0,160 160,100 300,150 440,80 560,130 700,70 820,130 960,60 1100,110 1240,80 1380,110 1440,90 1440,200" fill="#1E1008" />
        {/* Snow caps */}
        <polygon points="120,60 100,70 140,70" fill="#F5F0E8" opacity="0.6"/>
        <polygon points="360,20 340,38 380,38" fill="#F5F0E8" opacity="0.7"/>
        <polygon points="600,40 578,58 622,58" fill="#F5F0E8" opacity="0.6"/>
        <polygon points="840,30 815,52 865,52" fill="#F5F0E8" opacity="0.7"/>
        <polygon points="1080,50 1058,68 1102,68" fill="#F5F0E8" opacity="0.5"/>
      </svg>
    </div>
  );
}
