export default function ScoreBar({ scores, teamNames, teamColors, teamPhotos, highlight }) {
  const c1 = teamColors?.team1 || 'var(--red-bright)';
  const c2 = teamColors?.team2 || 'var(--blue-light)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '16px', padding: '10px 24px',
      background: 'linear-gradient(180deg, #3A2010, #2A1810)',
      borderBottom: '2px solid rgba(255,215,0,0.4)',
      fontFamily: 'var(--font-title)',
    }}>
      <TeamScore
        name={teamNames?.team1 || 'Équipe 1'}
        score={scores?.team1 || 0}
        color={c1}
        photo={teamPhotos?.team1 || null}
        highlight={highlight === 'team1'}
        emoji="🔴"
      />
      <div style={{ fontSize: '1.8rem', color: 'rgba(255,215,0,0.6)', fontFamily: 'var(--font-display)', textShadow: '0 0 10px #FFD700' }}>VS</div>
      <TeamScore
        name={teamNames?.team2 || 'Équipe 2'}
        score={scores?.team2 || 0}
        color={c2}
        photo={teamPhotos?.team2 || null}
        highlight={highlight === 'team2'}
        emoji="🔵"
      />
    </div>
  );
}

function TeamScore({ name, score, color, photo, highlight, emoji }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '6px 18px',
      background: highlight
        ? `${color}22`
        : 'repeating-linear-gradient(92deg, #3A2010 0px, #452415 4px, #3A2010 8px, #4a2b18 14px, #3A2010 20px)',
      border: `2px solid ${highlight ? color : 'rgba(255,215,0,0.2)'}`,
      borderRadius: '8px',
      boxShadow: highlight ? `0 0 20px ${color}66` : 'none',
      transition: 'all 0.3s ease',
    }}>
      {photo
        ? <img src={photo} alt="" style={{ width:'32px', height:'32px', borderRadius:'50%', objectFit:'cover', border:`2px solid ${color}`, flexShrink:0 }}/>
        : <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
      }
      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}>{name}</span>
      <span style={{
        fontSize: '2rem', color, fontFamily: 'var(--font-display)',
        letterSpacing: '2px',
        textShadow: `0 0 10px ${color}`,
      }}>{score}</span>
    </div>
  );
}
