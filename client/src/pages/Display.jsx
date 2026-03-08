import { useState, useEffect, useRef } from 'react';
import Snow from '../components/Snow';
import ScoreBar from '../components/ScoreBar';
import { useSocket } from '../hooks/useSocket';

// ── HELPERS ────────────────────────────────────────────────────────────────────

function fmtTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

function playEndSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Three short beeps
    [0, 0.35, 0.7].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.3);
    });
  } catch {}
}

// ── SUB-SCREENS ────────────────────────────────────────────────────────────────

function LobbyScreen({ gs }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'32px', position:'relative', zIndex:1 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'5rem', marginBottom:'8px' }}>🎿⛷️🏔️</div>
        <h1 style={{
          fontFamily:'var(--font-display)', fontSize:'clamp(4rem,10vw,9rem)',
          color:'var(--yellow)', letterSpacing:'6px',
          textShadow:'6px 6px 0 #E65100, 0 0 40px #FFD600, 0 0 80px #FF6D00',
          lineHeight:1,
        }}>CHALET QUIZ</h1>
        <div style={{
          fontFamily:'var(--font-title)', fontSize:'clamp(1.2rem,3vw,2rem)',
          color:'var(--blue-light)', letterSpacing:'8px', marginTop:'8px',
          textShadow:'var(--shadow-neon-blue)',
        }}>❄ ÉDITION MONTAGNE ❄</div>
      </div>
      <div style={{
        display:'flex', gap:'40px', fontFamily:'var(--font-title)', fontSize:'1.4rem',
      }}>
        {[gs?.teamNames?.team1||'Équipe 1', gs?.teamNames?.team2||'Équipe 2'].map((name, i) => (
          <div key={i} style={{
            padding:'16px 32px',
            background: i===0 ? 'rgba(229,57,53,0.2)' : 'rgba(21,101,192,0.2)',
            border:`3px solid ${i===0?'var(--red-bright)':'var(--blue-light)'}`,
            borderRadius:'12px',
            boxShadow:`0 0 20px ${i===0?'#FF1744':'#42A5F5'}66`,
            color:'white',
          }}>
            {i===0?'🔴':'🔵'} {name}
          </div>
        ))}
      </div>
      <div style={{ fontFamily:'var(--font-body)', color:'rgba(255,255,255,0.4)', fontSize:'1rem', animation:'blink 2s ease infinite' }}>
        En attente du démarrage...
      </div>
    </div>
  );
}

function RoundIntroScreen({ gs }) {
  const round = gs.round;
  const typeLabels = { buzzer:'🔔 BUZZER', timer:'⏱ TIMER', blind_test:'🎵 BLIND TEST', face_puzzle:'👤 TÊTES MÉLANGÉES', wager:'🎲 PARIS', mime:'🎭 MIMES', creative:'🎨 CRÉATIVITÉ' };
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'24px', position:'relative', zIndex:1 }}>
      <div style={{ fontFamily:'var(--font-title)', fontSize:'1.6rem', color:'var(--teal)', letterSpacing:'4px' }}>
        MANCHE {gs.currentRoundIndex + 1}
      </div>
      <div className="anim-bounce-in" style={{
        fontFamily:'var(--font-display)', fontSize:'clamp(3rem,8vw,7rem)',
        color:'var(--yellow)', textShadow:'4px 4px 0 #E65100, 0 0 40px #FFD600',
        textAlign:'center', letterSpacing:'4px',
      }}>{round?.name || 'Nouvelle Manche'}</div>
      <div style={{
        fontFamily:'var(--font-title)', fontSize:'1.4rem',
        color:'var(--blue-light)', letterSpacing:'3px',
      }}>{typeLabels[round?.type] || ''}</div>
      {round?.description && (
        <div style={{
          maxWidth:'600px', textAlign:'center', color:'rgba(255,255,255,0.7)',
          fontSize:'1.1rem', padding:'16px 24px',
          background:'rgba(255,255,255,0.05)', borderRadius:'8px',
          border:'1px solid rgba(255,255,255,0.1)',
        }}>{round.description}</div>
      )}
    </div>
  );
}

