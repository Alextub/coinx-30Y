import { useState, useEffect, useRef } from 'react';
import Snow from '../components/Snow';
import StudioBackground from '../components/StudioBackground';
import ScoreBar from '../components/ScoreBar';
import { useSocket } from '../hooks/useSocket';

// ── HELPERS ────────────────────────────────────────────────────────────────────

function fmtTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

// ── AUDIO ENGINE ───────────────────────────────────────────────────────────────
let _audioCtx = null;

function getCtx() {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function playTick(warning = false) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = warning ? 1100 : 750;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(warning ? 0.22 : 0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.start(t); osc.stop(t + 0.07);
  } catch {}
}

function playEndSound() {
  try {
    const ctx = getCtx();
    // Trois bips montants
    [0, 0.22, 0.44].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = 330 * Math.pow(1.5, i);
      gain.gain.setValueAtTime(0.2 + i * 0.1, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
      osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.22);
    });
    // Alarme finale (3 impulsions sawtooth)
    [0.75, 1.0, 1.25].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.38, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.18);
      osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.2);
    });
  } catch {}
}

// ── SUB-SCREENS ────────────────────────────────────────────────────────────────

function WaitingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', position: 'relative', zIndex: 1,
    }}>
      {/* Halo pulsant central */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '40vw', height: '40vw', borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(77,159,255,0.07) 0%, transparent 65%)',
        animation: 'tv-pulse-glow 3s ease-in-out infinite',
      }}/>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', position: 'relative' }}>
        {/* Cercle pulsant */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          border: '2px solid rgba(77,159,255,0.35)',
          boxShadow: '0 0 20px rgba(77,159,255,0.2), inset 0 0 20px rgba(77,159,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse-glow 2s ease-in-out infinite',
          color: 'var(--blue-light)',
        }}>
          <div style={{
            width: '16px', height: '16px', borderRadius: '50%',
            background: 'var(--blue-light)',
            boxShadow: '0 0 12px var(--blue-light)',
            animation: 'blink 1.5s ease-in-out infinite',
          }}/>
        </div>

        <div style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontWeight: 900,
          fontSize: 'clamp(2rem, 5vw, 4rem)',
          color: 'var(--blue-light)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          textShadow: '0 0 20px rgba(77,159,255,0.6), 0 0 50px rgba(77,159,255,0.2)',
          animation: 'teletext-blink 1.2s step-start infinite',
        }}>
          EN ATTENTE
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'clamp(0.7rem, 1.5vw, 0.95rem)',
          color: 'rgba(77,159,255,0.4)',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
        }}>
          Connexion etablie — demarrage imminent
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: 'var(--blue-light)',
              boxShadow: '0 0 8px var(--blue-light)',
              animation: `blink 1.2s ease ${i * 0.35}s infinite`,
            }}/>
          ))}
        </div>
      </div>
    </div>
  );
}

function GameIntroScreen({ gs }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
    const timers = [
      setTimeout(() => setStep(1), 400),
      setTimeout(() => setStep(2), 1600),
      setTimeout(() => setStep(3), 3200),
      setTimeout(() => setStep(4), 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: '32px', position: 'relative', zIndex: 1, overflow: 'hidden',
    }}>
      {/* Rayons rotatifs */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{
          width: '260vmax', height: '260vmax',
          background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,184,0,0.045) 7deg, transparent 14deg, transparent 21deg, rgba(26,62,255,0.025) 28deg, transparent 35deg)',
          animation: step >= 1 ? 'rays 20s linear infinite' : 'none',
          transformOrigin: 'center',
          opacity: step >= 1 ? 1 : 0, transition: 'opacity 1.8s ease',
        }}/>
      </div>
      {/* Halo central or */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '75vw', height: '75vw', borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(255,184,0,0.09) 0%, rgba(26,62,255,0.05) 45%, transparent 70%)',
        opacity: step >= 1 ? 1 : 0, transition: 'opacity 2.2s ease',
      }}/>

      {/* Nom du jeu — SLAM IN */}
      {step >= 2 && (
        <div className="anim-slam-in" style={{ position: 'relative', textAlign: 'center', padding: '0 20px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: '-20%', bottom: '-20%', width: '40%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)', animation: 'shine 1.5s ease 0.3s both' }}/>
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontWeight: 900,
            fontSize: 'clamp(5rem,14vw,12rem)',
            color: 'var(--gold, #FFB800)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            textShadow:
              '0 0 30px rgba(255,184,0,0.95), ' +
              '0 0 70px rgba(255,165,0,0.55), ' +
              '0 0 140px rgba(255,165,0,0.22), ' +
              '8px 8px 0 rgba(0,0,0,0.7)',
            textTransform: 'uppercase',
          }}>
            {gs.gameName || 'QUIZ'}
          </div>
        </div>
      )}

      {/* Sous-titre */}
      {step >= 3 && (
        <div className="anim-slide-up" style={{
          fontFamily: 'var(--font-title)',
          fontWeight: 700,
          fontSize: 'clamp(1rem,2.5vw,1.8rem)',
          color: 'var(--teal)',
          letterSpacing: '0.45em',
          textTransform: 'uppercase',
          textShadow: '0 0 16px rgba(0,212,255,0.8), 0 0 40px rgba(0,212,255,0.3)',
        }}>
          LE JEU COMMENCE
        </div>
      )}

      {/* Équipes */}
      {step >= 4 && (
        <div style={{ display: 'flex', gap: '36px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {(['team1','team2']).map((team, i) => {
            const name = gs?.teamNames?.[team] || (i===0?'Équipe 1':'Équipe 2');
            const color = gs?.teamColors?.[team] || (i===0?'#FF0080':'#4D9FFF');
            const photo = gs?.teamPhotos?.[team];
            return (
              <div key={team} className={i === 0 ? 'anim-slide-right' : 'anim-slide-left'} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
                padding: '28px 40px',
                minWidth: '200px', width: 'clamp(180px,18vw,250px)',
                background: `linear-gradient(135deg, ${color}22, ${color}0A)`,
                border: `2px solid ${color}66`,
                borderRadius: '4px',
                boxShadow: `0 0 40px ${color}55, inset 0 1px 0 rgba(255,255,255,0.06)`,
                color: 'var(--white)',
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontWeight: 900,
                fontSize: 'clamp(1.3rem,2.5vw,1.9rem)',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                position: 'relative', overflow: 'hidden',
                animationDelay: `${i * 0.15}s`,
              }}>
                <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)', animation: 'shine 3s ease infinite', animationDelay: `${i * 0.5}s` }}/>
                {photo
                  ? <img src={photo} alt="" style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: `4px solid ${color}`, boxShadow: `0 0 24px ${color}88` }}/>
                  : <div style={{ width: '84px', height: '84px', borderRadius: '50%', background: `${color}22`, border: `3px solid ${color}77`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${color}44` }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: color, opacity: 0.85 }}/>
                    </div>
                }
                <span style={{ textShadow: `0 0 16px ${color}88` }}>{name}</span>
                <div style={{ width: '48px', height: '2px', background: color, boxShadow: `0 0 8px ${color}` }}/>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LobbyScreen({ gs }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: '36px', position: 'relative', zIndex: 1, overflow: 'hidden',
    }}>
      {/* Rayons rotatifs discrets */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{
          width: '260vmax', height: '260vmax',
          background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,184,0,0.025) 9deg, transparent 18deg, transparent 27deg, rgba(26,62,255,0.015) 36deg, transparent 45deg)',
          animation: 'rays 35s linear infinite',
          transformOrigin: 'center',
        }}/>
      </div>

      {/* Halo central or */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '75vw', height: '75vw', borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(255,184,0,0.06) 0%, rgba(26,62,255,0.04) 45%, transparent 70%)',
      }}/>

      {/* Titre */}
      <div className="anim-slam-in" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden', padding: '0 20px' }}>
        {/* Shine */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-20%', bottom: '-20%', width: '35%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)', animation: 'shine 4s ease 1s infinite' }}/>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontWeight: 900,
          fontSize: 'clamp(4rem,11vw,10rem)',
          color: 'var(--gold, #FFB800)',
          letterSpacing: '-0.01em',
          lineHeight: 1,
          textShadow:
            '0 0 25px rgba(255,184,0,0.95), ' +
            '0 0 60px rgba(255,165,0,0.55), ' +
            '0 0 110px rgba(255,165,0,0.22), ' +
            '6px 6px 0 rgba(0,0,0,0.6)',
          textTransform: 'uppercase',
        }}>{gs.gameName || 'QUIZ'}</h1>
        {/* Séparateur chromé doré */}
        <div style={{
          height: '3px', margin: '14px auto 0',
          width: 'clamp(180px, 38%, 480px)',
          background: 'linear-gradient(90deg, transparent, rgba(160,174,192,0.5), rgba(255,184,0,0.9), rgba(160,174,192,0.5), transparent)',
          boxShadow: '0 0 10px rgba(255,184,0,0.5)',
        }}/>
        <div style={{
          fontFamily: 'var(--font-title)',
          fontWeight: 700,
          fontSize: 'clamp(0.85rem,2vw,1.3rem)',
          color: 'var(--teal)',
          letterSpacing: '0.4em',
          marginTop: '14px',
          textTransform: 'uppercase',
          textShadow: '0 0 14px rgba(0,212,255,0.7)',
        }}>PRETS A JOUER ?</div>
      </div>

      {/* Équipes */}
      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {(['team1','team2']).map((team, i) => {
          const name = gs?.teamNames?.[team] || (i===0?'Équipe 1':'Équipe 2');
          const color = gs?.teamColors?.[team] || (i===0?'#FF0080':'#4D9FFF');
          const photo = gs?.teamPhotos?.[team];
          return (
            <div key={team} className="anim-tv-enter" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
              padding: '28px 40px',
              minWidth: '200px', width: 'clamp(180px,18vw,250px)',
              background: `linear-gradient(135deg, ${color}20, ${color}08)`,
              border: `2px solid ${color}77`,
              borderRadius: '4px',
              boxShadow: `0 0 36px ${color}55, inset 0 1px 0 rgba(255,255,255,0.06)`,
              color: 'var(--white)', textAlign: 'center',
              animationDelay: `${i * 0.2}s`,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)', animation: 'shine 4s ease infinite', animationDelay: `${i * 0.7}s` }}/>
              {photo
                ? <img src={photo} alt="" style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: `4px solid ${color}`, boxShadow: `0 0 24px ${color}99` }}/>
                : <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: `${color}22`, border: `3px solid ${color}77`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${color}44` }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: color, opacity: 0.8 }}/>
                  </div>
              }
              <div style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontWeight: 900,
                fontSize: 'clamp(1.2rem,2.3vw,1.8rem)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--white)',
                textShadow: `0 0 12px ${color}66`,
              }}>{name}</div>
              <div style={{ width: '44px', height: '2px', background: color, boxShadow: `0 0 10px ${color}` }}/>
            </div>
          );
        })}
      </div>

      <div style={{
        fontFamily: 'var(--font-mono)',
        color: 'rgba(77,159,255,0.45)',
        fontSize: 'clamp(0.7rem, 1.5vw, 0.9rem)',
        letterSpacing: '0.35em',
        textTransform: 'uppercase',
        animation: 'teletext-blink 1.6s step-start infinite',
        textShadow: '0 0 10px rgba(77,159,255,0.3)',
      }}>
        EN ATTENTE DU DEMARRAGE
      </div>
    </div>
  );
}

