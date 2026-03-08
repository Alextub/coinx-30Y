import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import Snow from '../components/Snow';

export default function Buzzer() {
  const { gameState: gs, emit, on } = useSocket();
  const [team, setTeam] = useState(null);
  const [state, setState] = useState('idle'); // idle | buzzed | locked | waiting
  const [flash, setFlash] = useState(false);
  const audioCtx = useRef(null);

  // Get team from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('team');
    if (t === 'team1' || t === 'team2') setTeam(t);
  }, []);

  // Sync state from game state
  useEffect(() => {
    if (!gs || !team) return;
    if (gs.buzzer?.winner === team) setState('buzzed');
    else if (gs.buzzer?.locked?.includes(team)) setState('locked');
    else if (gs.buzzer?.active) setState('waiting');
    else setState('idle');
  }, [gs, team]);

  // Listen for buzzer events
  useEffect(() => {
    return on('buzzer_hit', ({ team: winner }) => {
      if (winner === team) {
        triggerHaptic();
        playBuzz(true);
        setFlash(true);
        setTimeout(() => setFlash(false), 1000);
      } else {
        playBuzz(false);
      }
    });
  }, [team]);

  const triggerHaptic = () => {
    if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
  };

  const playBuzz = (win) => {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      if (win) {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start(); osc.stop(ctx.currentTime + 0.6);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
      }
    } catch(e) {}
  };

  const handleBuzz = () => {
    if (state !== 'waiting') return;
    emit('buzzer_press', { team });
  };

  if (!team) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'24px', padding:'20px', position:'relative' }}>
        <Snow count={15}/>
        <div style={{ position:'relative', zIndex:1, textAlign:'center' }}>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'3rem', color:'var(--yellow)', marginBottom:'24px' }}>🎿 CHALET QUIZ</h1>
          <p style={{ fontFamily:'var(--font-title)', color:'rgba(255,255,255,0.6)', marginBottom:'32px', fontSize:'1.1rem' }}>Choisissez votre équipe :</p>
          <div style={{ display:'flex', gap:'16px', flexDirection:'column' }}>
            {gs?.teamNames && (
              <>
                <a href="?team=team1" style={{ textDecoration:'none' }}>
                  <div style={{ padding:'20px 40px', background:'rgba(229,57,53,0.2)', border:'3px solid var(--red-bright)', borderRadius:'12px', fontFamily:'var(--font-title)', fontSize:'1.5rem', color:'white', boxShadow:'0 0 20px rgba(255,23,68,0.4)' }}>
                    🔴 {gs.teamNames.team1}
                  </div>
                </a>
                <a href="?team=team2" style={{ textDecoration:'none' }}>
                  <div style={{ padding:'20px 40px', background:'rgba(21,101,192,0.2)', border:'3px solid var(--blue-light)', borderRadius:'12px', fontFamily:'var(--font-title)', fontSize:'1.5rem', color:'white', boxShadow:'0 0 20px rgba(66,165,245,0.4)' }}>
                    🔵 {gs.teamNames.team2}
                  </div>
                </a>
              </>
            )}
            {!gs?.teamNames && <div style={{ color:'rgba(255,255,255,0.4)', fontFamily:'var(--font-title)' }}>Connexion...</div>}
          </div>
        </div>
      </div>
    );
  }

  const isTeam1 = team === 'team1';
  const teamName = gs?.teamNames?.[team] || (isTeam1 ? 'Équipe 1' : 'Équipe 2');
  const teamColor = isTeam1 ? 'var(--red-bright)' : 'var(--blue-light)';
  const teamColorHex = isTeam1 ? '#FF1744' : '#42A5F5';

  const config = {
    idle: {
      bg: 'rgba(0,0,0,0.5)', border: 'rgba(255,255,255,0.2)',
      label: '⏸ EN ATTENTE', sublabel: "La manche n'a pas encore démarré",
      btnBg: 'rgba(255,255,255,0.1)', btnColor: 'rgba(255,255,255,0.3)',
      emoji: '⛷️',
    },
    waiting: {
      bg: `${teamColorHex}22`, border: teamColorHex,
      label: '🔔 PRÊT !', sublabel: 'Appuie dès que tu connais la réponse !',
      btnBg: `${teamColorHex}cc`, btnColor: 'white',
      emoji: '⚡',
    },
    buzzed: {
      bg: 'rgba(0,200,83,0.2)', border: '#00C853',
      label: '✅ BUZZÉ !', sublabel: 'Tu as la parole !',
      btnBg: 'rgba(0,200,83,0.3)', btnColor: 'var(--green)',
      emoji: '🎉',
    },
    locked: {
      bg: 'rgba(0,0,0,0.5)', border: 'rgba(255,255,255,0.2)',
      label: '🔒 BLOQUÉ', sublabel: "Une autre équipe a buzzé en premier",
      btnBg: 'rgba(255,255,255,0.05)', btnColor: 'rgba(255,255,255,0.2)',
      emoji: '😬',
    },
  };

  const c = config[state];

  return (
    <div style={{
      minHeight: '100vh', display:'flex', flexDirection:'column',
      background: flash ? `${teamColorHex}44` : 'var(--sky)',
      transition:'background 0.2s ease',
      position:'relative', overflow:'hidden',
    }}>
      <Snow count={10}/>
      <div style={{ position:'relative', zIndex:1, flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-between', padding:'24px 20px' }}>

        {/* Header */}
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', color:'var(--yellow)', letterSpacing:'3px' }}>CHALET QUIZ</div>
          <div style={{ fontFamily:'var(--font-title)', fontSize:'1rem', color:teamColor, marginTop:'4px' }}>
            {isTeam1?'🔴':'🔵'} {teamName}
          </div>
        </div>

        {/* Status */}
        <div style={{
          display:'flex', flexDirection:'column', alignItems:'center', gap:'8px',
          padding:'16px 24px',
          background: c.bg, border:`2px solid ${c.border}`,
          borderRadius:'12px', textAlign:'center',
          boxShadow: state==='waiting' ? `0 0 30px ${teamColorHex}66` : 'none',
          transition:'all 0.3s ease',
        }}>
          <div style={{ fontSize:'2rem' }}>{c.emoji}</div>
          <div style={{ fontFamily:'var(--font-title)', fontSize:'1.3rem', color:'white' }}>{c.label}</div>
          <div style={{ fontFamily:'var(--font-body)', fontSize:'0.9rem', color:'rgba(255,255,255,0.5)' }}>{c.sublabel}</div>
        </div>

        {/* BIG BUZZER BUTTON */}
        <button
          onPointerDown={handleBuzz}
          disabled={state !== 'waiting'}
          style={{
            width:'min(280px,75vw)', height:'min(280px,75vw)',
            borderRadius:'50%',
            background: c.btnBg,
            border:`6px solid ${c.border}`,
            color: c.btnColor,
            fontFamily:'var(--font-display)',
            fontSize:'clamp(2rem,8vw,3.5rem)',
            letterSpacing:'3px',
            cursor: state==='waiting' ? 'pointer' : 'default',
            boxShadow: state==='waiting' ? `0 0 60px ${teamColorHex}88, inset 0 0 20px rgba(0,0,0,0.3)` : 'inset 0 0 20px rgba(0,0,0,0.3)',
            animation: state==='waiting' ? 'pulse-glow 1.5s ease infinite' : 'none',
            transition:'all 0.2s ease',
            touchAction:'none',
            WebkitTapHighlightColor:'transparent',
            userSelect:'none',
          }}
        >
          BUZZ !
        </button>

        {/* Score display */}
        {gs?.scores && (
          <div style={{ display:'flex', gap:'24px', fontFamily:'var(--font-title)', fontSize:'1rem' }}>
            <span style={{ color:'var(--red-bright)' }}>🔴 {gs.scores.team1}</span>
            <span style={{ color:'rgba(255,255,255,0.3)' }}>pts</span>
            <span style={{ color:'var(--blue-light)' }}>🔵 {gs.scores.team2}</span>
          </div>
        )}
      </div>
    </div>
  );
}