function QuestionScreen({ gs }) {
  const [showQ, setShowQ] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShowQ(true), 200); return () => clearTimeout(t); }, [gs.question]);

  const img = gs.round?.questions?.[gs.currentQuestionIndex];

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'24px', position:'relative', zIndex:1, padding:'20px' }}>
      <div style={{ fontFamily:'var(--font-title)', color:'var(--teal)', letterSpacing:'4px', fontSize:'1rem' }}>
        {gs.round?.name} — Question {gs.currentQuestionIndex+1}/{gs.round?.questions?.length}
      </div>

      {showQ && (
        <div className="anim-slide-up retro-card" style={{
          padding:'28px 48px', maxWidth:'900px', textAlign:'center',
          fontSize:'clamp(1.2rem,2.5vw,2.2rem)', fontFamily:'var(--font-body)',
          fontWeight:800, lineHeight:1.4,
        }}>{gs.question}</div>
      )}

      {/* Image optionnelle */}
      {img?.imageUrl && (
        <img
          src={img.imageUrl}
          alt=""
          style={{ maxHeight:'38vh', maxWidth:'65vw', objectFit:'contain', borderRadius:'8px', border:'3px solid var(--blue-light)', boxShadow:'var(--shadow-neon-blue)' }}
        />
      )}

      {/* Buzzer status */}
      <div style={{ display:'flex', gap:'32px' }}>
        {['team1','team2'].map(team => {
          const hit = gs.buzzer?.winner === team;
          const locked = gs.buzzer?.locked?.includes(team);
          return (
            <div key={team} style={{
              padding:'10px 24px',
              fontFamily:'var(--font-title)', fontSize:'1.2rem',
              background: hit ? (team==='team1'?'rgba(229,57,53,0.4)':'rgba(21,101,192,0.4)') : locked ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.05)',
              border:`3px solid ${hit?(team==='team1'?'var(--red-bright)':'var(--blue-light)'):'rgba(255,255,255,0.2)'}`,
              borderRadius:'8px',
              boxShadow: hit ? `0 0 30px ${team==='team1'?'#FF1744':'#42A5F5'}` : 'none',
              color: locked ? 'rgba(255,255,255,0.3)' : 'white',
              animation: hit ? 'pulse-glow 1s ease infinite' : 'none',
            }}>
              {team==='team1'?'🔴':'🔵'} {gs.teamNames?.[team]}
              {hit && ' ✓ BUZZÉ !'}
              {locked && ' 🔒'}
            </div>
          );
        })}
      </div>

      {gs.answerVisible && (
        <div className="anim-bounce-in" style={{
          padding:'20px 44px',
          background:'rgba(0,200,83,0.15)',
          border:'3px solid var(--green)',
          borderRadius:'12px',
          boxShadow:'0 0 30px rgba(0,200,83,0.4)',
          fontSize:'clamp(1.4rem,3vw,2.2rem)',
          fontFamily:'var(--font-title)',
          color:'var(--green)',
          textAlign:'center',
        }}>✅ {gs.answer}</div>
      )}
    </div>
  );
}

function TimerRoundScreen({ gs }) {
  const [t1, setT1] = useState(gs.timer?.team1 ?? 60);
  const [t2, setT2] = useState(gs.timer?.team2 ?? 60);
  const { on } = useSocket();

  useEffect(() => {
    setT1(gs.timer?.team1 ?? 60);
    setT2(gs.timer?.team2 ?? 60);
  }, [gs.timer?.team1, gs.timer?.team2]);

  useEffect(() => {
    return on('timer_tick', ({ team, value }) => {
      if (team === 'team1') setT1(value);
      else setT2(value);
    });
  }, []);

  const fmt = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'32px', position:'relative', zIndex:1, padding:'20px' }}>
      <div style={{ fontFamily:'var(--font-title)', color:'var(--teal)', letterSpacing:'4px' }}>
        {gs.round?.name} — ⏱ MANCHE TIMER
      </div>

      {/* Question */}
      {gs.question && (
        <div className="retro-card" style={{ padding:'24px 40px', maxWidth:'800px', textAlign:'center', fontSize:'clamp(1.2rem,2.5vw,2rem)', fontWeight:800 }}>
          {gs.question}
        </div>
      )}

      {/* Timers */}
      <div style={{ display:'flex', gap:'48px', alignItems:'center' }}>
        {[{team:'team1',val:t1,color:'var(--red-bright)'},{team:'team2',val:t2,color:'var(--blue-light)'}].map(({team,val,color})=>{
          const active = gs.timer?.active === team;
          const warning = val <= 10;
          return (
            <div key={team} style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:'8px',
              padding:'24px 40px',
              background: active ? `${color}22` : 'rgba(0,0,0,0.3)',
              border:`4px solid ${active?color:'rgba(255,255,255,0.2)'}`,
              borderRadius:'16px',
              boxShadow: active ? `0 0 40px ${color}88` : 'none',
              animation: active ? 'pulse-glow 1.5s ease infinite' : 'none',
              transition:'all 0.3s ease',
            }}>
              <div style={{ fontFamily:'var(--font-title)', fontSize:'1rem', color:'rgba(255,255,255,0.6)' }}>
                {team==='team1'?'🔴':'🔵'} {gs.teamNames?.[team]}
              </div>
              <div style={{
                fontFamily:'var(--font-display)', fontSize:'clamp(3rem,7vw,6rem)',
                color: warning ? 'var(--red-bright)' : color,
                textShadow: `0 0 20px ${warning?'#FF1744':color}`,
                animation: warning&&active ? 'blink 0.5s ease infinite' : 'none',
                letterSpacing:'4px',
              }}>{fmt(val)}</div>
              {active && <div style={{ fontFamily:'var(--font-title)', color:'var(--yellow)', fontSize:'0.9rem', letterSpacing:'3px' }}>▶ EN COURS</div>}
            </div>
          );
        })}
      </div>

      {gs.answerVisible && (
        <div className="anim-bounce-in" style={{
          padding:'16px 36px', background:'rgba(0,200,83,0.15)',
          border:'3px solid var(--green)', borderRadius:'12px',
          fontSize:'clamp(1.2rem,2.5vw,1.8rem)', fontFamily:'var(--font-title)', color:'var(--green)',
        }}>✅ {gs.answer}</div>
      )}
    </div>
  );
}