function RoundIntroScreen({ gs, audioUnlocked }) {
  const round = gs.round;
  const [step, setStep] = useState(0);
  const audioRef = useRef(null);
  const typeLabels = {
    buzzer: 'BUZZER',
    timer: 'TIMER',
    blind_test: 'BLIND TEST',
    face_puzzle: 'TETES MELANGEES',
    wager: 'PARIS',
    mime: 'MIMES',
    creative: 'CREATIVITE',
    video: 'VIDEO',
  };
  const typeColors = {
    buzzer: 'var(--red)',
    timer: 'var(--blue-light)',
    blind_test: 'var(--purple)',
    image_reveal: 'var(--orange)',
    face_puzzle: 'var(--teal)',
    wager: 'var(--yellow)',
    mime: 'var(--green)',
    creative: 'var(--orange)',
    video: 'var(--teal)',
  };

  useEffect(() => {
    setStep(0);
    const t1 = setTimeout(() => setStep(1), 300);
    const t2 = setTimeout(() => setStep(2), 1200);
    const t3 = setTimeout(() => setStep(3), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [gs.currentRoundIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !round?.introAudioUrl) return;
    audio.volume = 1.0;
    audio.currentTime = 0;
    audio.load();
    const tryPlay = () => audio.play().catch(() => {});
    // Play immediately if unlocked, otherwise wait for unlock signal
    tryPlay();
    // Arrêt automatique après 10 secondes
    const stopTimer = setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 10000);
    return () => { clearTimeout(stopTimer); audio.pause(); audio.currentTime = 0; };
  }, [round?.introAudioUrl, gs.currentRoundIndex, audioUnlocked]);

  const roundColor = typeColors[round?.type] || 'var(--yellow)';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: '24px', position: 'relative', zIndex: 1, overflow: 'hidden',
    }}>
      {round?.introAudioUrl && <audio ref={audioRef} src={round.introAudioUrl} loop/>}

      {/* Rayons rotatifs couleur du round */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          width: '220vmax', height: '220vmax',
          background: `conic-gradient(from 0deg, transparent 0deg, ${roundColor}18 9deg, transparent 18deg, transparent 27deg, rgba(255,184,0,0.02) 36deg, transparent 45deg)`,
          animation: 'rays 28s linear infinite',
          transformOrigin: 'center',
          opacity: step >= 1 ? 1 : 0, transition: 'opacity 1.2s ease',
        }}/>
      </div>

      {/* Halo central couleur du round — explosion */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '70vw', height: '70vw', borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${roundColor}14 0%, ${roundColor}06 35%, transparent 65%)`,
        opacity: step >= 1 ? 1 : 0, transition: 'opacity 0.9s ease',
      }}/>

      {/* Flash blanc step 0→1 */}
      <div style={{
        position: 'absolute', inset: 0, background: 'white', pointerEvents: 'none',
        opacity: 0,
        animation: step >= 1 ? 'flash-white 0.5s ease both' : 'none',
      }}/>

      {/* Numéro de manche */}
      {step >= 1 && (
        <div className="anim-drop-in" style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'clamp(0.85rem, 1.8vw, 1.1rem)',
          color: 'var(--teal)',
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          textShadow: '0 0 14px rgba(0,212,255,0.7)',
        }}>
          MANCHE {gs.currentRoundIndex + 1}{gs.rounds?.length ? ` / ${gs.rounds.length}` : ''}
        </div>
      )}

      {/* Séparateur chromé qui s'étend */}
      {step >= 1 && (
        <div style={{
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${roundColor}, rgba(160,174,192,0.6), ${roundColor}, transparent)`,
          boxShadow: `0 0 8px ${roundColor}88`,
          animation: 'separator-grow 0.45s ease both',
          width: 'clamp(100px,20vw,220px)',
        }}/>
      )}

      {/* Nom de la manche — SLAM IN */}
      {step >= 2 && (
        <div className="anim-slam-in" style={{ position: 'relative', textAlign: 'center', padding: '0 20px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: '-20%', bottom: '-20%', width: '35%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)', animation: 'shine 1.3s ease 0.15s both' }}/>
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontWeight: 900,
            fontSize: 'clamp(3.5rem,11vw,9rem)',
            color: 'var(--gold, #FFB800)',
            letterSpacing: '-0.01em',
            lineHeight: 1,
            textShadow:
              '0 0 24px rgba(255,184,0,0.95), ' +
              '0 0 60px rgba(255,165,0,0.5), ' +
              '6px 6px 0 rgba(0,0,0,0.6)',
            textTransform: 'uppercase',
          }}>
            {round?.name || 'NOUVELLE MANCHE'}
          </div>
        </div>
      )}

      {/* Badge type + description */}
      {step >= 3 && (
        <div className="anim-slide-up" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
        }}>
          {typeLabels[round?.type] && (
            <div style={{
              fontFamily: 'var(--font-title)',
              fontWeight: 700,
              fontSize: 'clamp(1rem, 2vw, 1.3rem)',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              padding: '10px 32px',
              background: `${roundColor}22`,
              border: `2px solid ${roundColor}66`,
              borderRadius: '3px',
              color: roundColor,
              boxShadow: `0 0 24px ${roundColor}44, inset 0 1px 0 rgba(255,255,255,0.05)`,
            }}>
              {typeLabels[round.type]}
            </div>
          )}
          {round?.description && (
            <div style={{
              maxWidth: '640px', textAlign: 'center',
              color: 'rgba(240,244,255,0.7)',
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(0.95rem,1.8vw,1.2rem)',
              padding: '16px 32px', lineHeight: 1.65,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(160,174,192,0.12)',
              borderRadius: '4px',
            }}>
              {round.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionScreen({ gs }) {
  const [showQ, setShowQ] = useState(false);
  const [answerFlash, setAnswerFlash] = useState(false);
  const prevAnswerVisible = useRef(gs.answerVisible);

  useEffect(() => {
    const t = setTimeout(() => setShowQ(true), 200);
    return () => clearTimeout(t);
  }, [gs.question]);

  // Flash green when answer revealed
  useEffect(() => {
    if (gs.answerVisible && !prevAnswerVisible.current) {
      setAnswerFlash(true);
      const t = setTimeout(() => setAnswerFlash(false), 400);
      prevAnswerVisible.current = true;
      return () => clearTimeout(t);
    }
    prevAnswerVisible.current = gs.answerVisible;
  }, [gs.answerVisible]);

  const img = gs.round?.questions?.[gs.currentQuestionIndex];

  const roundColor = (() => {
    const tc = { buzzer:'var(--red-bright)', timer:'var(--blue-light)', blind_test:'var(--purple)', image_reveal:'var(--orange)', face_puzzle:'var(--teal)', wager:'var(--yellow)', mime:'var(--green)', creative:'var(--orange)', video:'var(--teal)' };
    return tc[gs.round?.type] || 'var(--blue-light)';
  })();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: '22px', position: 'relative', zIndex: 1, padding: '24px',
    }}>
      {/* Flash vert réponse */}
      {answerFlash && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,232,122,0.12)', pointerEvents: 'none', zIndex: 2, animation: 'flash-color 0.4s ease both' }}/>
      )}

      {/* Flash buzzer — plein écran couleur équipe */}
      {gs.buzzer?.winner && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: `${gs.teamColors?.[gs.buzzer.winner] || (gs.buzzer.winner==='team1'?'#FF0080':'#4D9FFF')}18`,
          transition: 'background 0.3s ease',
        }}/>
      )}

      {/* Label round / question */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'clamp(0.7rem, 1.4vw, 0.9rem)',
        color: 'var(--teal)',
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        textShadow: '0 0 10px rgba(0,212,255,0.6)',
        opacity: 0.8,
      }}>
        {gs.round?.name} &nbsp;/&nbsp; Q.{gs.currentQuestionIndex+1} SUR {gs.round?.questions?.length}
      </div>

      {/* Question card */}
      {showQ && (
        <div className="anim-drop-in" style={{
          padding: '30px 52px',
          maxWidth: '920px',
          textAlign: 'center',
          fontSize: 'clamp(1.4rem,2.9vw,2.6rem)',
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          lineHeight: 1.3,
          background: 'linear-gradient(135deg, rgba(8,15,40,0.97), rgba(2,5,16,0.99))',
          borderLeft: `4px solid ${roundColor}`,
          borderTop: '1px solid rgba(77,159,255,0.15)',
          borderRight: '1px solid rgba(77,159,255,0.1)',
          borderBottom: '1px solid rgba(77,159,255,0.1)',
          borderRadius: '4px',
          boxShadow: `0 0 0 1px rgba(77,159,255,0.08), 0 0 40px rgba(77,159,255,0.06), -2px 0 20px ${roundColor}22`,
          width: '100%',
        }}>{gs.question}</div>
      )}

      {/* Image optionnelle */}
      {img?.imageUrl && (
        <img
          src={img.imageUrl}
          alt=""
          style={{
            maxHeight: '38vh', maxWidth: '65vw', objectFit: 'contain',
            borderRadius: '4px',
            border: `2px solid rgba(77,159,255,0.4)`,
            boxShadow: 'var(--shadow-neon-blue)',
          }}
        />
      )}

      {/* Buzzer badges */}
      <div style={{ display: 'flex', gap: '20px' }}>
        {['team1','team2'].map(team => {
          const hit = gs.buzzer?.winner === team;
          const locked = gs.buzzer?.locked?.includes(team);
          const tColor = gs.teamColors?.[team] || (team==='team1'?'#FF0080':'#4D9FFF');
          const tPhoto = gs.teamPhotos?.[team];
          return (
            <div key={team} style={{
              padding: '12px 22px',
              fontFamily: 'var(--font-display)',
              fontStyle: hit ? 'italic' : 'normal',
              fontWeight: hit ? 900 : 700,
              fontSize: hit ? 'clamp(1.1rem,2.2vw,1.6rem)' : 'clamp(0.9rem,1.8vw,1.2rem)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: '12px',
              background: hit
                ? `${tColor}30`
                : locked
                ? 'rgba(0,0,0,0.6)'
                : 'rgba(255,255,255,0.03)',
              border: `2px solid ${hit ? tColor : locked ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: '4px',
              boxShadow: hit ? `0 0 32px ${tColor}77, inset 0 0 20px ${tColor}11` : 'none',
              color: locked ? 'rgba(255,255,255,0.22)' : 'var(--white)',
              filter: locked ? 'grayscale(60%)' : 'none',
              animation: hit ? 'tv-impact 0.5s cubic-bezier(0.16,1,0.3,1) both' : 'none',
              transition: 'all 0.25s ease',
            }}>
              {tPhoto
                ? <img src={tPhoto} alt="" style={{ width: hit?'48px':'38px', height: hit?'48px':'38px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${tColor}`, boxShadow: hit ? `0 0 16px ${tColor}` : 'none', transition:'all 0.25s ease' }}/>
                : <div style={{ width: hit?'14px':'10px', height: hit?'14px':'10px', borderRadius: '50%', background: locked ? 'rgba(255,255,255,0.15)' : tColor, boxShadow: hit ? `0 0 12px ${tColor}` : 'none', flexShrink: 0 }}/>
              }
              <span>{gs.teamNames?.[team]}</span>
              {hit && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: tColor, letterSpacing: '0.2em', textShadow: `0 0 10px ${tColor}` }}>BUZZE !</span>}
              {locked && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.1em' }}>BLOQUE</span>}
            </div>
          );
        })}
      </div>

      {/* Réponse */}
      {gs.answerVisible && (
        <div className="anim-slam-in" style={{
          padding: '20px 48px',
          background: 'rgba(0,232,122,0.1)',
          border: '3px solid var(--green)',
          borderRadius: '4px',
          boxShadow: '0 0 40px rgba(0,232,122,0.45), inset 0 0 20px rgba(0,232,122,0.05)',
          fontSize: 'clamp(1.5rem,3.2vw,2.6rem)',
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontWeight: 900,
          color: 'var(--green)',
          textAlign: 'center',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          textShadow: '0 0 20px rgba(0,232,122,0.8), 0 0 50px rgba(0,232,122,0.3)',
        }}>{gs.answer}</div>
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
      playTick(value <= 10);
    });
  }, []);

  const fmt = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', position:'relative', zIndex:1 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'24px', padding:'16px 24px 0', flexShrink:0 }}>
        <div style={{ fontFamily:'var(--font-title)', fontWeight:700, color:'var(--teal)', letterSpacing:'0.3em', fontSize:'clamp(0.75rem,1.5vw,1rem)', textTransform:'uppercase', textShadow:'0 0 12px rgba(0,212,255,0.6)' }}>
          {gs.round?.name}
        </div>
        {gs.round?.points && (
          <div style={{ fontFamily:'var(--font-mono)', color:'var(--gold)', fontSize:'clamp(0.7rem,1.3vw,0.9rem)', letterSpacing:'0.2em', textShadow:'0 0 10px rgba(255,184,0,0.6)' }}>
            {gs.round.points} pt{gs.round.points > 1 ? 's' : ''} en jeu
          </div>
        )}
      </div>

      {/* Split-screen timers */}
      <div style={{ display:'flex', flex:1, gap:0 }}>
        {[{team:'team1',val:t1},{team:'team2',val:t2}].map(({team,val}, idx)=>{
          const color = gs.teamColors?.[team] || (team==='team1'?'#FF0080':'#4D9FFF');
          const photo = gs.teamPhotos?.[team];
          const active = gs.timer?.active === team;
          const warning = val <= 10 && val > 0;
          const danger = val <= 5 && val > 0;
          return (
            <div key={team} style={{
              flex:1,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              gap:'16px', padding:'20px 28px',
              background: active
                ? `linear-gradient(${idx===0?'90deg':'270deg'}, ${color}15, transparent)`
                : 'transparent',
              borderRight: active && idx===0 ? `3px solid ${color}` : 'none',
              borderLeft: active && idx===1 ? `3px solid ${color}` : idx===1 ? '1px solid rgba(160,174,192,0.1)' : 'none',
              boxShadow: active ? `${idx===0?'inset -4px':'inset 4px'} 0 24px ${color}22` : 'none',
              transition:'all 0.4s ease',
              position:'relative', overflow:'hidden',
            }}>
              {/* Glow latéral équipe active */}
              {active && (
                <div style={{
                  position:'absolute', [idx===0?'right':'left']:0, top:0, bottom:0, width:'4px',
                  background: color, boxShadow:`0 0 16px ${color}, 0 0 32px ${color}77`,
                }}/>
              )}

              {/* Nom équipe + photo */}
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                {photo
                  ? <img src={photo} alt="" style={{ width:'44px', height:'44px', borderRadius:'50%', objectFit:'cover', border:`3px solid ${active?color:color+'66'}`, boxShadow: active?`0 0 16px ${color}88`:'none', transition:'all 0.3s ease' }}/>
                  : <div style={{ width:'14px', height:'14px', borderRadius:'50%', background:color, boxShadow:`0 0 8px ${color}`, opacity: active?1:0.5 }}/>}
                <div style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'clamp(1.1rem,2.5vw,1.8rem)', color: active?color:'rgba(240,244,255,0.4)', letterSpacing:'0.04em', textTransform:'uppercase', textShadow: active?`0 0 16px ${color}88`:'none', transition:'all 0.3s ease' }}>
                  {gs.teamNames?.[team]}
                </div>
              </div>

              {/* Timer */}
              <div style={{
                fontFamily:'var(--font-mono)',
                fontSize:'clamp(4.5rem,13vw,10rem)',
                lineHeight:1,
                letterSpacing:'0.05em',
                color: danger ? 'var(--red-bright)' : warning ? 'var(--orange)' : (active ? color : 'rgba(240,244,255,0.25)'),
                textShadow: val > 0 ? `0 0 30px ${danger?'var(--red-bright)':warning?'var(--orange)':color}88, 0 0 70px ${danger?'var(--red-bright)':warning?'var(--orange)':color}33` : 'none',
                animation: danger && active ? 'tv-danger 0.6s ease infinite' : warning && active ? 'tv-danger 1.2s ease infinite' : 'none',
                transition:'color 0.3s ease',
                fontVariantNumeric:'tabular-nums',
              }}>{fmt(val)}</div>

              {/* Statut */}
              {active && (
                <div style={{ fontFamily:'var(--font-title)', fontWeight:700, color:'var(--gold)', fontSize:'clamp(0.7rem,1.4vw,1rem)', letterSpacing:'0.3em', textTransform:'uppercase', textShadow:'0 0 10px rgba(255,184,0,0.7)', animation:'blink 1.2s ease infinite' }}>
                  EN COURS
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


function BuzzerBadgeTV({ team, gs }) {
  const hit = gs.buzzer?.winner === team;
  const locked = gs.buzzer?.locked?.includes(team);
  const tColor = gs.teamColors?.[team] || (team==='team1'?'#FF0080':'#4D9FFF');
  const tPhoto = gs.teamPhotos?.[team];
  return (
    <div style={{
      padding:'10px 22px',
      fontFamily:'var(--font-display)', fontStyle: hit?'italic':'normal', fontWeight: hit?900:700,
      fontSize: hit ? 'clamp(1rem,2vw,1.4rem)' : 'clamp(0.85rem,1.6vw,1.1rem)',
      letterSpacing:'0.05em', textTransform:'uppercase',
      display:'flex', alignItems:'center', gap:'10px',
      background: hit ? `${tColor}30` : locked ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.03)',
      border:`2px solid ${hit?tColor:locked?'rgba(255,255,255,0.08)':'rgba(255,255,255,0.12)'}`,
      borderRadius:'4px',
      boxShadow: hit ? `0 0 32px ${tColor}77` : 'none',
      color: locked ? 'rgba(255,255,255,0.22)' : 'var(--white)',
      filter: locked ? 'grayscale(60%)' : 'none',
      animation: hit ? 'tv-impact 0.5s cubic-bezier(0.16,1,0.3,1) both' : 'none',
      transition:'all 0.25s ease',
    }}>
      {tPhoto
        ? <img src={tPhoto} alt="" style={{ width:'36px', height:'36px', borderRadius:'50%', objectFit:'cover', border:`2px solid ${tColor}`, boxShadow: hit?`0 0 12px ${tColor}`:'none' }}/>
        : <div style={{ width:'10px', height:'10px', borderRadius:'50%', background: locked?'rgba(255,255,255,0.15)':tColor, flexShrink:0 }}/>}
      <span>{gs.teamNames?.[team]}</span>
      {hit && <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:tColor, letterSpacing:'0.2em' }}>BUZZE !</span>}
      {locked && <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.7rem', color:'rgba(255,255,255,0.2)', letterSpacing:'0.1em' }}>BLOQUE</span>}
    </div>
  );
}

function FacePuzzleScreen({ gs }) {
  const q = gs.round?.questions?.[gs.currentQuestionIndex];
  const found = gs.facePuzzle?.found || [false, false, false, false];

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'20px', position:'relative', zIndex:1, padding:'20px' }}>
      <div style={{ fontFamily:'var(--font-mono)', color:'var(--teal)', letterSpacing:'0.3em', fontSize:'clamp(0.7rem,1.4vw,0.9rem)', textTransform:'uppercase', textShadow:'0 0 10px rgba(0,212,255,0.6)' }}>
        {gs.round?.name}{q?.question ? ` — ${q.question}` : ''}
      </div>

      {/* Buzzer status */}
      <div style={{ display:'flex', gap:'16px' }}>
        {['team1','team2'].map(team => <BuzzerBadgeTV key={team} team={team} gs={gs}/>)}
      </div>

      {/* Face montage */}
      <div style={{
        width:'min(500px, 72vw)',
        flexShrink: 0,
        border:'3px solid var(--teal)',
        boxShadow:'0 0 30px rgba(0,212,255,0.3), 0 0 80px rgba(0,212,255,0.1)',
        borderRadius:'6px',
        overflow:'hidden',
      }}>
        {[0,1,2,3].map(pi => {
          const isFound = found[pi];
          const name = q?.names?.[pi] || '';
          return (
            <div key={pi} style={{ position:'relative', width:'100%', paddingBottom:'25%', overflow:'hidden' }}>
              {q?.imageUrl ? (
                <img src={q.imageUrl} alt="" style={{ position:'absolute', width:'100%', top:`-${pi * 100}%`, display:'block' }}/>
              ) : (
                <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.18)', fontFamily:'var(--font-title)', fontSize:'0.9rem' }}>
                  Bande {pi+1}
                </div>
              )}
              {isFound && (
                <div className="anim-slam-in" style={{ position:'absolute', inset:0, background:'rgba(0,232,122,0.42)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'clamp(1rem,2.5vw,2rem)', color:'white', textShadow:'0 0 16px rgba(0,232,122,0.9), 3px 3px 0 rgba(0,0,0,0.6)' }}>
                    {name}
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
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'28px', position:'relative', zIndex:1, padding:'20px', overflow:'hidden' }}>
      {q?.audioUrl && <audio ref={audioRef} src={q.audioUrl}/>}

      {/* Halo violet */}
      <div style={{
        position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        width:'60vw', height:'60vw', borderRadius:'50%', pointerEvents:'none',
        background:'radial-gradient(circle, rgba(139,0,255,0.12) 0%, rgba(139,0,255,0.04) 40%, transparent 70%)',
        animation: gs.blindTest?.playing ? 'tv-pulse-glow 2s ease-in-out infinite' : 'none',
      }}/>

      {/* Titre manche */}
      <div style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'clamp(1.5rem,3.5vw,2.8rem)', color:'var(--purple)', letterSpacing:'0.15em', textTransform:'uppercase', textShadow:'0 0 20px rgba(139,0,255,0.8), 0 0 50px rgba(139,0,255,0.3)' }}>
        {gs.round?.name}
      </div>

      {/* Icône musicale — onde SVG animée */}
      <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', width:'160px', height:'80px' }}>
        <svg width="160" height="80" viewBox="0 0 160 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          {[0,1,2,3,4,5,6,7].map(i => {
            const h = [20,40,60,48,56,36,50,28][i];
            const x = 10 + i * 20;
            const playing = gs.blindTest?.playing;
            return (
              <rect
                key={i}
                x={x} y={(80-h)/2} width="10" height={h}
                rx="5"
                fill="var(--purple)"
                opacity={playing ? '0.9' : '0.35'}
                style={{
                  animation: playing ? `blink ${0.6 + i*0.1}s ease-in-out ${i*0.08}s infinite` : 'none',
                  transformOrigin: `${x+5}px 40px`,
                }}
              />
            );
          })}
        </svg>
      </div>

      {/* Buzzer status quand non révélé */}
      {!gs.blindTest?.revealed && (
        <div style={{ display:'flex', gap:'16px' }}>
          {['team1','team2'].map(team => <BuzzerBadgeTV key={team} team={team} gs={gs}/>)}
        </div>
      )}

      {/* Révélation */}
      {gs.blindTest?.revealed && (
        <div className="anim-slam-in" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'14px', textAlign:'center' }}>
          {/* Flash violet */}
          <div style={{ position:'absolute', inset:0, background:'rgba(139,0,255,0.15)', pointerEvents:'none', animation:'flash-color 0.5s ease both' }}/>
          <div style={{
            fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900,
            fontSize:'clamp(2.5rem,7vw,6rem)',
            color:'var(--purple)',
            textShadow:'0 0 30px rgba(139,0,255,0.9), 0 0 70px rgba(139,0,255,0.4), 5px 5px 0 rgba(0,0,0,0.6)',
            lineHeight:1.1, textTransform:'uppercase',
          }}>
            {gs.answer}
          </div>
          {gs.question && (
            <div style={{ fontFamily:'var(--font-title)', fontWeight:600, fontSize:'clamp(1.1rem,2.5vw,1.8rem)', color:'rgba(240,244,255,0.65)', letterSpacing:'0.1em', textTransform:'uppercase' }}>
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
  useEffect(() => on('mime_tick', ({ value }) => { setRemaining(value); playTick(value <= 10); }), []);
  useEffect(() => on('mime_expired', () => { setRemaining(0); playEndSound(); }), []);

  const team = gs.mime?.team;
  const teamColor = team === 'team1' ? 'var(--red-bright)' : team === 'team2' ? 'var(--blue-light)' : 'var(--yellow)';
  const warning = remaining <= 10 && remaining > 0 && gs.mime?.running;

  const subRounds = gs.round?.subRounds || [];
  const srIdx = gs.mime?.subRoundIndex ?? -1;
  const currentSr = subRounds[srIdx];
  const hasStarted = srIdx >= 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'28px', position:'relative', zIndex:1, padding:'20px', overflow:'hidden' }}>

      {/* Halo latéral coloré selon équipe */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${teamColor}0D 0%, transparent 65%)`,
        transition:'background 0.5s ease',
      }}/>

      {/* Label round */}
      <div style={{
        fontFamily:'var(--font-mono)',
        fontSize:'0.75rem',
        letterSpacing:'0.3em',
        textTransform:'uppercase',
        color:'var(--teal)',
        textShadow:'0 0 8px rgba(0,212,255,0.5)',
        position:'relative',
      }}>
        {gs.round?.name}
      </div>

      {/* Sub-round indicator */}
      {hasStarted && currentSr && (
        <div className="anim-slam-in" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', position:'relative' }}>
          <div style={{
            fontFamily:'var(--font-mono)', fontSize:'0.7rem', color:'rgba(160,174,192,0.45)',
            letterSpacing:'0.25em', textTransform:'uppercase',
          }}>
            SOUS-MANCHE {srIdx + 1}/{subRounds.length}
          </div>
          <div style={{
            fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900,
            fontSize:'clamp(2rem,5vw,3.5rem)',
            color:'var(--gold, #FFB800)',
            textShadow:'0 0 20px rgba(255,184,0,0.9), 0 0 50px rgba(255,165,0,0.4)',
            letterSpacing:'0.04em', textTransform:'uppercase',
          }}>
            {currentSr.label}
          </div>
        </div>
      )}

      {!hasStarted && (
        <div style={{
          fontFamily:'var(--font-title)', fontWeight:700,
          fontSize:'clamp(1.2rem,2.5vw,1.8rem)',
          letterSpacing:'0.3em', textTransform:'uppercase',
          color:'rgba(160,174,192,0.3)',
          animation:'teletext-blink 1.2s step-end infinite',
        }}>
          EN ATTENTE
        </div>
      )}

      {/* Équipe en cours */}
      {hasStarted && (
        team ? (
          <div style={{
            display:'flex', alignItems:'center', gap:'12px',
            fontFamily:'var(--font-title)', fontWeight:700,
            fontSize:'clamp(1.4rem,3vw,2.2rem)',
            letterSpacing:'0.12em', textTransform:'uppercase',
            color: teamColor,
            textShadow:`0 0 20px ${teamColor}CC, 0 0 40px ${teamColor}55`,
            position:'relative',
          }}>
            <div style={{ width:'14px', height:'14px', borderRadius:'50%', background:teamColor, boxShadow:`0 0 14px ${teamColor}` }}/>
            {gs.teamNames?.[team]}
          </div>
        ) : (
          <div style={{
            fontFamily:'var(--font-mono)', fontSize:'0.9rem',
            letterSpacing:'0.2em', textTransform:'uppercase',
            color:'rgba(160,174,192,0.3)',
          }}>
            CHOISIR UNE EQUIPE
          </div>
        )
      )}

      {/* Chrono */}
      <div style={{
        fontFamily:'var(--font-mono)',
        fontWeight:700,
        fontSize:'clamp(5.5rem,16vw,13rem)',
        color: warning ? 'var(--red-bright)' : (remaining === 0 ? 'rgba(160,174,192,0.2)' : teamColor),
        textShadow: remaining > 0
          ? (warning
            ? '0 0 30px rgba(255,0,128,0.95), 0 0 80px rgba(255,0,128,0.5)'
            : `0 0 30px ${teamColor}CC, 0 0 70px ${teamColor}44`)
          : 'none',
        animation: warning ? 'tv-danger 0.5s ease infinite' : 'none',
        letterSpacing:'0.06em', lineHeight:1,
        position:'relative',
      }}>
        {fmtTime(remaining)}
      </div>

      {/* Points en jeu */}
      {gs.round?.points && (
        <div style={{
          padding:'8px 28px',
          border:'1px solid rgba(0,232,122,0.3)',
          borderRadius:'2px',
          background:'rgba(0,232,122,0.06)',
          fontFamily:'var(--font-mono)', fontSize:'0.85rem',
          letterSpacing:'0.2em', textTransform:'uppercase',
          color:'var(--green)',
          textShadow:'0 0 10px rgba(0,232,122,0.6)',
          position:'relative',
        }}>
          {gs.round.points} POINT{gs.round.points > 1 ? 'S' : ''} EN JEU
        </div>
      )}
    </div>
  );
}

function CreativeScreen({ gs }) {
  const [remaining, setRemaining] = useState(gs.creative?.remaining ?? 0);
  const { on } = useSocket();

  useEffect(() => { setRemaining(gs.creative?.remaining ?? 0); }, [gs.creative?.remaining, gs.creative?.running]);
  useEffect(() => on('creative_tick', ({ value }) => { setRemaining(value); playTick(value <= 10); }), []);
  useEffect(() => on('creative_expired', () => { setRemaining(0); playEndSound(); }), []);

  const warning = remaining <= 10 && remaining > 0 && gs.creative?.running;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'30px', position:'relative', zIndex:1, padding:'24px', overflow:'hidden' }}>

      {/* Halo créatif violet-doré */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(139,0,255,0.08) 0%, transparent 65%)',
      }}/>

      {/* Titre round */}
      <div className="anim-slam-in" style={{
        fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900,
        fontSize:'clamp(2.5rem,6vw,5rem)',
        color:'var(--gold, #FFB800)',
        textShadow:'0 0 24px rgba(255,184,0,0.95), 0 0 60px rgba(255,165,0,0.4), 4px 4px 0 rgba(0,0,0,0.7)',
        letterSpacing:'0.02em', textTransform:'uppercase', textAlign:'center',
        position:'relative',
      }}>
        {gs.round?.name}
        {/* Shine sweep */}
        <div style={{
          position:'absolute', top:0, left:'-100%', width:'50%', height:'100%',
          background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
          animation:'shine 3s ease 1s infinite', pointerEvents:'none',
        }}/>
      </div>

      {gs.round?.description && (
        <div style={{
          padding:'20px 36px', maxWidth:'750px', textAlign:'center',
          fontFamily:'var(--font-title)', fontWeight:600,
          fontSize:'clamp(1rem,2vw,1.3rem)',
          color:'rgba(240,244,255,0.75)', lineHeight:1.55,
          background:'linear-gradient(135deg, rgba(8,15,40,0.92), rgba(2,5,16,0.96))',
          border:'1px solid rgba(139,0,255,0.25)',
          borderRadius:'4px',
          boxShadow:'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>
          {gs.round.description}
        </div>
      )}

      {/* Chrono */}
      <div style={{
        fontFamily:'var(--font-mono)',
        fontWeight:700,
        fontSize:'clamp(5rem,14vw,11rem)',
        color: warning ? 'var(--red-bright)' : (remaining === 0 ? 'rgba(160,174,192,0.2)' : 'var(--gold, #FFB800)'),
        textShadow: remaining > 0
          ? (warning
            ? '0 0 30px rgba(255,0,128,0.95), 0 0 80px rgba(255,0,128,0.5)'
            : '0 0 30px rgba(255,184,0,0.9), 0 0 70px rgba(255,165,0,0.4)')
          : 'none',
        animation: warning ? 'tv-danger 0.5s ease infinite' : 'none',
        letterSpacing:'0.06em', lineHeight:1,
        position:'relative',
      }}>
        {fmtTime(remaining)}
      </div>

      {gs.round?.points && (
        <div style={{
          padding:'8px 28px',
          border:'1px solid rgba(0,232,122,0.3)',
          borderRadius:'2px',
          background:'rgba(0,232,122,0.06)',
          fontFamily:'var(--font-mono)', fontSize:'0.85rem',
          letterSpacing:'0.2em', textTransform:'uppercase',
          color:'var(--green)',
          textShadow:'0 0 10px rgba(0,232,122,0.6)',
        }}>
          {gs.round.points} POINT{gs.round.points > 1 ? 'S' : ''} EN JEU
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

  const WagerBuzzerBadge = ({ team, color }) => {
    const hit = gs.buzzer?.winner === team;
    const locked = gs.buzzer?.locked?.includes(team);
    return (
      <div style={{
        display:'flex', alignItems:'center', gap:'10px',
        padding:'10px 24px',
        fontFamily:'var(--font-title)', fontWeight:700,
        fontSize:'clamp(1rem,2vw,1.2rem)',
        letterSpacing:'0.1em', textTransform:'uppercase',
        background: hit ? `${color}22` : 'rgba(8,15,40,0.85)',
        border: `2px solid ${hit ? color : 'rgba(160,174,192,0.12)'}`,
        borderRadius:'3px',
        boxShadow: hit ? `0 0 28px ${color}77, 0 0 60px ${color}22` : 'inset 0 1px 0 rgba(255,255,255,0.03)',
        color: locked ? 'rgba(160,174,192,0.3)' : (hit ? 'white' : 'rgba(240,244,255,0.6)'),
        animation: hit ? 'tv-pulse-glow 0.8s ease infinite' : 'none',
        filter: locked ? 'grayscale(70%)' : 'none',
        transition:'all 0.3s ease',
      }}>
        <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:color, boxShadow: hit ? `0 0 12px ${color}` : 'none', flexShrink:0 }}/>
        {gs.teamNames?.[team]}
        {hit && <span style={{ color:'var(--green)', textShadow:'0 0 8px rgba(0,232,122,0.8)', marginLeft:'4px' }}>BUZZ</span>}
      </div>
    );
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'28px', position:'relative', zIndex:1, padding:'20px', overflow:'hidden' }}>

      {/* Halo doré central */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(255,184,0,0.06) 0%, transparent 65%)',
      }}/>

      {/* Label round */}
      <div style={{
        fontFamily:'var(--font-mono)', fontSize:'0.7rem',
        letterSpacing:'0.3em', textTransform:'uppercase',
        color:'var(--teal)', textShadow:'0 0 8px rgba(0,212,255,0.5)',
        position:'relative',
      }}>
        {gs.round?.name}
      </div>

      {phase === 'betting' && (
        <>
          {/* Équipe qui mise */}
          <div style={{
            display:'flex', alignItems:'center', gap:'12px',
            fontFamily:'var(--font-title)', fontWeight:700,
            fontSize:'clamp(1.2rem,2.5vw,1.8rem)',
            letterSpacing:'0.12em', textTransform:'uppercase',
            color: assignedColor,
            textShadow:`0 0 20px ${assignedColor}CC`,
            animation:'tv-pulse-glow 1.5s ease infinite',
          }}>
            <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:assignedColor, boxShadow:`0 0 14px ${assignedColor}` }}/>
            {gs.teamNames?.[assignedTeam]} — MISEZ !
          </div>

          {/* Thème */}
          <div className="anim-slam-in" style={{
            padding:'40px 60px', textAlign:'center', maxWidth:'800px',
            background:'linear-gradient(135deg, rgba(8,15,40,0.96), rgba(2,5,16,0.98))',
            border:'2px solid rgba(255,184,0,0.25)',
            borderRadius:'4px',
            boxShadow:'0 0 60px rgba(255,184,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
            position:'relative', overflow:'hidden',
          }}>
            {/* Shine */}
            <div style={{
              position:'absolute', top:0, left:'-100%', width:'50%', height:'100%',
              background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
              animation:'shine 4s ease 1.5s infinite', pointerEvents:'none',
            }}/>
            <div style={{
              fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900,
              fontSize:'clamp(2.5rem,7vw,5.5rem)',
              color:'var(--gold, #FFB800)',
              textShadow:'0 0 24px rgba(255,184,0,0.95), 0 0 60px rgba(255,165,0,0.4)',
              lineHeight:1.1,
            }}>
              {theme || '?'}
            </div>
          </div>

          <div style={{
            fontFamily:'var(--font-mono)', fontSize:'0.75rem',
            letterSpacing:'0.2em', textTransform:'uppercase',
            color:'rgba(160,174,192,0.35)',
          }}>
            {gs.teamNames?.[otherTeam]} attend…
          </div>
        </>
      )}

      {phase === 'question' && (
        <>
          {/* Mise + badge */}
          <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
            <WagerBuzzerBadge team={assignedTeam} color={assignedColor}/>
            <div style={{
              fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900,
              fontSize:'clamp(2rem,4vw,3.2rem)',
              color:'var(--gold, #FFB800)',
              textShadow:'0 0 24px rgba(255,184,0,0.95)',
              letterSpacing:'0.02em',
            }}>
              {bet} <span style={{ fontSize:'0.5em', opacity:0.7, fontStyle:'normal', fontFamily:'var(--font-mono)' }}>PTS</span>
            </div>
          </div>

          {/* Question */}
          <div style={{
            padding:'28px 52px', maxWidth:'900px', textAlign:'center',
            fontFamily:'var(--font-title)', fontWeight:700,
            fontSize:'clamp(1.4rem,2.8vw,2.4rem)', lineHeight:1.45,
            color:'rgba(240,244,255,0.9)',
            background:'linear-gradient(135deg, rgba(8,15,40,0.96), rgba(2,5,16,0.98))',
            border:'1px solid rgba(160,174,192,0.1)',
            borderLeft:'4px solid var(--gold, #FFB800)',
            borderRadius:'3px',
            boxShadow:'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}>
            {gs.question}
          </div>

          {gs.answerVisible && (
            <div className="anim-slam-in" style={{
              padding:'18px 44px',
              background:'rgba(0,232,122,0.1)',
              border:'2px solid var(--green)',
              borderRadius:'3px',
              boxShadow:'0 0 30px rgba(0,232,122,0.3), 0 0 60px rgba(0,232,122,0.1)',
              fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900,
              fontSize:'clamp(1.4rem,2.8vw,2.2rem)',
              letterSpacing:'0.03em', textTransform:'uppercase',
              color:'var(--green)',
              textShadow:'0 0 16px rgba(0,232,122,0.9)',
              textAlign:'center',
            }}>
              {gs.answer}
            </div>
          )}
        </>
      )}

      {phase === 'steal' && (
        <>
          {/* Tentative de vol */}
          <div style={{
            fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900,
            fontSize:'clamp(1.5rem,3.5vw,2.8rem)',
            letterSpacing:'0.08em', textTransform:'uppercase',
            color:'var(--red-bright)',
            textShadow:'0 0 20px rgba(255,0,128,0.9), 0 0 50px rgba(255,0,128,0.4)',
            animation:'tv-pulse-glow 0.9s ease infinite',
          }}>
            TENTATIVE DE VOL
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
            <WagerBuzzerBadge team={otherTeam} color={otherColor}/>
            <div style={{
              fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900,
              fontSize:'clamp(2rem,4vw,3.2rem)',
              color:'var(--gold, #FFB800)',
              textShadow:'0 0 24px rgba(255,184,0,0.95)',
            }}>
              {bet} <span style={{ fontSize:'0.5em', opacity:0.7, fontStyle:'normal', fontFamily:'var(--font-mono)' }}>PTS</span>
            </div>
          </div>

          <div style={{
            padding:'28px 52px', maxWidth:'900px', textAlign:'center',
            fontFamily:'var(--font-title)', fontWeight:700,
            fontSize:'clamp(1.4rem,2.8vw,2.4rem)', lineHeight:1.45,
            color:'rgba(240,244,255,0.9)',
            background:'linear-gradient(135deg, rgba(8,15,40,0.96), rgba(2,5,16,0.98))',
            border:'1px solid rgba(160,174,192,0.1)',
            borderLeft:'4px solid var(--red-bright)',
            borderRadius:'3px',
          }}>
            {gs.question}
          </div>

          {gs.answerVisible && (
            <div className="anim-slam-in" style={{
              padding:'18px 44px',
              background:'rgba(0,232,122,0.1)',
              border:'2px solid var(--green)',
              borderRadius:'3px',
              boxShadow:'0 0 30px rgba(0,232,122,0.3)',
              fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900,
              fontSize:'clamp(1.4rem,2.8vw,2.2rem)',
              letterSpacing:'0.03em', textTransform:'uppercase',
              color:'var(--green)',
              textShadow:'0 0 16px rgba(0,232,122,0.9)',
              textAlign:'center',
            }}>
              {gs.answer}
            </div>
          )}
        </>
      )}

      {phase === 'awarded' && (() => {
        const awardedTeam = gs.wager?.awardedTeam;
        const isSteal = awardedTeam !== assignedTeam;
        const awardedColor = awardedTeam === 'team1' ? 'var(--red-bright)' : 'var(--blue-light)';
        return (
          <>
            <div className="anim-slam-in" style={{
              fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900,
              fontSize:'clamp(1.8rem,4vw,3.2rem)',
              letterSpacing:'0.08em', textTransform:'uppercase',
              color: isSteal ? 'var(--red-bright)' : 'var(--green)',
              textShadow: isSteal
                ? '0 0 20px rgba(255,0,128,0.9), 0 0 50px rgba(255,0,128,0.4)'
                : '0 0 20px rgba(0,232,122,0.9), 0 0 50px rgba(0,232,122,0.4)',
              animation:'tv-pulse-glow 0.9s ease infinite',
            }}>
              {isSteal ? 'VOL RÉUSSI !' : 'BONNE RÉPONSE !'}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
              <div style={{
                fontFamily:'var(--font-title)', fontWeight:700,
                fontSize:'clamp(1.2rem,2.5vw,1.8rem)',
                letterSpacing:'0.12em', textTransform:'uppercase',
                color: awardedColor,
                textShadow:`0 0 20px ${awardedColor}CC`,
              }}>
                <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:awardedColor, display:'inline-block', marginRight:'10px', boxShadow:`0 0 14px ${awardedColor}` }}/>
                {gs.teamNames?.[awardedTeam]}
              </div>
              <div style={{
                fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900,
                fontSize:'clamp(2rem,4vw,3.2rem)',
                color:'var(--gold, #FFB800)',
                textShadow:'0 0 24px rgba(255,184,0,0.95)',
              }}>
                +{bet} <span style={{ fontSize:'0.5em', opacity:0.7, fontStyle:'normal', fontFamily:'var(--font-mono)' }}>PTS</span>
              </div>
            </div>
          </>
        );
      })()}
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
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'32px', position:'relative', zIndex:1, padding:'20px', overflow:'hidden' }}>

      {/* Rayons rotatifs discrets */}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
        <div style={{
          width:'220vmax', height:'220vmax',
          background:'conic-gradient(from 0deg, transparent 0deg, rgba(0,212,255,0.02) 6deg, transparent 12deg, transparent 20deg, rgba(255,184,0,0.015) 28deg, transparent 36deg)',
          animation:'rays 35s linear infinite',
          transformOrigin:'center',
        }}/>
      </div>

      {/* Ligne séparatrice chromée */}
      <div className="anim-slam-in" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', position:'relative' }}>
        <div style={{
          fontFamily:'var(--font-mono)', fontSize:'0.65rem',
          letterSpacing:'0.35em', textTransform:'uppercase',
          color:'var(--teal)', textShadow:'0 0 8px rgba(0,212,255,0.6)',
        }}>BILAN</div>
        <div style={{
          fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900,
          fontSize:'clamp(2rem,4.5vw,3.5rem)',
          color:'var(--gold, #FFB800)',
          textShadow:'0 0 20px rgba(255,184,0,0.9), 0 0 50px rgba(255,165,0,0.35)',
          letterSpacing:'0.02em', textTransform:'uppercase',
        }}>
          {gs.round?.name}
        </div>
        <div style={{
          width:'200px', height:'2px',
          background:'linear-gradient(90deg, transparent, var(--gold, #FFB800), transparent)',
          boxShadow:'0 0 10px rgba(255,184,0,0.5)',
          marginTop:'4px',
        }}/>
      </div>

      {/* Cartes équipes */}
      <div style={{ display:'flex', gap:'40px', alignItems:'stretch' }}>
        {[{team:'team1',defColor:'#FF0080'},{team:'team2',defColor:'#4D9FFF'}].map(({team,defColor}) => {
          const color = gs.teamColors?.[team] || defColor;
          const photo = gs.teamPhotos?.[team];
          const isLeader = done && leader === team;
          const pts = gained[team] || 0;
          return (
            <div key={team} style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:'12px',
              padding:'28px 44px',
              background: isLeader
                ? `linear-gradient(135deg, ${color}22, ${color}08)`
                : 'linear-gradient(135deg, rgba(8,15,40,0.95), rgba(2,5,16,0.98))',
              border: isLeader ? `2px solid ${color}` : '1px solid rgba(160,174,192,0.1)',
              borderRadius:'4px',
              boxShadow: isLeader
                ? `0 0 55px ${color}55, 0 0 100px ${color}1A, inset 0 1px 0 rgba(255,255,255,0.06)`
                : 'inset 0 1px 0 rgba(255,255,255,0.03)',
              transform: isLeader ? 'scale(1.04)' : 'scale(1)',
              transition:'all 0.5s ease',
              position:'relative', overflow:'hidden',
              opacity: !done || isLeader || !leader ? 1 : 0.65,
              minWidth:'220px',
            }}>
              {/* Shine sur leader */}
              {isLeader && (
                <div style={{
                  position:'absolute', top:0, left:'-100%', width:'50%', height:'100%',
                  background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
                  animation:'shine 2.5s ease infinite', pointerEvents:'none',
                }}/>
              )}

              {/* Label EN TÊTE */}
              {isLeader && (
                <div style={{
                  fontFamily:'var(--font-mono)', fontSize:'0.6rem',
                  letterSpacing:'0.35em', textTransform:'uppercase',
                  color:'var(--gold, #FFB800)',
                  textShadow:'0 0 8px rgba(255,184,0,0.8)',
                }}>EN TETE</div>
              )}

              {/* Photo ou cercle */}
              {photo
                ? <img src={photo} alt="" style={{
                    width:'88px', height:'88px', borderRadius:'50%', objectFit:'cover',
                    border:`3px solid ${isLeader ? 'var(--gold, #FFB800)' : color}`,
                    boxShadow:`0 0 ${isLeader ? '28px rgba(255,184,0,0.6)' : `18px ${color}55`}`,
                  }}/>
                : <div style={{
                    width:'88px', height:'88px', borderRadius:'50%',
                    background:`${color}1A`,
                    border:`2px solid ${color}55`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow:`0 0 20px ${color}33`,
                  }}>
                    <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:color, opacity:0.8 }}/>
                  </div>
              }

              {/* Nom */}
              <div style={{
                fontFamily:'var(--font-title)', fontWeight:700,
                fontSize:'clamp(0.9rem,1.8vw,1.1rem)',
                letterSpacing:'0.12em', textTransform:'uppercase',
                color: isLeader ? 'rgba(240,244,255,0.9)' : 'rgba(240,244,255,0.5)',
              }}>
                {gs.teamNames?.[team]}
              </div>

              {/* Points gagnés cette manche */}
              {pts > 0 && (
                <div style={{
                  padding:'4px 16px',
                  background:'rgba(0,232,122,0.1)',
                  border:'1px solid rgba(0,232,122,0.3)',
                  borderRadius:'2px',
                  fontFamily:'var(--font-mono)', fontSize:'0.8rem',
                  letterSpacing:'0.15em',
                  color:'var(--green)',
                  textShadow:'0 0 8px rgba(0,232,122,0.7)',
                }}>
                  +{pts} CETTE MANCHE
                </div>
              )}

              {/* Score animé */}
              <div style={{
                fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900,
                fontSize:'clamp(4rem,9vw,7.5rem)',
                lineHeight:1, letterSpacing:'-0.02em',
                color: isLeader ? 'var(--gold, #FFB800)' : color,
                textShadow: isLeader
                  ? '0 0 20px rgba(255,184,0,0.95), 0 0 50px rgba(255,165,0,0.4)'
                  : `0 0 16px ${color}77`,
                fontVariantNumeric:'tabular-nums',
                transition:'all 0.1s',
              }}>
                {displayed[team]}
              </div>

              {/* Barre colorée bas */}
              <div style={{
                width:'60px', height:'3px',
                background: isLeader
                  ? 'linear-gradient(90deg, transparent, var(--gold, #FFB800), transparent)'
                  : `${color}66`,
                boxShadow: isLeader ? '0 0 10px rgba(255,184,0,0.6)' : 'none',
              }}/>
            </div>
          );
        })}
      </div>

      {done && !leader && (
        <div className="anim-slide-up" style={{
          fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900,
          fontSize:'clamp(1.5rem,3vw,2.5rem)',
          letterSpacing:'0.15em', textTransform:'uppercase',
          color:'var(--teal)',
          textShadow:'0 0 20px rgba(0,212,255,0.8)',
        }}>
          EGALITE !
        </div>
      )}
    </div>
  );
}

function ScoresScreen({ gs }) {
  const team1 = gs.scores?.team1 || 0;
  const team2 = gs.scores?.team2 || 0;
  const winner = team1 > team2 ? 'team1' : team2 > team1 ? 'team2' : null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: '36px', position: 'relative', zIndex: 1, overflow: 'hidden',
    }}>
      {/* Rayons rotatifs or */}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
        <div style={{
          width:'250vmax', height:'250vmax',
          background:'conic-gradient(from 0deg, transparent 0deg, rgba(255,184,0,0.03) 8deg, transparent 16deg, transparent 24deg, rgba(26,62,255,0.02) 32deg, transparent 40deg)',
          animation:'rays 30s linear infinite',
          transformOrigin:'center',
        }}/>
      </div>

      {/* Halo gold */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '80vw', height: '80vw', maxWidth: '700px', maxHeight: '700px',
        borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(255,184,0,0.08) 0%, rgba(26,62,255,0.04) 40%, transparent 65%)',
      }}/>

      {/* Titre SCORES */}
      <div className="anim-slam-in" style={{
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontWeight: 900,
        fontSize: 'clamp(3rem,7vw,6rem)',
        color: 'var(--gold, #FFB800)',
        letterSpacing: '-0.01em',
        textTransform: 'uppercase',
        textShadow: '0 0 24px rgba(255,184,0,0.95), 0 0 60px rgba(255,165,0,0.5), 5px 5px 0 rgba(0,0,0,0.6)',
      }}>SCORES</div>

      {/* Podium */}
      <div style={{ display: 'flex', gap: '36px', alignItems: 'flex-end' }}>
        {[{team:'team1',score:team1,def:'#FF0080'},{team:'team2',score:team2,def:'#4D9FFF'}].map(({team,score,def}) => {
          const color = gs.teamColors?.[team] || def;
          const photo = gs.teamPhotos?.[team];
          const isWinner = winner === team;
          return (
            <div key={team} className="anim-bounce-in" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
              padding: '32px 52px',
              background: isWinner
                ? `linear-gradient(135deg, ${color}25, ${color}0A)`
                : 'linear-gradient(135deg, rgba(8,15,40,0.95), rgba(2,5,16,0.98))',
              border: isWinner ? `3px solid ${color}` : '1px solid rgba(160,174,192,0.1)',
              borderRadius: '4px',
              boxShadow: isWinner
                ? `0 0 55px ${color}66, 0 0 120px ${color}22, inset 0 1px 0 rgba(255,255,255,0.07)`
                : 'inset 0 1px 0 rgba(255,255,255,0.03)',
              transform: isWinner ? 'scale(1.04)' : 'scale(1)',
              transition: 'transform 0.4s ease',
              position: 'relative',
              overflow: 'hidden',
              opacity: isWinner || !winner ? 1 : 0.72,
            }}>
              {isWinner && (
                <div style={{ position:'absolute', top:0, left:'-100%', width:'50%', height:'100%', background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)', animation:'shine 2.8s ease infinite' }}/>
              )}

              {isWinner && (
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', letterSpacing:'0.35em', textTransform:'uppercase', color:'var(--gold, #FFB800)', textShadow:'0 0 10px rgba(255,184,0,0.8)' }}>EN TETE</div>
              )}

              {photo
                ? <img src={photo} alt="" style={{ width:'104px', height:'104px', borderRadius:'50%', objectFit:'cover', border:`4px solid ${isWinner?'var(--gold, #FFB800)':color}`, boxShadow:`0 0 ${isWinner?'30px':'16px'} ${isWinner?'rgba(255,184,0,0.7)':color+'66'}` }}/>
                : <div style={{ width:'104px', height:'104px', borderRadius:'50%', background:`${color}22`, border:`3px solid ${color}55`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 20px ${color}44` }}>
                    <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:color, opacity:0.85 }}/>
                  </div>
              }

              <div style={{ fontFamily:'var(--font-title)', fontWeight:700, fontSize:'clamp(1rem,2vw,1.3rem)', letterSpacing:'0.1em', textTransform:'uppercase', color: isWinner ? 'var(--white)' : 'rgba(240,244,255,0.5)' }}>{gs.teamNames?.[team]}</div>

              <div style={{
                fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900,
                fontSize:'clamp(4.5rem,11vw,9rem)',
                lineHeight:1, letterSpacing:'-0.02em',
                color: isWinner ? 'var(--gold, #FFB800)' : color,
                textShadow: isWinner ? '0 0 24px rgba(255,184,0,0.95), 0 0 60px rgba(255,165,0,0.45)' : `0 0 18px ${color}77`,
                fontVariantNumeric:'tabular-nums',
              }}>{score}</div>

              <div style={{ width:'64px', height:'3px', background: isWinner ? 'linear-gradient(90deg, transparent, var(--gold, #FFB800), transparent)' : `${color}66`, boxShadow: isWinner ? '0 0 10px rgba(255,184,0,0.7)' : 'none' }}/>
            </div>
          );
        })}
      </div>

      {!winner && (
        <div className="anim-slide-up" style={{
          fontFamily: 'var(--font-display)', fontStyle:'italic', fontWeight:900,
          fontSize: 'clamp(1.5rem,3.5vw,2.5rem)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--teal)',
          textShadow: '0 0 20px rgba(0,212,255,0.8)',
        }}>EGALITE !</div>
      )}
    </div>
  );
}

