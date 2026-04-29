import { useState, useEffect, useRef } from 'react';

export default function ScoreBar({ scores, teamNames, teamColors, teamPhotos, highlight, gameName }) {
  const c1 = teamColors?.team1 || 'var(--red-bright)';
  const c2 = teamColors?.team2 || 'var(--blue-light)';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'center',
      gap: 0,
      background: 'linear-gradient(180deg, #0D1228 0%, #080F28 100%)',
      fontFamily: 'var(--font-title)',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '72px',
      boxShadow:
        '0 0 0 1px rgba(160,174,192,0.12), ' +
        '0 4px 32px rgba(0,0,0,0.7), ' +
        'inset 0 1px 0 rgba(255,255,255,0.05)',
    }}>
      {/* Bande dorée en bas */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(160,174,192,0.3) 10%, rgba(255,184,0,0.7) 30%, rgba(255,212,0,1) 50%, rgba(255,184,0,0.7) 70%, rgba(160,174,192,0.3) 90%, transparent 100%)',
        boxShadow: '0 0 10px rgba(255,184,0,0.5)',
      }}/>

      {/* Bande lumineuse en haut */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(77,159,255,0.15) 30%, rgba(77,159,255,0.35) 50%, rgba(77,159,255,0.15) 70%, transparent 100%)',
      }}/>

      {/* Glow latéral équipe en tête */}
      {highlight === 'team1' && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '35%',
          background: `linear-gradient(90deg, ${c1}1A, transparent)`,
          pointerEvents: 'none',
        }}/>
      )}
      {highlight === 'team2' && (
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '35%',
          background: `linear-gradient(270deg, ${c2}1A, transparent)`,
          pointerEvents: 'none',
        }}/>
      )}

      {/* Équipe 1 */}
      <TeamScore
        name={teamNames?.team1 || 'Équipe 1'}
        score={scores?.team1 ?? 0}
        color={c1}
        photo={teamPhotos?.team1 || null}
        highlight={highlight === 'team1'}
        side="left"
      />

      {/* Séparateur central — titre du jeu ou VS */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px',
        background: 'linear-gradient(180deg, rgba(255,184,0,0.04), rgba(255,184,0,0.02))',
        borderLeft: '1px solid rgba(160,174,192,0.1)',
        borderRight: '1px solid rgba(160,174,192,0.1)',
        minWidth: '80px',
        flexShrink: 0,
        flexDirection: 'column',
        gap: '2px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Shine periodique */}
        <div style={{
          position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
          animation: 'shine 4s ease infinite',
          animationDelay: '2s',
        }}/>
        {gameName ? (
          <span style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontWeight: 900,
            fontSize: 'clamp(0.8rem, 1.8vw, 1.3rem)',
            letterSpacing: '0.02em',
            color: 'var(--gold, #FFB800)',
            textShadow: '0 0 12px rgba(255,184,0,0.7), 0 0 28px rgba(255,165,0,0.3)',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}>{gameName}</span>
        ) : (
          <span style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontWeight: 900,
            fontSize: '1.4rem',
            letterSpacing: '0.05em',
            color: 'rgba(255,184,0,0.5)',
            textShadow: '0 0 10px rgba(255,184,0,0.25)',
          }}>VS</span>
        )}
      </div>

      {/* Équipe 2 */}
      <TeamScore
        name={teamNames?.team2 || 'Équipe 2'}
        score={scores?.team2 ?? 0}
        color={c2}
        photo={teamPhotos?.team2 || null}
        highlight={highlight === 'team2'}
        side="right"
      />
    </div>
  );
}