function FacePuzzleScreen({ gs }) {
  const q = gs.round?.questions?.[gs.currentQuestionIndex];
  const found = gs.facePuzzle?.found || [false, false, false, false];

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'20px', position:'relative', zIndex:1, padding:'20px' }}>
      <div style={{ fontFamily:'var(--font-title)', color:'var(--teal)', letterSpacing:'4px', fontSize:'1rem' }}>
        {gs.round?.name}{q?.question ? ` — ${q.question}` : ''}
      </div>

      {/* Buzzer status */}
      <div style={{ display:'flex', gap:'24px' }}>
        {['team1','team2'].map(team => {
          const hit = gs.buzzer?.winner === team;
          const locked = gs.buzzer?.locked?.includes(team);
          return (
            <div key={team} style={{
              padding:'10px 24px',
              fontFamily:'var(--font-title)', fontSize:'1.1rem',
              background: hit ? (team==='team1'?'rgba(229,57,53,0.4)':'rgba(21,101,192,0.4)') : 'rgba(255,255,255,0.05)',
              border:`3px solid ${hit?(team==='team1'?'var(--red-bright)':'var(--blue-light)'):'rgba(255,255,255,0.2)'}`,
              borderRadius:'8px',
              boxShadow: hit ? `0 0 30px ${team==='team1'?'#FF1744':'#42A5F5'}` : 'none',
              color: locked ? 'rgba(255,255,255,0.3)' : 'white',
              animation: hit ? 'pulse-glow 1s ease infinite' : 'none',
            }}>
              {team==='team1'?'🔴':'🔵'} {gs.teamNames?.[team]}
              {hit && ' ✓ BUZZÉ !'}
              {locked && ' 🔒'}
            </div>
          );
        })}
      </div>

      {/* Face montage — single image cropped into 4 strips */}
      <div style={{
        width:'min(480px, 70vw)',
        flexShrink: 0,
        border:'4px solid var(--blue-light)',
        boxShadow:'var(--shadow-neon-blue)',
        borderRadius:'8px',
        overflow:'hidden',
      }}>
        {[0,1,2,3].map(pi => {
          const isFound = found[pi];
          const name = q?.names?.[pi] || '';
          return (
            <div key={pi} style={{ position:'relative', width:'100%', paddingBottom:'25%', overflow:'hidden' }}>
              {q?.imageUrl ? (
                <img
                  src={q.imageUrl}
                  alt=""
                  style={{ position:'absolute', width:'100%', top:`-${pi * 100}%`, display:'block' }}
                />
              ) : (
                <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.2)', fontFamily:'var(--font-title)', fontSize:'0.9rem' }}>
                  Bande {pi+1}
                </div>
              )}
              {isFound && (
                <div className="anim-slide-up" style={{
                  position:'absolute', inset:0,
                  background:'rgba(0, 200, 83, 0.38)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1rem,2.5vw,2rem)', color:'white', textShadow:'0 0 12px rgba(0,200,83,0.8), 2px 2px 0 rgba(0,0,0,0.5)' }}>
                    ✅ {name}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BlindTestScreen({ gs }) {
  const q = gs.round?.questions?.[gs.currentQuestionIndex];
  const audioRef = useRef(null);

  // Play / pause driven by server state
  useEffect(() => {
    if (!audioRef.current) return;
    if (gs.blindTest?.playing) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [gs.blindTest?.playing]);

  // Reset audio when question changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [gs.currentQuestionIndex]);

  const hit = gs.buzzer?.winner;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'28px', position:'relative', zIndex:1, padding:'20px' }}>
      {q?.audioUrl && <audio ref={audioRef} src={q.audioUrl}/>}

      <div style={{ fontFamily:'var(--font-title)', color:'var(--teal)', letterSpacing:'4px' }}>{gs.round?.name}</div>

      <div style={{
        fontSize:'8rem',
        animation: gs.blindTest?.playing ? 'pulse-glow 1s ease infinite' : 'none',
        filter: gs.blindTest?.playing ? 'drop-shadow(0 0 20px #FFD600)' : 'none',
        transition:'filter 0.3s',
      }}>🎵</div>

      {/* Buzzer status */}
      {!gs.blindTest?.revealed && (
        <div style={{ display:'flex', gap:'24px' }}>
          {['team1','team2'].map(team => {
            const isWinner = hit === team;
            const locked = gs.buzzer?.locked?.includes(team);
            return (
              <div key={team} style={{
                padding:'10px 28px', fontFamily:'var(--font-title)', fontSize:'1.2rem',
                background: isWinner ? (team==='team1'?'rgba(229,57,53,0.4)':'rgba(21,101,192,0.4)') : 'rgba(255,255,255,0.05)',
                border:`3px solid ${isWinner?(team==='team1'?'var(--red-bright)':'var(--blue-light)'):'rgba(255,255,255,0.2)'}`,
                borderRadius:'8px',
                boxShadow: isWinner ? `0 0 30px ${team==='team1'?'#FF1744':'#42A5F5'}` : 'none',
                color: locked ? 'rgba(255,255,255,0.3)' : 'white',
                animation: isWinner ? 'pulse-glow 1s ease infinite' : 'none',
              }}>
                {team==='team1'?'🔴':'🔵'} {gs.teamNames?.[team]}
                {isWinner && ' ✓ BUZZÉ !'}
                {locked && ' 🔒'}
              </div>
            );
          })}
        </div>
      )}

      {/* Révélation */}
      {gs.blindTest?.revealed && (
        <div className="anim-bounce-in" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', textAlign:'center' }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(2.5rem,7vw,5.5rem)', color:'var(--yellow)', textShadow:'4px 4px 0 #E65100, 0 0 40px #FFD600', lineHeight:1.1 }}>
            {gs.answer}
          </div>
          {gs.question && (
            <div style={{ fontFamily:'var(--font-title)', fontSize:'clamp(1.2rem,3vw,2rem)', color:'rgba(255,255,255,0.7)', letterSpacing:'2px' }}>
              {gs.question}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MimeScreen({ gs }) {
  const [remaining, setRemaining] = useState(gs.mime?.remaining ?? 0);
  const { on } = useSocket();

  useEffect(() => { setRemaining(gs.mime?.remaining ?? 0); }, [gs.mime?.remaining, gs.mime?.running]);
  useEffect(() => on('mime_tick', ({ value }) => setRemaining(value)), []);
  useEffect(() => on('mime_expired', () => { setRemaining(0); playEndSound(); }), []);

  const team = gs.mime?.team;
  const teamColor = team === 'team1' ? 'var(--red-bright)' : team === 'team2' ? 'var(--blue-light)' : 'var(--yellow)';
  const warning = remaining <= 10 && remaining > 0 && gs.mime?.running;

  const subRounds = gs.round?.subRounds || [];
  const srIdx = gs.mime?.subRoundIndex ?? -1;
  const currentSr = subRounds[srIdx];
  const hasStarted = srIdx >= 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'24px', position:'relative', zIndex:1, padding:'20px' }}>
      <div style={{ fontFamily:'var(--font-title)', color:'var(--teal)', letterSpacing:'4px', fontSize:'1rem' }}>
        {gs.round?.name}
      </div>

      {/* Sub-round indicator */}
      {hasStarted && currentSr && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}>
          <div style={{ fontFamily:'var(--font-title)', fontSize:'0.85rem', color:'rgba(255,255,255,0.4)', letterSpacing:'3px' }}>
            SOUS-MANCHE {srIdx + 1}/{subRounds.length}
          </div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.8rem,4vw,3rem)', color:'var(--yellow)', textShadow:'3px 3px 0 #E65100, 0 0 20px #FFD600', letterSpacing:'3px' }}>
            {currentSr.label}
          </div>
        </div>
      )}

      {!hasStarted && (
        <div style={{ fontFamily:'var(--font-title)', color:'rgba(255,255,255,0.3)', fontSize:'1.2rem', letterSpacing:'3px' }}>
          EN ATTENTE
        </div>
      )}

      {/* Équipe en cours */}
      {hasStarted && (
        team ? (
          <div style={{ fontFamily:'var(--font-title)', fontSize:'clamp(1.4rem,3vw,2rem)', color: teamColor, textShadow:`0 0 20px ${teamColor}`, letterSpacing:'2px' }}>
            {team==='team1'?'🔴':'🔵'} {gs.teamNames?.[team]}
          </div>
        ) : (
          <div style={{ fontFamily:'var(--font-title)', color:'rgba(255,255,255,0.35)', fontSize:'1.1rem', letterSpacing:'3px' }}>
            Choisir une équipe
          </div>
        )
      )}

      {/* Chrono */}
      <div style={{
        fontFamily:'var(--font-display)',
        fontSize:'clamp(6rem,18vw,14rem)',
        color: warning ? 'var(--red-bright)' : (remaining === 0 ? 'rgba(255,255,255,0.2)' : teamColor),
        textShadow: remaining > 0 ? `0 0 50px ${warning ? '#FF1744' : teamColor}` : 'none',
        animation: warning ? 'blink 0.5s ease infinite' : 'none',
        letterSpacing:'4px', lineHeight:1,
      }}>
        {fmtTime(remaining)}
      </div>

      {gs.round?.points && (
        <div style={{ fontFamily:'var(--font-title)', color:'var(--green)', fontSize:'1.1rem' }}>
          {gs.round.points} point{gs.round.points > 1 ? 's' : ''} en jeu
        </div>
      )}
    </div>
  );
}

function CreativeScreen({ gs }) {
  const [remaining, setRemaining] = useState(gs.creative?.remaining ?? 0);
  const { on } = useSocket();

  useEffect(() => { setRemaining(gs.creative?.remaining ?? 0); }, [gs.creative?.remaining, gs.creative?.running]);
  useEffect(() => on('creative_tick', ({ value }) => setRemaining(value)), []);
  useEffect(() => on('creative_expired', () => { setRemaining(0); playEndSound(); }), []);

  const warning = remaining <= 10 && remaining > 0 && gs.creative?.running;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'24px', position:'relative', zIndex:1, padding:'24px' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(2rem,5vw,4rem)', color:'var(--yellow)', textShadow:'4px 4px 0 #E65100, 0 0 30px #FFD600', letterSpacing:'4px', textAlign:'center' }}>
        {gs.round?.name}
      </div>

      {gs.round?.description && (
        <div className="retro-card" style={{ padding:'20px 36px', maxWidth:'750px', textAlign:'center', fontFamily:'var(--font-body)', fontSize:'clamp(1rem,2vw,1.3rem)', color:'rgba(255,255,255,0.85)', lineHeight:1.5 }}>
          {gs.round.description}
        </div>
      )}

      {/* Chrono */}
      <div style={{
        fontFamily:'var(--font-display)',
        fontSize:'clamp(5rem,15vw,12rem)',
        color: warning ? 'var(--red-bright)' : (remaining === 0 ? 'rgba(255,255,255,0.2)' : 'var(--yellow)'),
        textShadow: remaining > 0 ? `0 0 50px ${warning ? '#FF1744' : '#FFD600'}` : 'none',
        animation: warning ? 'blink 0.5s ease infinite' : 'none',
        letterSpacing:'4px', lineHeight:1,
      }}>
        {fmtTime(remaining)}
      </div>

      {gs.round?.points && (
        <div style={{ fontFamily:'var(--font-title)', color:'var(--green)', fontSize:'1.3rem', letterSpacing:'2px' }}>
          🏆 {gs.round.points} point{gs.round.points > 1 ? 's' : ''} en jeu
        </div>
      )}
    </div>
  );
}