function VideoRoundScreen({ gs }) {
  const videoRef = useRef(null);
  const q = gs.round?.questions?.[gs.currentQuestionIndex];
  const phase = gs.videoRound?.phase || 'watching';

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (gs.videoRound?.playing) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [gs.videoRound?.playing]);

  useEffect(() => {
    if (phase === 'watching' && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [phase, gs.currentRoundIndex]);

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'22px', position:'relative', zIndex:1, padding:'20px', overflow:'hidden' }}>

      {/* Halo bleu cinéma */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(26,62,255,0.07) 0%, transparent 65%)',
      }}/>

      {/* Label round */}
      <div style={{
        fontFamily:'var(--font-mono)', fontSize:'0.7rem',
        letterSpacing:'0.3em', textTransform:'uppercase',
        color:'var(--teal)', textShadow:'0 0 8px rgba(0,212,255,0.5)',
        position:'relative',
      }}>
        {gs.round?.name}
      </div>

      {phase === 'watching' && (
        gs.round?.videoUrl
          ? (
            <div style={{
              position:'relative',
              borderRadius:'6px', overflow:'hidden',
              border:'2px solid rgba(77,159,255,0.3)',
              boxShadow:'0 0 40px rgba(26,62,255,0.4), 0 0 80px rgba(26,62,255,0.15)',
            }}>
              <video ref={videoRef} src={gs.round.videoUrl} style={{
                display:'block',
                maxWidth:'85vw', maxHeight:'62vh',
                borderRadius:'4px',
              }}/>
            </div>
          )
          : (
            <div style={{
              width:'200px', height:'140px',
              display:'flex', alignItems:'center', justifyContent:'center',
              background:'rgba(8,15,40,0.9)',
              border:'2px solid rgba(77,159,255,0.2)',
              borderRadius:'6px',
              boxShadow:'0 0 30px rgba(26,62,255,0.25)',
            }}>
              {/* Clapperboard SVG abstrait */}
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <rect x="6" y="18" width="48" height="34" rx="3" fill="rgba(77,159,255,0.12)" stroke="rgba(77,159,255,0.4)" strokeWidth="1.5"/>
                <rect x="6" y="10" width="48" height="10" rx="2" fill="rgba(77,159,255,0.2)" stroke="rgba(77,159,255,0.4)" strokeWidth="1.5"/>
                {[0,1,2,3,4].map(i => (
                  <line key={i} x1={12 + i*9} y1="10" x2={8 + i*9} y2="20" stroke="rgba(0,212,255,0.5)" strokeWidth="1.5"/>
                ))}
                <circle cx="30" cy="36" r="8" fill="none" stroke="rgba(77,159,255,0.4)" strokeWidth="1.5"/>
                <polygon points="27,32 36,36 27,40" fill="rgba(77,159,255,0.5)"/>
              </svg>
            </div>
          )
      )}

      {phase === 'question' && (
        <>
          {gs.question && (
            <div className="anim-slam-in" style={{
              padding:'24px 48px', maxWidth:'900px', textAlign:'center',
              fontFamily:'var(--font-title)', fontWeight:700,
              fontSize:'clamp(1.2rem,2.5vw,2.2rem)', lineHeight:1.45,
              color:'rgba(240,244,255,0.9)',
              background:'linear-gradient(135deg, rgba(8,15,40,0.96), rgba(2,5,16,0.98))',
              border:'1px solid rgba(160,174,192,0.1)',
              borderLeft:'4px solid var(--teal)',
              borderRadius:'3px',
              boxShadow:'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}>
              {gs.question}
            </div>
          )}

          {gs.answerVisible && (
            <>
              <div className="anim-slam-in" style={{
                padding:'16px 40px',
                background:'rgba(0,232,122,0.1)',
                border:'2px solid var(--green)',
                borderRadius:'3px',
                boxShadow:'0 0 28px rgba(0,232,122,0.3)',
                fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900,
                fontSize:'clamp(1.2rem,2.5vw,2rem)',
                letterSpacing:'0.03em', textTransform:'uppercase',
                color:'var(--green)',
                textShadow:'0 0 14px rgba(0,232,122,0.9)',
                textAlign:'center',
              }}>
                {gs.answer}
              </div>
              {q?.proofImageUrl && (
                <img src={q.proofImageUrl} alt="preuve" style={{
                  maxHeight:'32vh', maxWidth:'58vw', objectFit:'contain',
                  borderRadius:'4px',
                  border:'2px solid rgba(0,232,122,0.4)',
                  boxShadow:'0 0 20px rgba(0,232,122,0.3)',
                }}/>
              )}
            </>
          )}

          {/* Buzzer badges */}
          <div style={{ display:'flex', gap:'24px' }}>
            {['team1','team2'].map(team => {
              const hit = gs.buzzer?.winner === team;
              const locked = gs.buzzer?.locked?.includes(team);
              const color = gs.teamColors?.[team] || (team==='team1' ? '#FF0080' : '#4D9FFF');
              return (
                <div key={team} style={{
                  display:'flex', alignItems:'center', gap:'10px',
                  padding:'10px 22px',
                  fontFamily:'var(--font-title)', fontWeight:700,
                  fontSize:'clamp(0.95rem,1.8vw,1.2rem)',
                  letterSpacing:'0.1em', textTransform:'uppercase',
                  background: hit ? `${color}22` : 'rgba(8,15,40,0.85)',
                  border:`2px solid ${hit ? color : 'rgba(160,174,192,0.12)'}`,
                  borderRadius:'3px',
                  boxShadow: hit ? `0 0 28px ${color}77, 0 0 55px ${color}22` : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                  color: locked ? 'rgba(160,174,192,0.3)' : (hit ? 'white' : 'rgba(240,244,255,0.55)'),
                  animation: hit ? 'tv-pulse-glow 0.8s ease infinite' : 'none',
                  filter: locked ? 'grayscale(70%)' : 'none',
                  transition:'all 0.3s ease',
                }}>
                  <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:color, boxShadow: hit ? `0 0 12px ${color}` : 'none', flexShrink:0 }}/>
                  {gs.teamNames?.[team]}
                  {hit && <span style={{ color:'var(--green)', textShadow:'0 0 8px rgba(0,232,122,0.8)', marginLeft:'4px' }}>BUZZ</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function EndScreen({ gs }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
    const timers = [
      setTimeout(() => setStep(1), 300),
      setTimeout(() => setStep(2), 1800),
      setTimeout(() => setStep(3), 3500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const team1 = gs.scores?.team1 || 0;
  const team2 = gs.scores?.team2 || 0;
  const winnerTeam = team1 > team2 ? 'team1' : team2 > team1 ? 'team2' : null;
  const winnerName = winnerTeam ? gs.teamNames?.[winnerTeam] : null;
  const winnerColor = winnerTeam ? (gs.teamColors?.[winnerTeam] || (winnerTeam==='team1'?'#FF1744':'#42A5F5')) : null;
  const winnerPhoto = winnerTeam ? gs.teamPhotos?.[winnerTeam] : null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: '28px', position: 'relative', zIndex: 1, textAlign: 'center', overflow: 'hidden',
    }}>

      {/* Confettis step 3 */}
      {step >= 3 && Array.from({length: 28}, (_, i) => {
        const seed = (i * 1597 + 42) % 1000;
        const colors = ['var(--gold, #FFB800)', 'var(--red-bright)', 'var(--teal)', 'var(--green)', 'var(--blue-light)', 'var(--purple)'];
        const col = colors[i % colors.length];
        const isRect = i % 3 === 0;
        const isCircle = i % 5 === 0;
        return (
          <div key={i} style={{
            position:'absolute',
            left: `${(seed * 73) % 100}%`,
            top: '-20px',
            width: isCircle ? '10px' : isRect ? '6px' : '10px',
            height: isCircle ? '10px' : isRect ? '16px' : '10px',
            borderRadius: isCircle ? '50%' : '2px',
            background: col,
            boxShadow: `0 0 6px ${col}`,
            animation: `confetti-fall ${2 + (seed % 30) * 0.1}s ease ${(seed % 20) * 0.1}s both`,
            pointerEvents: 'none',
            zIndex: 2,
          }}/>
        );
      })}

      {/* Rayons rotatifs rapides */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{
          width: '260vmax', height: '260vmax',
          background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,184,0,0.04) 7deg, transparent 14deg, transparent 21deg, rgba(26,62,255,0.025) 28deg, transparent 35deg)',
          animation: step >= 1 ? 'rays 10s linear infinite' : 'none',
          transformOrigin: 'center',
          opacity: step >= 1 ? 1 : 0, transition: 'opacity 1.5s ease',
        }}/>
      </div>

      {/* Halo central gold */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '90vw', height: '90vw', maxWidth: '800px', maxHeight: '800px',
        borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(255,184,0,0.1) 0%, rgba(26,62,255,0.04) 40%, transparent 70%)',
        opacity: step >= 1 ? 1 : 0, transition: 'opacity 2s ease',
      }}/>

      {/* FIN DU JEU */}
      {step >= 1 && (
        <div className="anim-slam-in" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: '-20%', bottom: '-20%', width: '40%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)', animation: 'shine 1.5s ease 0.2s both' }}/>
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900,
            fontSize: 'clamp(4rem,12vw,10rem)',
            color: 'var(--gold, #FFB800)',
            letterSpacing: '-0.01em', lineHeight: 1,
            textShadow: '0 0 35px rgba(255,184,0,0.95), 0 0 90px rgba(255,165,0,0.5), 0 0 170px rgba(255,165,0,0.2), 8px 8px 0 rgba(0,0,0,0.7)',
            textTransform: 'uppercase',
          }}>FIN DU JEU</div>
        </div>
      )}

      {/* Vainqueur */}
      {step >= 2 && winnerTeam && (
        <div className="anim-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: 'clamp(0.85rem,1.8vw,1.2rem)', color: 'rgba(240,244,255,0.5)', letterSpacing: '0.4em', textTransform: 'uppercase' }}>
            ET LE GRAND VAINQUEUR EST
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {winnerPhoto
              ? <img src={winnerPhoto} alt="" style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: `4px solid ${winnerColor}`, boxShadow: `0 0 40px ${winnerColor}99, 0 0 80px ${winnerColor}44` }}/>
              : <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: `${winnerColor}22`, border: `4px solid ${winnerColor}77`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px ${winnerColor}66` }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: winnerColor, opacity: 0.92 }}/>
                </div>
            }
            <div style={{
              fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900,
              fontSize: 'clamp(2.5rem,8vw,6.5rem)',
              color: winnerColor,
              letterSpacing: '-0.01em',
              textShadow: `0 0 35px ${winnerColor}, 0 0 70px ${winnerColor}66, 6px 6px 0 rgba(0,0,0,0.6)`,
              animation: 'pulse-glow 1.4s ease infinite',
              textTransform: 'uppercase',
            }}>{winnerName}</div>
          </div>
        </div>
      )}

      {step >= 2 && !winnerTeam && (
        <div className="anim-slam-in" style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900,
          fontSize: 'clamp(2.5rem,7vw,6rem)',
          color: 'var(--teal)',
          letterSpacing: '-0.01em', textTransform: 'uppercase',
          textShadow: '0 0 35px rgba(0,212,255,0.9), 0 0 70px rgba(0,212,255,0.4)',
        }}>MATCH NUL</div>
      )}

      {/* Scores finaux */}
      {step >= 3 && (
        <div className="anim-slide-up" style={{ display: 'flex', gap: '28px', alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'center' }}>
          {(['team1','team2']).map((team, i) => {
            const color = gs.teamColors?.[team] || (i===0?'#FF0080':'#4D9FFF');
            const photo = gs.teamPhotos?.[team];
            const score = gs.scores?.[team] || 0;
            const isWinner = team === winnerTeam;
            return (
              <div key={team} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                padding: '24px 36px',
                minWidth: '180px', width: 'clamp(160px,16vw,230px)',
                background: isWinner ? `linear-gradient(135deg, ${color}22, ${color}0A)` : 'linear-gradient(135deg, rgba(8,15,40,0.95), rgba(2,5,16,0.98))',
                border: isWinner ? `2px solid ${color}` : '1px solid rgba(160,174,192,0.1)',
                borderRadius: '4px',
                boxShadow: isWinner ? `0 0 40px ${color}66` : 'none',
                opacity: isWinner || !winnerTeam ? 1 : 0.65,
                position: 'relative', overflow: 'hidden',
              }}>
                {photo
                  ? <img src={photo} alt="" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${color}`, boxShadow: `0 0 18px ${color}77` }}/>
                  : <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: `${color}18`, border: `2px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: color, opacity: 0.82 }}/>
                    </div>
                }
                <div style={{ fontFamily: 'var(--font-title)', fontWeight: 700, color: isWinner ? 'var(--white)' : 'rgba(240,244,255,0.48)', fontSize: 'clamp(0.8rem,1.6vw,1rem)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{gs.teamNames?.[team]}</div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900,
                  fontSize: 'clamp(2.8rem,7vw,5.5rem)',
                  color: isWinner ? 'var(--gold, #FFB800)' : color,
                  textShadow: isWinner ? '0 0 18px rgba(255,184,0,0.9), 0 0 45px rgba(255,165,0,0.35)' : `0 0 12px ${color}66`,
                  lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                }}>{score}</div>
                {isWinner && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--gold, #FFB800)', textShadow: '0 0 8px rgba(255,184,0,0.7)', animation: 'pulse-glow 1.5s ease infinite' }}>VAINQUEUR</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── MAIN DISPLAY ───────────────────────────────────────────────────────────────
export default function Display() {
  const { gameState: gs, connected, on } = useSocket();
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const bgMusicRef = useRef(null);
  const lobbyMusicRef = useRef(null);
  const endMusicRef = useRef(null);

  const unlockAudio = () => {
    getCtx(); // unlock Web Audio context
    setAudioUnlocked(true);
  };

  // Quack on buzzer hit — delayed so buzzer phones always sound first
  useEffect(() => {
    return on('buzzer_hit', () => {
      setTimeout(() => {
        try {
          const audio = new Audio(import.meta.env.BASE_URL + 'sounds/quack.mp3');
          audio.volume = 0.85;
          audio.play().catch(() => {});
        } catch(e) {}
      }, 250);
    });
  }, []);

  const isLobby = gs?.screen === 'lobby' || gs?.screen === 'game_intro';
  const MUTED_SCREENS = ['round_intro', 'blind_test', 'video_round'];

  // Lobby music: plays only on lobby screen
  useEffect(() => {
    const audio = lobbyMusicRef.current;
    if (!audio) return;
    if (audioUnlocked && gs?.lobbyMusicUrl && isLobby) {
      audio.volume = gs?.bgMusicVolume ?? 0.25;
      if (audio.src !== gs.lobbyMusicUrl) { audio.src = gs.lobbyMusicUrl; audio.load(); }
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [audioUnlocked, gs?.lobbyMusicUrl, gs?.bgMusicVolume, isLobby]);

  // Background music: plays everywhere except lobby + muted screens
  useEffect(() => {
    const audio = bgMusicRef.current;
    if (!audio) return;
    const muted = MUTED_SCREENS.includes(gs?.screen) || isLobby;
    if (audioUnlocked && gs?.backgroundMusicUrl && !muted) {
      audio.volume = gs?.bgMusicVolume ?? 0.25;
      if (audio.src !== gs.backgroundMusicUrl) { audio.src = gs.backgroundMusicUrl; audio.load(); }
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [audioUnlocked, gs?.backgroundMusicUrl, gs?.bgMusicVolume, gs?.screen]);

  // End music: plays only on end screen
  useEffect(() => {
    const audio = endMusicRef.current;
    if (!audio) return;
    if (audioUnlocked && gs?.endMusicUrl && gs?.screen === 'end') {
      if (audio.src !== gs.endMusicUrl) { audio.src = gs.endMusicUrl; audio.load(); }
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [audioUnlocked, gs?.endMusicUrl, gs?.screen]);

  const isChaletTheme = !gs || gs.themes?.find(t => t.id === gs.activeThemeId)?.backgroundStyle === 'chalet' || gs.activeThemeId === 'chalet';

  if (!gs) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'var(--font-title)', fontSize:'1.5rem', color:'var(--blue-light)', position:'relative' }}>
      <StudioBackground/>
      <span style={{ position:'relative', zIndex:1, letterSpacing:'0.2em', textTransform:'uppercase' }}>Connexion au serveur...</span>
    </div>
  );

  const renderScreen = () => {
    switch(gs.screen) {
      case 'round_intro': return <RoundIntroScreen gs={gs} audioUnlocked={audioUnlocked}/>;
      case 'question': return <QuestionScreen gs={gs}/>;
      case 'timer_round': return <TimerRoundScreen gs={gs}/>;
      case 'face_puzzle': return <FacePuzzleScreen gs={gs}/>;
      case 'wager': return <WagerScreen gs={gs}/>;
      case 'mime': return <MimeScreen gs={gs}/>;
      case 'creative': return <CreativeScreen gs={gs}/>;
      case 'blind_test': return <BlindTestScreen gs={gs}/>;
      case 'video_round': return <VideoRoundScreen gs={gs}/>;
      case 'round_recap': return <RoundRecapScreen gs={gs}/>;
      case 'scores': return <ScoresScreen gs={gs}/>;
      case 'end': return <EndScreen gs={gs}/>;
      case 'waiting': return <WaitingScreen/>;
      case 'game_intro': return <GameIntroScreen gs={gs}/>;
      default: return <LobbyScreen gs={gs}/>;
    }
  };

  const showScoreBar = !['lobby','end','scores','round_intro','round_recap','waiting','game_intro'].includes(gs.screen);

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' }}>
      {isChaletTheme && <Snow count={35}/>}
      {isChaletTheme && <div className="fireplace-glow"/>}
      {!isChaletTheme && <StudioBackground/>}
      <audio ref={bgMusicRef} loop style={{ display:'none' }}/>
      <audio ref={lobbyMusicRef} loop style={{ display:'none' }}/>
      <audio ref={endMusicRef} loop style={{ display:'none' }}/>
      {showScoreBar && <ScoreBar scores={gs.roundScores} teamNames={gs.teamNames} teamColors={gs.teamColors} teamPhotos={gs.teamPhotos} highlight={gs.buzzer?.winner || gs.timer?.active} gameName={gs.gameName}/>}
      <div style={{ flex:1, position:'relative', zIndex:1 }}>
        {renderScreen()}
      </div>
      {!audioUnlocked && (
        <button onClick={unlockAudio} style={{
          position:'fixed', bottom:'20px', left:'50%', transform:'translateX(-50%)',
          zIndex:999, padding:'12px 36px',
          background:'rgba(26,62,255,0.88)', border:'2px solid var(--blue-light)',
          borderRadius:'4px', color:'white', fontFamily:'var(--font-display)',
          fontStyle:'italic', fontWeight:900, fontSize:'1rem', cursor:'pointer', letterSpacing:'0.25em',
          textTransform:'uppercase',
          boxShadow:'0 0 28px rgba(77,159,255,0.5)',
          animation:'teletext-blink 1.5s step-start infinite',
        }}>
          ACTIVER LE SON
        </button>
      )}
      {!connected && (
        <div style={{ position:'fixed', bottom:'12px', right:'12px', background:'rgba(232,0,28,0.92)', padding:'8px 18px', borderRadius:'3px', fontFamily:'var(--font-title)', fontWeight:700, fontSize:'0.8rem', letterSpacing:'0.15em', textTransform:'uppercase', zIndex:999, border:'2px solid var(--red-bright)', boxShadow:'0 0 16px rgba(255,0,128,0.4)' }}>
          DECONNECTE
        </div>
      )}
    </div>
  );
}
