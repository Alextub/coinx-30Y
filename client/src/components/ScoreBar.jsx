export default function ScoreBar({ scores, teamNames, highlight }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '16px', padding: '10px 24px',
      background: 'rgba(0,0,0,0.5)',
      borderBottom: '2px solid rgba(66,165,245,0.3)',
      fontFamily: 'var(--font-title)',
    }}>
      <TeamScore
        name={teamNames?.team1 || 'Équipe 1'}
        score={scores?.team1 || 0}
        color="var(--red-bright)"
        highlight={highlight === 'team1'}
        emoji="🔴"
      />
      <div style={{ fontSize: '1.8rem', color: 'rgba(255,255,255,0.3)' }}>VS</div>
      <TeamScore
        name={teamNames?.team2 || 'Équipe 2'}
        score={scores?.team2 || 0}
        color="var(--blue-light)"
        highlight={highlight === 'team2'}
        emoji="🔵"
      />
    </div>
  );
}

function TeamScore({ name, score, color, highlight, emoji }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '6px 18px',
      background: highlight ? `${color}22` : 'transparent',
      border: `2px solid ${highlight ? color : 'transparent'}`,
      borderRadius: '8px',
      boxShadow: highlight ? `0 0 20px ${color}66` : 'none',
      transition: 'all 0.3s ease',
    }}>
      <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}>{name}</span>
      <span style={{
        fontSize: '2rem', color, fontFamily: 'var(--font-display)',
        letterSpacing: '2px',
        textShadow: `0 0 10px ${color}`,
      }}>{score}</span>
    </div>
  );
}