function WagerScreen({ gs }) {
  const { phase, bet, assignedTeam, theme } = gs.wager || {};
  const otherTeam = assignedTeam === 'team1' ? 'team2' : 'team1';
  const assignedColor = assignedTeam === 'team1' ? 'var(--red-bright)' : 'var(--blue-light)';
  const otherColor = otherTeam === 'team1' ? 'var(--red-bright)' : 'var(--blue-light)';

  const BuzzerBadge = ({ team, color }) => {
    const hit = gs.buzzer?.winner === team;
    const locked = gs.buzzer?.locked?.includes(team);
    return (
      <div style={{
        padding:'10px 28px', fontFamily:'var(--font-title)', fontSize:'1.1rem',
        background: hit ? `${color}33` : 'rgba(255,255,255,0.05)',
        border:`3px solid ${hit ? color : 'rgba(255,255,255,0.2)'}`,
        borderRadius:'8px', boxShadow: hit ? `0 0 30px ${color}88` : 'none',
        color: locked ? 'rgba(255,255,255,0.3)' : 'white',
        animation: hit ? 'pulse-glow 1s ease infinite' : 'none',
      }}>
        {team==='team1'?'🔴':'🔵'} {gs.teamNames?.[team]}
        {hit && ' ✓ BUZZÉ !'}{locked && ' 🔒'}
      </div>
    );
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'28px', position:'relative', zIndex:1, padding:'20px' }}>
      <div style={{ fontFamily:'var(--font-title)', color:'var(--teal)', letterSpacing:'4px', fontSize:'1rem' }}>
        {gs.round?.name}
      </div>

      {phase === 'betting' && (
        <>
          <div style={{ fontFamily:'var(--font-title)', fontSize:'1.2rem', color: assignedColor, letterSpacing:'3px' }}>
            {assignedTeam==='team1'?'🔴':'🔵'} {gs.teamNames?.[assignedTeam]} — MISEZ !
          </div>
          <div className="anim-bounce-in retro-card" style={{ padding:'40px 60px', textAlign:'center', maxWidth:'800px' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(2.5rem,7vw,5.5rem)', color:'var(--yellow)', textShadow:'4px 4px 0 #E65100, 0 0 40px #FFD600', lineHeight:1.1 }}>
              {theme || '?'}
            </div>
          </div>
          <div style={{ fontFamily:'var(--font-body)', color:'rgba(255,255,255,0.45)', fontSize:'1rem' }}>
            {gs.teamNames?.[otherTeam]} attend...
          </div>
        </>
      )}

      {phase === 'question' && (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
            <BuzzerBadge team={assignedTeam} color={assignedColor}/>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--yellow)', textShadow:'0 0 20px #FFD600' }}>
              {bet} pts
            </div>
          </div>
          <div className="retro-card" style={{ padding:'32px 60px', maxWidth:'900px', textAlign:'center', fontSize:'clamp(1.4rem,3vw,2.4rem)', fontFamily:'var(--font-body)', fontWeight:800, lineHeight:1.4 }}>
            {gs.question}
          </div>
          {gs.answerVisible && (
            <div className="anim-bounce-in" style={{ padding:'20px 44px', background:'rgba(0,200,83,0.15)', border:'3px solid var(--green)', borderRadius:'12px', boxShadow:'0 0 30px rgba(0,200,83,0.4)', fontSize:'clamp(1.4rem,3vw,2.2rem)', fontFamily:'var(--font-title)', color:'var(--green)', textAlign:'center' }}>
              ✅ {gs.answer}
            </div>
          )}
        </>
      )}

      {phase === 'steal' && (
        <>
          <div style={{ fontFamily:'var(--font-title)', fontSize:'1.3rem', color:'var(--yellow)', letterSpacing:'4px', animation:'pulse-glow 1s ease infinite' }}>
            🎯 TENTATIVE DE VOL
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
            <BuzzerBadge team={otherTeam} color={otherColor}/>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--yellow)', textShadow:'0 0 20px #FFD600' }}>
              {bet} pts
            </div>
          </div>
          <div className="retro-card" style={{ padding:'32px 60px', maxWidth:'900px', textAlign:'center', fontSize:'clamp(1.4rem,3vw,2.4rem)', fontFamily:'var(--font-body)', fontWeight:800, lineHeight:1.4 }}>
            {gs.question}
          </div>
          {gs.answerVisible && (
            <div className="anim-bounce-in" style={{ padding:'20px 44px', background:'rgba(0,200,83,0.15)', border:'3px solid var(--green)', borderRadius:'12px', boxShadow:'0 0 30px rgba(0,200,83,0.4)', fontSize:'clamp(1.4rem,3vw,2.2rem)', fontFamily:'var(--font-title)', color:'var(--green)', textAlign:'center' }}>
              ✅ {gs.answer}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RoundRecapScreen({ gs }) {
  const prev = gs.prevScores || { team1: 0, team2: 0 };
  const curr = gs.scores || { team1: 0, team2: 0 };
  const gained = gs.roundScores || { team1: 0, team2: 0 };
  const [displayed, setDisplayed] = useState({ team1: prev.team1, team2: prev.team2 });
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed({ team1: prev.team1, team2: prev.team2 });
    setDone(false);
    const delay = setTimeout(() => {
      const duration = 1800;
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplayed({
          team1: Math.round(prev.team1 + (curr.team1 - prev.team1) * eased),
          team2: Math.round(prev.team2 + (curr.team2 - prev.team2) * eased),
        });
        if (t < 1) requestAnimationFrame(tick);
        else setDone(true);
      };
      requestAnimationFrame(tick);
    }, 700);
    return () => clearTimeout(delay);
  }, [gs.currentRoundIndex]);

  const leader = curr.team1 > curr.team2 ? 'team1' : curr.team2 > curr.team1 ? 'team2' : null;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'32px', position:'relative', zIndex:1, padding:'20px' }}>
      <div style={{ fontFamily:'var(--font-title)', color:'var(--teal)', letterSpacing:'4px', fontSize:'1rem' }}>
        BILAN — {gs.round?.name}
      </div>
      <div style={{ display:'flex', gap:'48px', alignItems:'flex-end' }}>
        {[{team:'team1',color:'var(--red-bright)',hex:'#FF1744'},{team:'team2',color:'var(--blue-light)',hex:'#42A5F5'}].map(({team,color,hex}) => {
          const isLeader = done && leader === team;
          const pts = gained[team] || 0;
          return (
            <div key={team} className={isLeader ? 'anim-bounce-in' : ''} style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:'10px',
              padding:'28px 44px',
              background: isLeader ? `${color}22` : 'rgba(0,0,0,0.3)',
              border:`4px solid ${isLeader ? color : 'rgba(255,255,255,0.2)'}`,
              borderRadius:'16px',
              boxShadow: isLeader ? `0 0 50px ${hex}88` : 'none',
              transition:'all 0.5s ease',
            }}>
              <div style={{ fontFamily:'var(--font-title)', fontSize:'1rem', color:'rgba(255,255,255,0.6)' }}>
                {team==='team1'?'🔴':'🔵'} {gs.teamNames?.[team]}
              </div>
              {pts > 0 && (
                <div style={{ fontFamily:'var(--font-title)', fontSize:'1.3rem', color:'var(--green)', textShadow:'0 0 12px #00C853' }}>
                  +{pts} pts cette manche
                </div>
              )}
              <div style={{
                fontFamily:'var(--font-display)', fontSize:'clamp(4rem,10vw,8rem)',
                color, textShadow:`0 0 20px ${color}`, lineHeight:1,
                transition:'all 0.1s',
              }}>{displayed[team]}</div>
              {isLeader && (
                <div style={{ fontFamily:'var(--font-title)', color:'var(--yellow)', letterSpacing:'3px', fontSize:'1rem', animation:'pulse-glow 1.5s ease infinite' }}>
                  ⭐ EN TÊTE ⭐
                </div>
              )}
            </div>
          );
        })}
      </div>
      {done && !leader && (
        <div style={{ fontFamily:'var(--font-title)', fontSize:'1.5rem', color:'var(--teal)' }}>🤝 ÉGALITÉ !</div>
      )}
    </div>
  );
}