function TeamScore({ name, score, color, photo, highlight, side }) {
  const [displayScore, setDisplayScore] = useState(score);
  const [flipping, setFlipping] = useState(false);
  const prevScoreRef = useRef(score);

  useEffect(() => {
    if (score !== prevScoreRef.current) {
      setFlipping(true);
      const t = setTimeout(() => {
        setDisplayScore(score);
        setFlipping(false);
      }, 200);
      prevScoreRef.current = score;
      return () => clearTimeout(t);
    } else {
      setDisplayScore(score);
    }
  }, [score]);

  const isLeader = highlight;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 20px',
      flex: 1,
      justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
      background: isLeader
        ? `linear-gradient(${side === 'left' ? '270deg' : '90deg'}, ${color}22, transparent)`
        : 'transparent',
      transition: 'background 0.5s ease',
      position: 'relative',
    }}>

      {/* Score à gauche pour équipe gauche */}
      {side === 'left' && (
        <ScoreDisplay
          displayScore={displayScore}
          flipping={flipping}
          color={color}
          isLeader={isLeader}
        />
      )}

      {/* Infos équipe */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: side === 'left' ? 'flex-end' : 'flex-start',
        gap: '3px',
        order: side === 'left' ? 1 : 2,
      }}>
        {/* Indicateur leader */}
        {isLeader && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.55rem',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: 'var(--gold, #FFB800)',
            textShadow: '0 0 6px rgba(255,184,0,0.7)',
          }}>EN TETE</div>
        )}

        {/* Nom équipe */}
        <div style={{
          fontFamily: 'var(--font-title)',
          fontWeight: 700,
          fontSize: 'clamp(0.7rem, 1.5vw, 0.9rem)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: isLeader ? color : 'rgba(240,244,255,0.5)',
          transition: 'color 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          {side === 'right' && isLeader && (
            <span style={{ fontSize: '0.6rem', color: 'var(--gold, #FFB800)', textShadow: '0 0 6px rgba(255,184,0,0.8)' }}>&#9733;</span>
          )}
          {name}
          {side === 'left' && isLeader && (
            <span style={{ fontSize: '0.6rem', color: 'var(--gold, #FFB800)', textShadow: '0 0 6px rgba(255,184,0,0.8)' }}>&#9733;</span>
          )}
        </div>

        {/* Photo */}
        {photo && (
          <img
            src={photo}
            alt=""
            style={{
              width: '30px', height: '30px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: `2px solid ${isLeader ? color : 'rgba(160,174,192,0.2)'}`,
              boxShadow: isLeader ? `0 0 10px ${color}88, 0 0 20px ${color}33` : 'none',
              transition: 'all 0.4s ease',
            }}
          />
        )}
      </div>

      {/* Score à droite pour équipe droite */}
      {side === 'right' && (
        <ScoreDisplay
          displayScore={displayScore}
          flipping={flipping}
          color={color}
          isLeader={isLeader}
        />
      )}

      {/* Barre verticale latérale leader */}
      {isLeader && (
        <div style={{
          position: 'absolute',
          [side === 'left' ? 'right' : 'left']: 0,
          top: 0, bottom: 0, width: '3px',
          background: color,
          boxShadow: `0 0 14px ${color}, 0 0 28px ${color}77`,
          borderRadius: side === 'left' ? '0 2px 2px 0' : '2px 0 0 2px',
        }}/>
      )}
    </div>
  );
}

function ScoreDisplay({ displayScore, flipping, color, isLeader }) {
  return (
    <div style={{
      perspective: '600px',
      minWidth: '2.8ch',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontWeight: 900,
        fontSize: 'clamp(1.9rem, 3.8vw, 3rem)',
        lineHeight: 1,
        letterSpacing: '-0.02em',
        color: isLeader ? 'var(--gold, #FFB800)' : color,
        textShadow: isLeader
          ? '0 0 16px rgba(255,184,0,0.95), 0 0 32px rgba(255,165,0,0.5), 0 0 60px rgba(255,165,0,0.2)'
          : `0 0 12px ${color}88`,
        fontVariantNumeric: 'tabular-nums',
        transform: flipping ? 'rotateX(-90deg)' : 'rotateX(0deg)',
        transition: 'transform 0.2s ease',
        display: 'inline-block',
        textAlign: 'center',
      }}>
        {displayScore}
      </div>
    </div>
  );
}