function ScoresScreen({ gs }) {
  const team1 = gs.scores?.team1 || 0;
  const team2 = gs.scores?.team2 || 0;
  const winner = team1 > team2 ? 'team1' : team2 > team1 ? 'team2' : null;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'40px', position:'relative', zIndex:1 }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(2rem,5vw,4rem)', color:'var(--yellow)', letterSpacing:'6px', textShadow:'0 0 30px #FFD600' }}>
        🏆 SCORES
      </div>
      <div style={{ display:'flex', gap:'60px', alignItems:'flex-end' }}>
        {[{team:'team1',score:team1,color:'var(--red-bright)',emoji:'🔴'},{team:'team2',score:team2,color:'var(--blue-light)',emoji:'🔵'}].map(({team,score,color,emoji})=>(
          <div key={team} className="anim-bounce-in" style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:'12px',
            padding:'32px 48px',
            background: winner===team ? `${color}22` : 'rgba(0,0,0,0.3)',
            border:`4px solid ${winner===team?color:'rgba(255,255,255,0.2)'}`,
            borderRadius:'16px',
            boxShadow: winner===team ? `0 0 50px ${color}88` : 'none',
          }}>
            <div style={{ fontSize:'3rem' }}>{winner===team?'🥇':emoji}</div>
            <div style={{ fontFamily:'var(--font-title)', fontSize:'1.3rem', color:'rgba(255,255,255,0.7)' }}>{gs.teamNames?.[team]}</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(4rem,10vw,8rem)', color, textShadow:`0 0 20px ${color}`, lineHeight:1 }}>{score}</div>
            {winner===team && <div style={{ fontFamily:'var(--font-title)', color:'var(--yellow)', letterSpacing:'3px', fontSize:'1rem' }}>⭐ EN TÊTE ⭐</div>}
          </div>
        ))}
      </div>
      {!winner && <div style={{ fontFamily:'var(--font-title)', fontSize:'1.5rem', color:'var(--teal)' }}>🤝 ÉGALITÉ !</div>}
    </div>
  );
}

function EndScreen({ gs }) {
  const team1 = gs.scores?.team1 || 0;
  const team2 = gs.scores?.team2 || 0;
  const winner = team1 > team2 ? gs.teamNames?.team1 : team2 > team1 ? gs.teamNames?.team2 : null;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'32px', position:'relative', zIndex:1, textAlign:'center' }}>
      <div style={{ fontSize:'6rem' }}>🏔️🎿🏆</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(3rem,8vw,7rem)', color:'var(--yellow)', textShadow:'6px 6px 0 #E65100, 0 0 60px #FFD600', letterSpacing:'4px' }}>
        FIN DU JEU !
      </div>
      {winner ? (
        <>
          <div style={{ fontFamily:'var(--font-title)', fontSize:'1.4rem', color:'rgba(255,255,255,0.6)' }}>Et le grand vainqueur est...</div>
          <div className="anim-bounce-in" style={{ fontFamily:'var(--font-display)', fontSize:'clamp(2.5rem,7vw,6rem)', color:'var(--green)', textShadow:'0 0 40px #00C853', letterSpacing:'3px' }}>
            🥇 {winner} 🥇
          </div>
        </>
      ) : (
        <div style={{ fontFamily:'var(--font-display)', fontSize:'3rem', color:'var(--teal)' }}>🤝 MATCH NUL !</div>
      )}
      <div style={{ display:'flex', gap:'32px', fontFamily:'var(--font-title)', fontSize:'1.4rem' }}>
        <span style={{ color:'var(--red-bright)' }}>🔴 {gs.teamNames?.team1}: {team1} pts</span>
        <span style={{ color:'var(--blue-light)' }}>🔵 {gs.teamNames?.team2}: {team2} pts</span>
      </div>
    </div>
  );
}

// ── MAIN DISPLAY ───────────────────────────────────────────────────────────────
export default function Display() {
  const { gameState: gs, connected } = useSocket();

  if (!gs) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'var(--font-title)', fontSize:'1.5rem', color:'var(--blue-light)' }}>
      <Snow count={20}/>
      <span style={{ position:'relative', zIndex:1 }}>⏳ Connexion au serveur...</span>
    </div>
  );

  const renderScreen = () => {
    switch(gs.screen) {
      case 'round_intro': return <RoundIntroScreen gs={gs}/>;
      case 'question': return <QuestionScreen gs={gs}/>;
      case 'timer_round': return <TimerRoundScreen gs={gs}/>;
      case 'face_puzzle': return <FacePuzzleScreen gs={gs}/>;
      case 'wager': return <WagerScreen gs={gs}/>;
      case 'mime': return <MimeScreen gs={gs}/>;
      case 'creative': return <CreativeScreen gs={gs}/>;
      case 'blind_test': return <BlindTestScreen gs={gs}/>;
      case 'round_recap': return <RoundRecapScreen gs={gs}/>;
      case 'scores': return <ScoresScreen gs={gs}/>;
      case 'end': return <EndScreen gs={gs}/>;
      default: return <LobbyScreen gs={gs}/>;
    }
  };

  const showScoreBar = !['lobby','end','scores','round_intro','round_recap'].includes(gs.screen);

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' }}>
      <Snow count={35}/>
      {showScoreBar && <ScoreBar scores={gs.roundScores} teamNames={gs.teamNames} highlight={gs.buzzer?.winner || gs.timer?.active}/>}
      <div style={{ flex:1, position:'relative', zIndex:1 }}>
        {renderScreen()}
      </div>
      {!connected && (
        <div style={{ position:'fixed', bottom:'12px', right:'12px', background:'rgba(229,57,53,0.9)', padding:'8px 16px', borderRadius:'6px', fontFamily:'var(--font-title)', fontSize:'0.9rem', zIndex:999 }}>
          ⚠ Déconnecté
        </div>
      )}
    </div>
  );
}
