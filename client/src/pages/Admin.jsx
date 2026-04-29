import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';

const ROUND_TYPES = [
  { value:'buzzer', label:'🔔 Buzzer', desc:'Questions avec buzzer' },
  { value:'timer', label:'⏱ Timer', desc:'Timer par équipe' },
  { value:'blind_test', label:'🎵 Blind test', desc:'Devinez la musique' },
  { value:'face_puzzle', label:'👤 Têtes mélangées', desc:'Montage de 4 visages' },
  { value:'wager', label:'🎲 Paris', desc:'Pariez vos points' },
  { value:'mime', label:'🎭 Mimes', desc:'Chrono par équipe' },
  { value:'creative', label:'🎨 Créativité', desc:'Atelier avec chrono' },
  { value:'video', label:'🎬 Vidéo', desc:'Vidéo puis questions' },
];

// ── HELPERS ────────────────────────────────────────────────────────────────────
const s = (obj) => ({ ...obj }); // spread helper

function Section({ title, children }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'16px', marginBottom:'16px' }}>
      <div style={{ fontFamily:'var(--font-title)', fontSize:'0.85rem', color:'rgba(255,255,255,0.4)', letterSpacing:'3px', marginBottom:'12px', textTransform:'uppercase' }}>{title}</div>
      {children}
    </div>
  );
}

function Btn({ onClick, color='#1565C0', disabled=false, children, full=false, small=false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? '6px 14px' : '10px 18px',
      background: disabled ? 'rgba(255,255,255,0.05)' : color,
      border:`2px solid ${disabled ? 'rgba(255,255,255,0.1)' : color}`,
      borderRadius:'6px', color: disabled ? 'rgba(255,255,255,0.3)' : 'white',
      fontFamily:'var(--font-title)', fontSize: small ? '0.85rem' : '0.95rem',
      cursor: disabled ? 'not-allowed' : 'pointer',
      width: full ? '100%' : 'auto',
      transition:'all 0.15s',
    }}>{children}</button>
  );
}

function Input({ value, onChange, placeholder, type='text', style={} }) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.2)',
        borderRadius:'6px', color:'white', padding:'8px 12px',
        fontFamily:'var(--font-body)', fontSize:'0.95rem',
        outline:'none', width:'100%', ...style,
      }}
    />
  );
}

// ── QUESTION EDITOR ─────────────────────────────────────────────────────────────
const PIECE_LABELS = ['Haut (front)', '2e (yeux)', '3e (nez)', 'Bas (bouche)'];
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

function FileUpload({ value, onChange, accept, label }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`${SERVER_URL}/upload`, { method:'POST', body:fd });
      const data = await res.json();
      onChange(SERVER_URL + data.url);
    } catch {
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      fileRef.current.value = '';
    }
  };

  return (
    <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
      <Input value={value||''} onChange={onChange} placeholder={`URL ou uploader ci-contre`} style={{flex:1}}/>
      <label style={{
        padding:'8px 12px', borderRadius:'6px', cursor:'pointer',
        background: uploading ? 'rgba(255,255,255,0.05)' : '#37474F',
        border:'2px solid rgba(255,255,255,0.2)',
        color: uploading ? 'rgba(255,255,255,0.4)' : 'white',
        fontFamily:'var(--font-title)', fontSize:'0.85rem', whiteSpace:'nowrap',
      }}>
        {uploading ? '⏳' : label}
        <input ref={fileRef} type="file" accept={accept} onChange={handleFile} style={{display:'none'}}/>
      </label>
    </div>
  );
}

function ImageUpload({ value, onChange }) {
  return <FileUpload value={value} onChange={onChange} accept="image/*" label="📁 Image"/>;
}

function QuestionEditor({ questions, onChange, type }) {
  const addQ = () => onChange([...questions,
    type === 'face_puzzle'  ? { question:'', imageUrl:'', names:['','','',''] }
    : type === 'wager'      ? { theme:'', question:'', answer:'', team:'team1' }
    : type === 'blind_test' ? { audioUrl:'', question:'', answer:'' }
    : type === 'video'      ? { question:'', answer:'', proofImageUrl:'' }
    :                         { question:'', answer:'', imageUrl:'' }
  ]);
  const removeQ = (i) => onChange(questions.filter((_,j)=>j!==i));
  const updateQ = (i, field, val) => {
    const next = [...questions];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };
  const updateName = (qi, pi, val) => {
    const next = [...questions];
    const names = [...(next[qi].names || ['','','',''])];
    names[pi] = val;
    next[qi] = { ...next[qi], names };
    onChange(next);
  };

  return (
    <div>
      {questions.map((q, i) => (
        <div key={i} style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'12px', marginBottom:'10px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
            <span style={{ fontFamily:'var(--font-title)', fontSize:'0.85rem', color:'rgba(255,255,255,0.5)' }}>
              {type === 'face_puzzle' ? `Montage ${i+1}` : `Question ${i+1}`}
            </span>
            <Btn small onClick={() => removeQ(i)} color="#c62828">✕</Btn>
          </div>
          {type === 'wager' ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <select value={q.team||'team1'} onChange={e=>updateQ(i,'team',e.target.value)} style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'6px', color:'white', padding:'8px 12px', fontFamily:'var(--font-body)', fontSize:'0.95rem' }}>
                <option value="team1">🔴 Équipe 1 répond</option>
                <option value="team2">🔵 Équipe 2 répond</option>
              </select>
              <Input value={q.theme||''} onChange={v=>updateQ(i,'theme',v)} placeholder="Thème affiché avant la question (ex: Géographie)"/>
              <Input value={q.question||''} onChange={v=>updateQ(i,'question',v)} placeholder="Question révélée après les paris"/>
              <Input value={q.answer||''} onChange={v=>updateQ(i,'answer',v)} placeholder="Réponse"/>
            </div>
          ) : type === 'blind_test' ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <FileUpload value={q.audioUrl||''} onChange={v=>updateQ(i,'audioUrl',v)} accept="audio/*" label="🎵 Audio"/>
              <Input value={q.question||''} onChange={v=>updateQ(i,'question',v)} placeholder="Artiste"/>
              <Input value={q.answer||''} onChange={v=>updateQ(i,'answer',v)} placeholder="Titre de la chanson"/>
            </div>
          ) : type === 'face_puzzle' ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <Input value={q.question||''} onChange={v=>updateQ(i,'question',v)} placeholder="Description (optionnel)"/>
              <ImageUpload value={q.imageUrl||''} onChange={v=>updateQ(i,'imageUrl',v)}/>
              {[0,1,2,3].map(pi => (
                <div key={pi} style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                  <span style={{ minWidth:'90px', fontSize:'0.78rem', color:'rgba(255,255,255,0.45)', fontFamily:'var(--font-title)' }}>{PIECE_LABELS[pi]}</span>
                  <Input value={q.names?.[pi]||''} onChange={v=>updateName(i,pi,v)} placeholder="Nom de la personne"/>
                </div>
              ))}
            </div>
          ) : type === 'video' ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <Input value={q.question||''} onChange={v=>updateQ(i,'question',v)} placeholder="Question"/>
              <Input value={q.answer||''} onChange={v=>updateQ(i,'answer',v)} placeholder="Réponse"/>
              <div>
                <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', marginBottom:'4px' }}>Preuve photo (facultatif)</div>
                <ImageUpload value={q.proofImageUrl||''} onChange={v=>updateQ(i,'proofImageUrl',v)}/>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <Input value={q.question} onChange={v=>updateQ(i,'question',v)} placeholder="Question"/>
              <Input value={q.answer} onChange={v=>updateQ(i,'answer',v)} placeholder="Réponse"/>
              {type==='buzzer' && (
                <ImageUpload value={q.imageUrl||''} onChange={v=>updateQ(i,'imageUrl',v)}/>
              )}
            </div>
          )}
        </div>
      ))}
      <Btn onClick={addQ} color="#1b5e20" full>+ Ajouter {type === 'face_puzzle' ? 'un montage' : 'une question'  }</Btn>
    </div>
  );
}

// ── SUB-ROUND EDITOR (Mimes) ────────────────────────────────────────────────────
function SubRoundEditor({ subRounds, onChange }) {
  const add = () => onChange([...subRounds, { label:'Solo', timerDuration:60 }]);
  const remove = (i) => onChange(subRounds.filter((_,j) => j !== i));
  const update = (i, field, val) => {
    const next = [...subRounds];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };
  const move = (i, dir) => {
    const next = [...subRounds];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
      {subRounds.map((sr, i) => (
        <div key={i} style={{ display:'flex', gap:'8px', alignItems:'center', padding:'8px 10px', background:'rgba(0,0,0,0.25)', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ minWidth:'22px', fontFamily:'var(--font-title)', fontSize:'0.78rem', color:'rgba(255,255,255,0.35)' }}>{i+1}.</span>
          <Input value={sr.label} onChange={v=>update(i,'label',v)} placeholder="Solo, Duo…" style={{flex:1}}/>
          <Input type="number" value={sr.timerDuration} onChange={v=>update(i,'timerDuration',parseInt(v)||30)} style={{width:'72px'}}/>
          <span style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.35)' }}>s</span>
          <Btn small onClick={() => move(i,-1)} color="#555" disabled={i===0}>↑</Btn>
          <Btn small onClick={() => move(i,1)} color="#555" disabled={i===subRounds.length-1}>↓</Btn>
          <Btn small onClick={() => remove(i)} color="#c62828">✕</Btn>
        </div>
      ))}
      <Btn onClick={add} color="#1b5e20" full>+ Ajouter une sous-manche</Btn>
    </div>
  );
}

// ── ROUND EDITOR ───────────────────────────────────────────────────────────────
function RoundEditor({ rounds, onChange, onSaveComplete }) {
  const [editIdx, setEditIdx] = useState(null);
  const [draft, setDraft] = useState(null);

  const addRound = () => {
    const newRound = { name:'Nouvelle Manche', type:'buzzer', description:'', questions:[], timerDuration:60, points:1 };
    const next = [...rounds, newRound];
    onChange(next);
    setEditIdx(next.length-1);
    setDraft(newRound);
  };

  const removeRound = (i) => {
    onChange(rounds.filter((_,j)=>j!==i));
    if (editIdx === i) { setEditIdx(null); setDraft(null); }
  };

  const openEdit = (i) => { setEditIdx(i); setDraft({...rounds[i], questions: [...(rounds[i].questions||[])]}); };

  const saveEdit = () => {
    const next = [...rounds];
    next[editIdx] = draft;
    onChange(next);
    onSaveComplete?.(next); // auto-save vers le serveur
    setEditIdx(null); setDraft(null);
  };

  const moveRound = (i, dir) => {
    const next = [...rounds];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  if (editIdx !== null && draft) {
    return (
      <div>
        <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
          <Btn onClick={() => { setEditIdx(null); setDraft(null); }} color="#555">← Retour</Btn>
          <Btn onClick={saveEdit} color="#00695c">💾 Sauvegarder</Btn>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          <div>
            <label style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', display:'block', marginBottom:'4px' }}>Nom de la manche</label>
            <Input value={draft.name} onChange={v=>setDraft(p=>({...p,name:v}))} placeholder="Nom de la manche"/>
          </div>
          <div>
            <label style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', display:'block', marginBottom:'4px' }}>Type</label>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              {ROUND_TYPES.map(t => (
                <button key={t.value} onClick={() => setDraft(p=>({...p,type:t.value}))} style={{
                  padding:'8px 14px', borderRadius:'6px', cursor:'pointer',
                  background: draft.type===t.value ? '#1565C0' : 'rgba(255,255,255,0.05)',
                  border:`2px solid ${draft.type===t.value?'#42A5F5':'rgba(255,255,255,0.1)'}`,
                  color:'white', fontFamily:'var(--font-title)', fontSize:'0.85rem',
                }}>{t.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', display:'block', marginBottom:'4px' }}>Description (affichée à l'écran)</label>
            <Input value={draft.description||''} onChange={v=>setDraft(p=>({...p,description:v}))} placeholder="Description optionnelle"/>
          </div>
          <div>
            <label style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', display:'block', marginBottom:'4px' }}>Musique d'introduction</label>
            <FileUpload value={draft.introAudioUrl||''} onChange={v=>setDraft(p=>({...p,introAudioUrl:v}))} accept="audio/*" label="🎵 Audio"/>
          </div>
          <div style={{ display:'flex', gap:'12px' }}>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', display:'block', marginBottom:'4px' }}>Points par bonne réponse</label>
              <Input type="number" value={draft.points||1} onChange={v=>setDraft(p=>({...p,points:parseInt(v)||1}))} placeholder="1"/>
            </div>
            {['timer','creative'].includes(draft.type) && (
              <div style={{ flex:1 }}>
                <label style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', display:'block', marginBottom:'4px' }}>Durée chrono (secondes)</label>
                <Input type="number" value={draft.timerDuration||60} onChange={v=>setDraft(p=>({...p,timerDuration:parseInt(v)||60}))} placeholder="60"/>
              </div>
            )}
          </div>
          {draft.type === 'mime' && (
            <div>
              <label style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', display:'block', marginBottom:'8px' }}>Sous-manches</label>
              <SubRoundEditor subRounds={draft.subRounds||[]} onChange={sr=>setDraft(p=>({...p,subRounds:sr}))}/>
            </div>
          )}
          {draft.type === 'video' && (
            <div>
              <label style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', display:'block', marginBottom:'4px' }}>Fichier vidéo</label>
              <FileUpload value={draft.videoUrl||''} onChange={v=>setDraft(p=>({...p,videoUrl:v}))} accept="video/*" label="🎬 Vidéo"/>
            </div>
          )}
          {!['mime','creative','timer'].includes(draft.type) && (
            <div>
              <label style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', display:'block', marginBottom:'8px' }}>Questions</label>
              <QuestionEditor questions={draft.questions||[]} onChange={q=>setDraft(p=>({...p,questions:q}))} type={draft.type}/>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {rounds.map((r, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', marginBottom:'8px' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--font-title)', fontSize:'1rem', color:'white' }}>{r.name}</div>
            <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)' }}>{ROUND_TYPES.find(t=>t.value===r.type)?.label} — {r.questions?.length||0} questions</div>
          </div>
          <Btn small onClick={() => moveRound(i,-1)} color="#555" disabled={i===0}>↑</Btn>
          <Btn small onClick={() => moveRound(i,1)} color="#555" disabled={i===rounds.length-1}>↓</Btn>
          <Btn small onClick={() => openEdit(i)} color="#1565C0">✏️</Btn>
          <Btn small onClick={() => removeRound(i)} color="#c62828">✕</Btn>
        </div>
      ))}
      <Btn onClick={addRound} color="#4a148c" full>+ Ajouter une manche</Btn>
    </div>
  );
}

// ── CONTROL PANEL ──────────────────────────────────────────────────────────────
function ControlPanel({ gs, emit }) {
  const round = gs.round;
  const qIdx = gs.currentQuestionIndex;
  const questions = round?.questions || [];
  const hasMoreQ = qIdx < questions.length - 1 || qIdx === -1;

  // Local state for wager bet (entered before committing to server)
  const [localBet, setLocalBet] = useState(0);
  const [scoreFlash, setScoreFlash] = useState(null); // { team, pts }

  const addScore = (team, pts) => {
    emit('admin_add_score', { team, points: pts });
    setScoreFlash({ team, pts });
    setTimeout(() => setScoreFlash(sf => sf?.team === team && sf?.pts === pts ? null : sf), 1500);
  };
  useEffect(() => {
    if (gs.wager?.phase === 'betting') setLocalBet(0);
  }, [gs.wager?.phase, qIdx]);

  return (
    <div>
      {/* Screen status */}
      <Section title="État actuel">
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'12px' }}>
          <div style={{ padding:'6px 14px', background:'rgba(255,214,0,0.15)', border:'1px solid #FFD600', borderRadius:'6px', fontFamily:'var(--font-title)', fontSize:'0.9rem', color:'#FFD600' }}>
            Écran : {gs.screen}
          </div>
          {round && (
            <div style={{ padding:'6px 14px', background:'rgba(66,165,245,0.15)', border:'1px solid #42A5F5', borderRadius:'6px', fontFamily:'var(--font-title)', fontSize:'0.9rem', color:'#42A5F5' }}>
              Manche : {round.name}
            </div>
          )}
          {qIdx >= 0 && (
            <div style={{ padding:'6px 14px', background:'rgba(0,200,83,0.15)', border:'1px solid #00C853', borderRadius:'6px', fontFamily:'var(--font-title)', fontSize:'0.9rem', color:'#00C853' }}>
              Q {qIdx+1}/{questions.length}
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          <Btn onClick={() => emit('admin_show_lobby')} color="#555">🏠 Lobby</Btn>
          <Btn onClick={() => emit('admin_show_scores')} color="#E65100">🏆 Scores totaux</Btn>
          <Btn onClick={() => emit('admin_show_round_recap')} color="#6a1b9a" disabled={!round}>📊 Bilan de manche</Btn>
          <Btn onClick={() => emit('admin_next_round')} color="#1565C0">⏭ Manche suivante</Btn>
        </div>
        {gs.screen === 'waiting' && (
          <div style={{ marginTop:'10px' }}>
            <Btn onClick={() => emit('admin_launch_intro')} color="#C4620A" full>🎬 Lancer l'intro</Btn>
          </div>
        )}
        {gs.screen === 'game_intro' && (
          <div style={{ marginTop:'10px' }}>
            <Btn onClick={() => emit('admin_show_lobby')} color="#00695c" full>▶ Passer au lobby</Btn>
          </div>
        )}
        {gs.screen === 'round_intro' && (
          <div style={{ marginTop:'10px' }}>
            <Btn onClick={() => emit('admin_start_round')} color="#00695c" full>▶ Démarrer la manche</Btn>
          </div>
        )}
        <div style={{ marginTop:'10px', borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'10px' }}>
          <Btn
            onClick={() => {
              if (window.confirm('Réinitialiser la partie ? Les scores, noms, couleurs et photos d\'équipes seront remis à zéro. La config (manches, musiques) est conservée.')) {
                emit('admin_reset_game');
              }
            }}
            color="#b71c1c"
            full
          >🔄 Réinitialiser la partie</Btn>
        </div>
      </Section>

      {/* Aperçu suivant */}
      {(() => {
        const nextRound = gs.rounds?.[gs.currentRoundIndex + 1];
        const nextQ = gs.round?.questions?.[gs.currentQuestionIndex + 1];
        if (!nextRound && !nextQ) return null;
        return (
          <Section title="Aperçu suivant">
            {nextQ && (
              <div style={{ marginBottom: nextRound ? '8px' : 0, padding:'8px 10px', background:'rgba(0,0,0,0.3)', borderRadius:'6px', fontSize:'0.85rem', color:'rgba(255,255,255,0.55)', borderLeft:'3px solid rgba(0,200,83,0.5)' }}>
                <span style={{ color:'var(--green)', fontFamily:'var(--font-title)', fontSize:'0.75rem', letterSpacing:'2px' }}>QUESTION SUIVANTE</span>
                <div style={{ marginTop:'4px', color:'rgba(255,255,255,0.8)' }}>
                  {nextQ.question || nextQ.theme || nextQ.audioUrl || '—'}
                </div>
                {nextQ.answer && <div style={{ color:'rgba(255,255,255,0.4)', marginTop:'2px' }}>→ {nextQ.answer}</div>}
              </div>
            )}
            {nextRound && (
              <div style={{ padding:'8px 10px', background:'rgba(0,0,0,0.3)', borderRadius:'6px', fontSize:'0.85rem', color:'rgba(255,255,255,0.55)', borderLeft:'3px solid rgba(66,165,245,0.5)' }}>
                <span style={{ color:'var(--blue-light)', fontFamily:'var(--font-title)', fontSize:'0.75rem', letterSpacing:'2px' }}>MANCHE SUIVANTE</span>
                <div style={{ marginTop:'4px', color:'rgba(255,255,255,0.8)' }}>
                  {nextRound.name} — {ROUND_TYPES.find(t=>t.value===nextRound.type)?.label}
                </div>
                {nextRound.questions?.length > 0 && (
                  <div style={{ color:'rgba(255,255,255,0.4)', marginTop:'2px' }}>{nextRound.questions.length} question{nextRound.questions.length > 1 ? 's' : ''}</div>
                )}
              </div>
            )}
          </Section>
        );
      })()}

      {/* Question control */}
      {round && ['buzzer','face_puzzle'].includes(round.type) && (
        <Section title="Questions">
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            <Btn onClick={() => emit('admin_next_question')} color="#1b5e20" disabled={!hasMoreQ}>▶ {round.type === 'face_puzzle' ? 'Montage suivant' : 'Question suivante'}</Btn>
            {round.type !== 'face_puzzle' && (
              <Btn onClick={() => emit('admin_reveal_answer')} color="#00695c" disabled={gs.answerVisible}>✅ Révéler réponse</Btn>
            )}
          </div>
          {gs.question && (
            <div style={{ marginTop:'10px', padding:'10px', background:'rgba(0,0,0,0.3)', borderRadius:'6px', fontSize:'0.9rem', color:'rgba(255,255,255,0.7)' }}>
              {round.type === 'face_puzzle' ? `Montage ${qIdx+1}/${questions.length}` : `Q : ${gs.question}`}
              {gs.answerVisible && round.type !== 'face_puzzle' && <span style={{ color:'var(--green)', marginLeft:'8px' }}>→ {gs.answer}</span>}
            </div>
          )}
        </Section>
      )}

      {/* Buzzer control */}
      {round?.type === 'buzzer' && (
        <Section title="Buzzer">
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'10px' }}>
            <div style={{ padding:'8px 16px', background: gs.buzzer?.winner==='team1'?'rgba(229,57,53,0.3)':'rgba(0,0,0,0.3)', border:`1px solid ${gs.buzzer?.winner==='team1'?'var(--red-bright)':'rgba(255,255,255,0.1)'}`, borderRadius:'6px', fontFamily:'var(--font-title)', fontSize:'0.9rem', color:'white' }}>
              🔴 {gs.teamNames?.team1} {gs.buzzer?.winner==='team1'?'✓ BUZZÉ':''}
            </div>
            <div style={{ padding:'8px 16px', background: gs.buzzer?.winner==='team2'?'rgba(21,101,192,0.3)':'rgba(0,0,0,0.3)', border:`1px solid ${gs.buzzer?.winner==='team2'?'var(--blue-light)':'rgba(255,255,255,0.1)'}`, borderRadius:'6px', fontFamily:'var(--font-title)', fontSize:'0.9rem', color:'white' }}>
              🔵 {gs.teamNames?.team2} {gs.buzzer?.winner==='team2'?'✓ BUZZÉ':''}
            </div>
          </div>
          <Btn onClick={() => emit('admin_reset_buzzer')} color="#6a1b9a">🔄 Réinitialiser buzzer</Btn>
        </Section>
      )}

      {/* Timer control */}
      {round?.type === 'timer' && (
        <Section title="Timer">
          <div style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.5)', marginBottom:'10px' }}>
            Points de la manche : <strong style={{ color:'var(--yellow)' }}>{round.points || 1}</strong>
          </div>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            <Btn onClick={() => emit('admin_timer_start', { team:'team1' })} color="#c62828">▶ 🔴 {gs.teamNames?.team1}</Btn>
            <Btn onClick={() => emit('admin_timer_start', { team:'team2' })} color="#1565C0">▶ 🔵 {gs.teamNames?.team2}</Btn>
            <Btn onClick={() => emit('admin_timer_pause')} color="#555">⏸ Pause</Btn>
            <Btn onClick={() => emit('admin_timer_switch')} color="#4a148c">⇄ Changer</Btn>
          </div>
        </Section>
      )}

      {/* Face puzzle */}
      {round?.type === 'face_puzzle' && gs.facePuzzle && (
        <Section title="Têtes mélangées">
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'10px' }}>
            {['team1','team2'].map(team => (
              <div key={team} style={{ padding:'8px 16px', background: gs.buzzer?.winner===team?(team==='team1'?'rgba(229,57,53,0.3)':'rgba(21,101,192,0.3)'):'rgba(0,0,0,0.3)', border:`1px solid ${gs.buzzer?.winner===team?(team==='team1'?'var(--red-bright)':'var(--blue-light)'):'rgba(255,255,255,0.1)'}`, borderRadius:'6px', fontFamily:'var(--font-title)', fontSize:'0.9rem', color:'white' }}>
                {team==='team1'?'🔴':'🔵'} {gs.teamNames?.[team]} {gs.buzzer?.winner===team?'✓ BUZZÉ':''}
              </div>
            ))}
          </div>
          <Btn onClick={() => emit('admin_reset_buzzer')} color="#6a1b9a">🔄 Réinitialiser buzzer</Btn>
          <div style={{ marginTop:'12px', display:'flex', flexDirection:'column', gap:'6px' }}>
            {[0,1,2,3].map(pi => {
              const q = gs.round?.questions?.[gs.currentQuestionIndex];
              const name = q?.names?.[pi] || `Pièce ${pi+1}`;
              const isFound = gs.facePuzzle.found[pi];
              return (
                <div key={pi} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', background:'rgba(0,0,0,0.3)', borderRadius:'6px', border:`1px solid ${isFound?'var(--green)':'rgba(255,255,255,0.1)'}` }}>
                  <span style={{ minWidth:'70px', fontSize:'0.78rem', color:'rgba(255,255,255,0.45)', fontFamily:'var(--font-title)' }}>{PIECE_LABELS[pi]}</span>
                  <span style={{ flex:1, fontFamily:'var(--font-title)', fontSize:'0.9rem', color: isFound ? 'var(--green)' : 'rgba(255,255,255,0.7)' }}>
                    {name}
                  </span>
                  {!isFound
                    ? <Btn small onClick={() => emit('admin_face_validate', { pieceIndex:pi })} color="#1b5e20">✓ Valider</Btn>
                    : <Btn small onClick={() => emit('admin_face_reset_piece', { pieceIndex:pi })} color="#555">✕</Btn>
                  }
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Blind test */}
      {round?.type === 'blind_test' && gs.blindTest && (
        <Section title="Blind test">
          {/* Navigation + lecture */}
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'10px' }}>
            <Btn onClick={() => emit('admin_next_question')} color="#1b5e20" disabled={!hasMoreQ}>▶ Suivant</Btn>
            {gs.blindTest.playing
              ? <Btn onClick={() => emit('admin_blind_test_pause')} color="#E65100">⏸ Pause</Btn>
              : <Btn onClick={() => emit('admin_blind_test_play')} color="#1565C0" disabled={gs.blindTest.revealed}>▶ Play</Btn>
            }
            <Btn onClick={() => emit('admin_reset_buzzer')} color="#6a1b9a">🔄 Buzzer</Btn>
            <Btn onClick={() => emit('admin_blind_test_reveal')} color="#00695c" disabled={gs.blindTest.revealed}>🎤 Révéler</Btn>
          </div>

          {/* Buzzer status */}
          <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
            {['team1','team2'].map(team => (
              <div key={team} style={{ padding:'6px 14px', background: gs.buzzer?.winner===team?(team==='team1'?'rgba(229,57,53,0.3)':'rgba(21,101,192,0.3)'):'rgba(0,0,0,0.3)', border:`1px solid ${gs.buzzer?.winner===team?(team==='team1'?'var(--red-bright)':'var(--blue-light)'):'rgba(255,255,255,0.1)'}`, borderRadius:'6px', fontFamily:'var(--font-title)', fontSize:'0.85rem', color:'white' }}>
                {team==='team1'?'🔴':'🔵'} {gs.teamNames?.[team]} {gs.buzzer?.winner===team?'✓ BUZZÉ':''}
              </div>
            ))}
          </div>

          {/* Après révélation : artiste + titre + attribution points */}
          {gs.blindTest.revealed && (
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'10px' }}>
              <div style={{ fontFamily:'var(--font-title)', fontSize:'0.95rem', color:'var(--green)', marginBottom:'10px' }}>
                🎵 {gs.answer}{gs.question ? ` — ${gs.question}` : ''}
              </div>
              <div style={{ display:'flex', gap:'16px', flexWrap:'wrap' }}>
                {['team1','team2'].map(team => (
                  <div key={team}>
                    <div style={{ fontFamily:'var(--font-title)', fontSize:'0.8rem', color: team==='team1'?'var(--red-bright)':'var(--blue-light)', marginBottom:'5px' }}>
                      {team==='team1'?'🔴':'🔵'} {gs.teamNames?.[team]}
                    </div>
                    <div style={{ display:'flex', gap:'5px' }}>
                      {[1,2,3].map(pts => (
                        <Btn key={pts} small onClick={() => emit('admin_add_score', { team, points:pts })} color="#1b5e20">+{pts}</Btn>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Vidéo */}
      {round?.type === 'video' && gs.videoRound && (
        <Section title="Vidéo">
          {gs.videoRound.phase === 'watching' && (
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'10px' }}>
              {gs.videoRound.playing
                ? <Btn onClick={() => emit('admin_video_pause')} color="#555">⏸ Pause</Btn>
                : <Btn onClick={() => emit('admin_video_play')} color="#1565C0">▶ Lancer la vidéo</Btn>
              }
              <Btn onClick={() => emit('admin_video_to_questions')} color="#00695c" disabled={!questions.length}>
                ➡ Passer aux questions
              </Btn>
            </div>
          )}
          {gs.videoRound.phase === 'question' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                <Btn onClick={() => emit('admin_next_question')} color="#1b5e20" disabled={!hasMoreQ}>▶ Question suivante</Btn>
                <Btn onClick={() => emit('admin_reveal_answer')} color="#00695c" disabled={gs.answerVisible}>✅ Révéler réponse</Btn>
                <Btn onClick={() => emit('admin_reset_buzzer')} color="#6a1b9a">🔄 Buzzer</Btn>
              </div>
              {gs.question && (
                <div style={{ padding:'10px', background:'rgba(0,0,0,0.3)', borderRadius:'6px', fontSize:'0.9rem', color:'rgba(255,255,255,0.7)' }}>
                  Q{qIdx+1}/{questions.length} : {gs.question}
                  {gs.answerVisible && <span style={{ color:'var(--green)', marginLeft:'8px' }}>→ {gs.answer}</span>}
                </div>
              )}
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                {['team1','team2'].map(team => (
                  <div key={team} style={{ padding:'6px 14px', background: gs.buzzer?.winner===team?(team==='team1'?'rgba(229,57,53,0.3)':'rgba(21,101,192,0.3)'):'rgba(0,0,0,0.3)', border:`1px solid ${gs.buzzer?.winner===team?(team==='team1'?'var(--red-bright)':'var(--blue-light)'):'rgba(255,255,255,0.1)'}`, borderRadius:'6px', fontFamily:'var(--font-title)', fontSize:'0.85rem', color:'white' }}>
                    {team==='team1'?'🔴':'🔵'} {gs.teamNames?.[team]} {gs.buzzer?.winner===team?'✓ BUZZÉ':''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Mimes */}
      {round?.type === 'mime' && gs.mime && (() => {
        const subRounds = round.subRounds || [];
        const srIdx = gs.mime.subRoundIndex;
        const currentSr = subRounds[srIdx];
        const hasNext = srIdx < subRounds.length - 1;
        const hasStarted = srIdx >= 0;
        return (
          <Section title="Mimes">
            {/* Navigation sous-manches */}
            <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'10px', flexWrap:'wrap' }}>
              <Btn onClick={() => emit('admin_mime_next_subround')} color="#4a148c" disabled={!hasNext && hasStarted}>
                {hasStarted ? '⏭ Sous-manche suivante' : '▶ Démarrer'}
              </Btn>
              {hasStarted && (
                <span style={{ fontFamily:'var(--font-title)', fontSize:'0.85rem', color:'var(--yellow)' }}>
                  {srIdx + 1}/{subRounds.length} — {currentSr?.label}
                </span>
              )}
            </div>

            {/* Lancement par équipe */}
            {hasStarted && (
              <>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'8px' }}>
                  <Btn onClick={() => emit('admin_mime_start', { team:'team1' })} color="#c62828">▶ 🔴 {gs.teamNames?.team1}</Btn>
                  <Btn onClick={() => emit('admin_mime_start', { team:'team2' })} color="#1565C0">▶ 🔵 {gs.teamNames?.team2}</Btn>
                  {gs.mime.running
                    ? <Btn onClick={() => emit('admin_mime_pause')} color="#555">⏸ Pause</Btn>
                    : <Btn onClick={() => emit('admin_mime_resume')} color="#E65100" disabled={!gs.mime.team || gs.mime.remaining <= 0}>▶ Reprendre</Btn>
                  }
                </div>
                {gs.mime.team && (
                  <div style={{ padding:'6px 12px', background:'rgba(0,0,0,0.3)', borderRadius:'6px', fontFamily:'var(--font-title)', fontSize:'0.85rem', color:'rgba(255,255,255,0.6)', marginBottom:'8px' }}>
                    En jeu : {gs.mime.team==='team1'?'🔴':'🔵'} {gs.teamNames?.[gs.mime.team]}
                  </div>
                )}
                <div style={{ display:'flex', gap:'16px', flexWrap:'wrap' }}>
                  {['team1','team2'].map(team => (
                    <div key={team}>
                      <div style={{ fontFamily:'var(--font-title)', fontSize:'0.8rem', color: team==='team1'?'var(--red-bright)':'var(--blue-light)', marginBottom:'5px' }}>
                        {team==='team1'?'🔴':'🔵'} {gs.teamNames?.[team]}
                      </div>
                      <div style={{ display:'flex', gap:'5px' }}>
                        {[1,2,3].map(pts => (
                          <Btn key={pts} small onClick={() => emit('admin_add_score', { team, points:pts })} color="#1b5e20">+{pts}</Btn>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Section>
        );
      })()}

      {/* Créativité */}
      {round?.type === 'creative' && gs.creative && (
        <Section title="Atelier créativité">
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            <Btn onClick={() => emit('admin_creative_start')} color="#1b5e20">🔄 Relancer</Btn>
            {gs.creative.running
              ? <Btn onClick={() => emit('admin_creative_pause')} color="#555">⏸ Pause</Btn>
              : <Btn onClick={() => emit('admin_creative_resume')} color="#E65100" disabled={gs.creative.remaining <= 0}>▶ Reprendre</Btn>
            }
          </div>
        </Section>
      )}

      {/* Wager */}
      {round?.type === 'wager' && gs.wager && (() => {
        const { phase, bet, assignedTeam, theme } = gs.wager;
        const otherTeam = assignedTeam === 'team1' ? 'team2' : 'team1';
        const assignedName = gs.teamNames?.[assignedTeam];
        const otherName = gs.teamNames?.[otherTeam];
        const assignedColor = assignedTeam === 'team1' ? 'var(--red-bright)' : 'var(--blue-light)';
        const otherColor = otherTeam === 'team1' ? 'var(--red-bright)' : 'var(--blue-light)';
        const buzzerWinner = gs.buzzer?.winner;
        return (
          <Section title="Paris">
            {phase === 'betting' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                <div style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.6)' }}>
                  {theme && <>Thème : <strong style={{ color:'var(--yellow)' }}>{theme}</strong> — </>}
                  <span style={{ color: assignedColor }}>{assignedTeam==='team1'?'🔴':'🔵'} {assignedName}</span> parie
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontFamily:'var(--font-title)', fontSize:'0.9rem', color: assignedColor }}>
                    {assignedTeam==='team1'?'🔴':'🔵'} {assignedName}
                  </span>
                  <input
                    type="number" min="0" value={localBet}
                    onChange={e => setLocalBet(parseInt(e.target.value) || 0)}
                    style={{ width:'90px', background:'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'6px', color:'white', padding:'8px 10px', fontFamily:'var(--font-body)', fontSize:'1.1rem', textAlign:'center', outline:'none' }}
                  />
                  <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.85rem' }}>pts</span>
                </div>
                <Btn onClick={() => emit('admin_wager_start_question', { bet: localBet })} color="#E65100">
                  🎯 Lancer la question
                </Btn>
              </div>
            )}

            {phase === 'question' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <div style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.6)' }}>
                  <span style={{ color: assignedColor }}>{assignedTeam==='team1'?'🔴':'🔵'} {assignedName}</span> répond — mise : <strong style={{ color:'var(--yellow)' }}>{bet} pts</strong>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <div style={{ padding:'6px 14px', background: buzzerWinner===assignedTeam?`${assignedColor}33`:'rgba(0,0,0,0.3)', border:`1px solid ${buzzerWinner===assignedTeam?assignedColor:'rgba(255,255,255,0.1)'}`, borderRadius:'6px', fontFamily:'var(--font-title)', fontSize:'0.9rem', color:'white' }}>
                    {assignedTeam==='team1'?'🔴':'🔵'} {assignedName} {buzzerWinner===assignedTeam?'✓ BUZZÉ':''}
                  </div>
                </div>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  <Btn onClick={() => emit('admin_reset_buzzer')} color="#6a1b9a">🔄 Buzzer</Btn>
                  <Btn onClick={() => emit('admin_reveal_answer')} color="#00695c" disabled={gs.answerVisible}>✅ Révéler</Btn>
                </div>
                {gs.question && (
                  <div style={{ padding:'8px', background:'rgba(0,0,0,0.3)', borderRadius:'6px', fontSize:'0.85rem', color:'rgba(255,255,255,0.7)' }}>
                    Q : {gs.question}{gs.answerVisible && <span style={{ color:'var(--green)', marginLeft:'8px' }}>→ {gs.answer}</span>}
                  </div>
                )}
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  <Btn onClick={() => emit('admin_wager_award', { team: assignedTeam })} color="#1b5e20">
                    ✅ Bonne réponse → +{bet} pts à {assignedTeam==='team1'?'🔴':'🔵'} {assignedName}
                  </Btn>
                  <Btn onClick={() => emit('admin_wager_open_steal')} color="#E65100">
                    ❌ Mauvaise réponse → Vol possible
                  </Btn>
                </div>
                <Btn onClick={() => emit('admin_next_question')} color="#555" disabled={!hasMoreQ}>⏭ Question suivante</Btn>
              </div>
            )}

            {phase === 'steal' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <div style={{ fontSize:'0.85rem', padding:'8px 12px', background:'rgba(229,57,53,0.1)', border:'1px solid rgba(229,57,53,0.3)', borderRadius:'6px' }}>
                  <span style={{ color: otherColor }}>{otherTeam==='team1'?'🔴':'🔵'} {otherName}</span> peut voler <strong style={{ color:'var(--yellow)' }}>{bet} pts</strong>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <div style={{ padding:'6px 14px', background: buzzerWinner===otherTeam?`${otherColor}33`:'rgba(0,0,0,0.3)', border:`1px solid ${buzzerWinner===otherTeam?otherColor:'rgba(255,255,255,0.1)'}`, borderRadius:'6px', fontFamily:'var(--font-title)', fontSize:'0.9rem', color:'white' }}>
                    {otherTeam==='team1'?'🔴':'🔵'} {otherName} {buzzerWinner===otherTeam?'✓ BUZZÉ':''}
                  </div>
                </div>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  <Btn onClick={() => emit('admin_reset_buzzer')} color="#6a1b9a">🔄 Buzzer</Btn>
                  <Btn onClick={() => emit('admin_reveal_answer')} color="#00695c" disabled={gs.answerVisible}>✅ Révéler</Btn>
                </div>
                {gs.question && (
                  <div style={{ padding:'8px', background:'rgba(0,0,0,0.3)', borderRadius:'6px', fontSize:'0.85rem', color:'rgba(255,255,255,0.7)' }}>
                    Q : {gs.question}{gs.answerVisible && <span style={{ color:'var(--green)', marginLeft:'8px' }}>→ {gs.answer}</span>}
                  </div>
                )}
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  <Btn onClick={() => emit('admin_wager_award', { team: otherTeam })} color="#1b5e20">
                    ✅ Vol réussi → +{bet} pts à {otherTeam==='team1'?'🔴':'🔵'} {otherName}
                  </Btn>
                  <Btn onClick={() => emit('admin_next_question')} color="#555" disabled={!hasMoreQ}>❌ Vol raté → Question suivante</Btn>
                </div>
              </div>
            )}
          </Section>
        );
      })()}

      {/* Score editing */}
      <Section title="Scores de la manche">
        {gs.buzzer?.winner && (
          <div style={{
            display:'flex', alignItems:'center', gap:'10px',
            padding:'8px 14px', marginBottom:'10px',
            background: gs.buzzer.winner==='team1' ? 'rgba(255,45,120,0.2)' : 'rgba(0,229,255,0.15)',
            border: `2px solid ${gs.buzzer.winner==='team1' ? 'var(--red-bright)' : 'var(--blue-light)'}`,
            borderRadius:'8px', fontFamily:'var(--font-title)', fontSize:'0.9rem', color:'white',
            animation:'pulse-glow 1s ease infinite',
          }}>
            🔔 {gs.buzzer.winner==='team1'?'🔴':'🔵'} <strong style={{ marginLeft:'4px' }}>{gs.teamNames?.[gs.buzzer.winner]}</strong> a buzzé !
          </div>
        )}
        <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
          {['team1','team2'].map(team => {
            const flash = scoreFlash?.team === team;
            return (
              <div key={team} style={{ flex:1, minWidth:'140px', position:'relative' }}>
                <div style={{ fontFamily:'var(--font-title)', fontSize:'0.9rem', color:team==='team1'?'var(--red-bright)':'var(--blue-light)', marginBottom:'2px' }}>
                  {team==='team1'?'🔴':'🔵'} {gs.teamNames?.[team]}
                </div>
                <div style={{ fontFamily:'var(--font-body)', fontSize:'0.8rem', color:'rgba(255,255,255,0.4)', marginBottom:'6px' }}>
                  Manche : <strong style={{ color:'var(--green)' }}>{gs.roundScores?.[team]||0} pts</strong>
                  {' · '}Total : {gs.scores?.[team]||0} pts
                </div>
                {flash && (
                  <div className="anim-bounce-in" style={{
                    position:'absolute', top:0, right:0,
                    background: scoreFlash.pts > 0 ? 'rgba(0,200,83,0.95)' : 'rgba(198,40,40,0.95)',
                    color:'white', borderRadius:'6px', padding:'3px 10px',
                    fontFamily:'var(--font-display)', fontSize:'1rem',
                    pointerEvents:'none', zIndex:10,
                  }}>
                    {scoreFlash.pts > 0 ? `+${scoreFlash.pts}` : scoreFlash.pts}
                  </div>
                )}
                <div style={{ display:'flex', gap:'6px' }}>
                  {[1,2,3,-1].map(pts=>(
                    <Btn key={pts} small onClick={() => addScore(team, pts)} color={pts<0?'#c62828':'#1b5e20'}>
                      {pts>0?`+${pts}`:pts}
                    </Btn>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

// ── THEMES PANEL ───────────────────────────────────────────────────────────────
const THEME_CSS_VARS = [
  { key:'--sky',           label:'Fond principal',    group:'Backgrounds' },
  { key:'--sky2',          label:'Fond secondaire',   group:'Backgrounds' },
  { key:'--blue',          label:'Bleu',              group:'Couleurs' },
  { key:'--blue-light',    label:'Bleu clair / néon', group:'Couleurs' },
  { key:'--red',           label:'Rouge',             group:'Couleurs' },
  { key:'--red-bright',    label:'Rouge vif',         group:'Couleurs' },
  { key:'--yellow',        label:'Jaune / or',        group:'Couleurs' },
  { key:'--yellow-bright', label:'Jaune vif',         group:'Couleurs' },
  { key:'--green',         label:'Vert',              group:'Couleurs' },
  { key:'--purple',        label:'Violet',            group:'Couleurs' },
  { key:'--orange',        label:'Orange',            group:'Couleurs' },
  { key:'--teal',          label:'Cyan',              group:'Couleurs' },
  { key:'--white',         label:'Texte principal',   group:'Surfaces' },
  { key:'--snow',          label:'Neige / reflets',   group:'Surfaces' },
  { key:'--ember',         label:'Braise / lueur',    group:'Surfaces' },
  { key:'--wood-panel',    label:'Surface panneaux',  group:'Surfaces' },
];

const EMPTY_THEME = {
  id: '',
  name: '',
  description: '',
  backgroundStyle: 'dark',
  cssVars: Object.fromEntries(THEME_CSS_VARS.map(v => [v.key, '#000000'])),
};

function ThemesPanel({ gs, emit, editingTheme, setEditingTheme }) {
  const themes = gs?.themes || [];
  const activeThemeId = gs?.activeThemeId || 'chalet';

  const startNew = () => setEditingTheme({ ...EMPTY_THEME, id: `theme_${Date.now()}`, cssVars: { ...EMPTY_THEME.cssVars } });
  const startEdit = (t) => setEditingTheme({ ...t, cssVars: { ...t.cssVars } });
  const cancelEdit = () => setEditingTheme(null);

  const saveTheme = () => {
    if (!editingTheme?.name?.trim()) return alert('Donne un nom au thème.');
    emit('admin_save_theme', editingTheme);
    setEditingTheme(null);
  };

  const deleteTheme = (themeId) => {
    if (themeId === 'chalet') return alert('Le thème Chalet est protégé.');
    if (!confirm('Supprimer ce thème ?')) return;
    emit('admin_delete_theme', { themeId });
  };

  if (editingTheme) {
    const setVar = (key, val) => setEditingTheme(t => ({ ...t, cssVars: { ...t.cssVars, [key]: val } }));
    const groups = [...new Set(THEME_CSS_VARS.map(v => v.group))];
    return (
      <div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'16px' }}>
          <Btn small onClick={cancelEdit} color="#555">← Retour</Btn>
          <span style={{ fontFamily:'var(--font-title)', fontSize:'1rem', color:'rgba(255,255,255,0.6)' }}>
            {editingTheme.name || 'Nouveau thème'}
          </span>
        </div>
        <Section title="Identité">
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            <Input value={editingTheme.name} onChange={v => setEditingTheme(t => ({...t, name:v}))} placeholder="Nom du thème"/>
            <Input value={editingTheme.description} onChange={v => setEditingTheme(t => ({...t, description:v}))} placeholder="Description courte"/>
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <span style={{ fontFamily:'var(--font-title)', fontSize:'0.85rem', color:'rgba(255,255,255,0.6)' }}>Décor de fond :</span>
              {['chalet','dark'].map(style => (
                <button key={style} onClick={() => setEditingTheme(t => ({...t, backgroundStyle:style}))} style={{
                  padding:'6px 14px', borderRadius:'6px', cursor:'pointer', fontFamily:'var(--font-title)', fontSize:'0.85rem',
                  background: editingTheme.backgroundStyle === style ? '#1565C0' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${editingTheme.backgroundStyle === style ? '#42A5F5' : 'rgba(255,255,255,0.15)'}`,
                  color:'white',
                }}>
                  {style === 'chalet' ? '❄️ Chalet (neige + montagne)' : '🌑 Sombre (sans décor)'}
                </button>
              ))}
            </div>
          </div>
        </Section>
        {groups.map(group => (
          <Section key={group} title={group}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:'10px' }}>
              {THEME_CSS_VARS.filter(v => v.group === group).map(v => (
                <div key={v.key} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <input type="color" value={editingTheme.cssVars[v.key] || '#000000'}
                    onChange={e => setVar(v.key, e.target.value)}
                    style={{ width:'36px', height:'36px', border:'none', borderRadius:'4px', cursor:'pointer', background:'none' }}
                  />
                  <span style={{ fontFamily:'var(--font-body)', fontSize:'0.8rem', color:'rgba(255,255,255,0.7)' }}>{v.label}</span>
                </div>
              ))}
            </div>
          </Section>
        ))}
        <Btn onClick={saveTheme} color="#1b5e20" full>💾 Sauvegarder le thème</Btn>
      </div>
    );
  }

  return (
    <div>
      <Section title="Thèmes disponibles">
        <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'12px' }}>
          {themes.map(t => (
            <div key={t.id} style={{
              display:'flex', alignItems:'center', gap:'10px', padding:'12px',
              background: t.id === activeThemeId ? 'rgba(21,101,192,0.2)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${t.id === activeThemeId ? '#42A5F5' : 'rgba(255,255,255,0.1)'}`,
              borderRadius:'8px',
            }}>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'var(--font-title)', fontSize:'0.95rem', color:'white' }}>{t.name}</div>
                {t.description && <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.45)', marginTop:'2px' }}>{t.description}</div>}
                <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>
                  {t.backgroundStyle === 'chalet' ? '❄️ Chalet' : '🌑 Sombre'} — {Object.keys(t.cssVars || {}).length} variables
                </div>
              </div>
              <div style={{ display:'flex', gap:'4px' }}>
                {t.id !== activeThemeId && (
                  <Btn small onClick={() => emit('admin_set_active_theme', { themeId: t.id })} color="#1b5e20">✅ Activer</Btn>
                )}
                {t.id === activeThemeId && (
                  <span style={{ fontFamily:'var(--font-title)', fontSize:'0.8rem', color:'#42A5F5', padding:'6px 8px' }}>Actif</span>
                )}
                <Btn small onClick={() => startEdit(t)} color="#555">✏️</Btn>
                {t.id !== 'chalet' && (
                  <Btn small onClick={() => deleteTheme(t.id)} color="#c62828">🗑</Btn>
                )}
              </div>
            </div>
          ))}
        </div>
        <Btn onClick={startNew} color="#4a148c" full>➕ Créer un nouveau thème</Btn>
      </Section>
    </div>
  );
}

// ── MAIN ADMIN ─────────────────────────────────────────────────────────────────
export default function Admin() {
  const { gameState: gs, emit, connected } = useSocket();
  const [tab, setTab] = useState('control'); // control | setup | config
  const [rounds, setRounds] = useState([]);
  const [teamNames, setTeamNames] = useState({ team1:'Équipe 1', team2:'Équipe 2' });
  const [savedRounds, setSavedRounds] = useState(false);
  const [bgMusicUrl, setBgMusicUrl] = useState('');
  const [lobbyMusicUrl, setLobbyMusicUrl] = useState('');
  const [gameName, setGameName] = useState('CHALET QUIZ');
  const [endMusicUrl, setEndMusicUrl] = useState('');
  const [editingTheme, setEditingTheme] = useState(null); // null | theme object

  useEffect(() => {
    if (gs?.rounds?.length && !savedRounds) { setRounds(gs.rounds); setSavedRounds(true); }
    if (gs?.teamNames) setTeamNames(gs.teamNames);
    if (gs?.backgroundMusicUrl !== undefined) setBgMusicUrl(gs.backgroundMusicUrl);
    if (gs?.lobbyMusicUrl !== undefined) setLobbyMusicUrl(gs.lobbyMusicUrl);
    if (gs?.gameName) setGameName(gs.gameName);
    if (gs?.endMusicUrl !== undefined) setEndMusicUrl(gs.endMusicUrl);
  }, [gs]);

  const saveBgMusic = (url) => {
    setBgMusicUrl(url);
    emit('admin_set_background_music', { url });
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const config = JSON.parse(text);
      const res = await fetch(`${SERVER_URL}/config/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        // Mise à jour directe — évite la race condition avec le socket game_state
        if (Array.isArray(config.rounds) && config.rounds.length > 0) {
          setRounds(config.rounds);
        }
        setSavedRounds(true);
        alert('✅ Config importée !');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`❌ Erreur lors de l'import : ${err.error || res.status}`);
      }
    } catch (e) {
      alert(`❌ Fichier JSON invalide : ${e.message}`);
    }
    e.target.value = '';
  };

  const saveLobbyMusic = (url) => {
    setLobbyMusicUrl(url);
    emit('admin_set_lobby_music', { url });
  };

  const saveEndMusic = (url) => {
    setEndMusicUrl(url);
    emit('admin_set_end_music', { url });
  };

  const saveRounds = (overrideRounds) => {
    const r = overrideRounds ?? rounds;
    emit('admin_set_rounds', r);
    emit('admin_set_team_names', teamNames);
    if (!overrideRounds) alert('✅ Configuration sauvegardée !');
  };

  const tabs = [
    { id:'control', label:'🎮 Contrôle' },
    { id:'setup', label:'📝 Manches' },
    { id:'config', label:'⚙️ Config' },
    { id:'themes', label:'🎨 Thèmes' },
  ];

  return (
    <div style={{
      minHeight:'100vh', background:'#0d1117', color:'white',
      fontFamily:'var(--font-body)',
    }}>
      {/* Header */}
      <div style={{ background:'rgba(0,0,0,0.6)', borderBottom:'1px solid rgba(255,255,255,0.1)', padding:'12px 20px', display:'flex', alignItems:'center', gap:'12px', position:'sticky', top:0, zIndex:10 }}>
        <span style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', color:'var(--yellow)', letterSpacing:'2px' }}>🎿 ADMIN</span>
        <div style={{ flex:1 }}/>
        <div style={{ display:'flex', gap:'4px' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding:'8px 16px', borderRadius:'6px', cursor:'pointer',
              background: tab===t.id ? '#1565C0' : 'transparent',
              border: tab===t.id ? '1px solid #42A5F5' : '1px solid rgba(255,255,255,0.1)',
              color:'white', fontFamily:'var(--font-title)', fontSize:'0.85rem',
            }}>{t.label}</button>
          ))}
        </div>
        <div style={{ padding:'4px 10px', borderRadius:'4px', background:connected?'rgba(0,200,83,0.2)':'rgba(229,57,53,0.2)', border:`1px solid ${connected?'#00C853':'#FF1744'}`, fontSize:'0.75rem', color:connected?'#00C853':'#FF1744', fontFamily:'var(--font-title)' }}>
          {connected?'🟢 OK':'🔴 OFF'}
        </div>
      </div>

      <div style={{ padding:'16px 20px', maxWidth:'900px', margin:'0 auto' }}>

        {tab === 'control' && gs && <ControlPanel gs={gs} emit={emit}/>}

        {tab === 'setup' && (
          <div>
            <Section title="Manches du jeu">
              <RoundEditor rounds={rounds} onChange={setRounds} onSaveComplete={saveRounds}/>
            </Section>
            <Btn onClick={saveRounds} color="#1b5e20" full>💾 Envoyer au jeu</Btn>
          </div>
        )}

        {tab === 'config' && (
          <div>
            <Section title="Nom du jeu">
              <Input
                value={gameName}
                onChange={v => setGameName(v)}
                placeholder="CHALET QUIZ"
              />
              <div style={{ marginTop:'8px' }}>
                <Btn small onClick={() => emit('admin_set_game_name', { name: gameName })} color="#1565C0">
                  ✅ Appliquer
                </Btn>
              </div>
            </Section>
            <Section title="Noms des équipes">
              <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:'180px' }}>
                  <label style={{ fontSize:'0.8rem', color:'var(--red-bright)', display:'block', marginBottom:'4px' }}>🔴 Équipe 1</label>
                  <Input value={teamNames.team1} onChange={v=>setTeamNames({...teamNames,team1:v})} placeholder="Équipe 1"/>
                </div>
                <div style={{ flex:1, minWidth:'180px' }}>
                  <label style={{ fontSize:'0.8rem', color:'var(--blue-light)', display:'block', marginBottom:'4px' }}>🔵 Équipe 2</label>
                  <Input value={teamNames.team2} onChange={v=>setTeamNames({...teamNames,team2:v})} placeholder="Équipe 2"/>
                </div>
              </div>
            </Section>
            <Section title="Musique de fond">
              <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                <div style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.5)', fontFamily:'var(--font-title)', letterSpacing:'1px' }}>
                  🏠 LOBBY (écran d'accueil)
                </div>
                <FileUpload value={lobbyMusicUrl} onChange={saveLobbyMusic} accept="audio/*" label="🎵 Audio"/>
                {lobbyMusicUrl && (
                  <Btn small onClick={() => saveLobbyMusic('')} color="#c62828">⏹ Retirer</Btn>
                )}
                <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'12px', fontSize:'0.85rem', color:'rgba(255,255,255,0.5)', fontFamily:'var(--font-title)', letterSpacing:'1px' }}>
                  🎮 JEU (pendant les manches)
                </div>
                <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)' }}>
                  Coupée automatiquement lors des jingles de manches et du blind test.
                </div>
                <FileUpload value={bgMusicUrl} onChange={saveBgMusic} accept="audio/*" label="🎵 Audio"/>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <span style={{ fontFamily:'var(--font-title)', fontSize:'0.85rem', color:'rgba(255,255,255,0.6)', whiteSpace:'nowrap' }}>
                    🔊 Volume : {Math.round((gs?.bgMusicVolume ?? 0.25) * 100)}%
                  </span>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={gs?.bgMusicVolume ?? 0.25}
                    onChange={e => emit('admin_set_bg_music_volume', { volume: parseFloat(e.target.value) })}
                    style={{ flex:1, accentColor:'var(--orange)' }}
                  />
                </div>
                {bgMusicUrl && (
                  <Btn small onClick={() => saveBgMusic('')} color="#c62828">⏹ Arrêter la musique</Btn>
                )}
              </div>
            </Section>
            <Section title="Musique de fin de partie">
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)' }}>
                  Lancée automatiquement sur l'écran de fin. En boucle.
                </div>
                <FileUpload value={endMusicUrl} onChange={saveEndMusic} accept="audio/*" label="🎵 Audio"/>
                {endMusicUrl && (
                  <Btn small onClick={() => saveEndMusic('')} color="#c62828">⏹ Retirer</Btn>
                )}
              </div>
            </Section>
            <Section title="Liens utiles">
              <div style={{ display:'flex', flexDirection:'column', gap:'8px', fontSize:'0.9rem' }}>
                {[
                  { label:'🖥 Écran principal', hash:'#/' },
                  { label:`📱 Buzzer ${gs?.teamNames?.team1 || 'Équipe 1'}`, hash:'#/buzzer?team=team1' },
                  { label:`📱 Buzzer ${gs?.teamNames?.team2 || 'Équipe 2'}`, hash:'#/buzzer?team=team2' },
                  { label:'⚙️ Admin', hash:'#/admin' },
                ].map(l => {
                  const fullUrl = `${window.location.origin}${window.location.pathname}${l.hash}`;
                  return (
                    <div key={l.hash} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <span style={{ color:'rgba(255,255,255,0.6)', minWidth:'200px' }}>{l.label}</span>
                      <code
                        style={{ background:'rgba(0,0,0,0.4)', padding:'4px 10px', borderRadius:'4px', color:'var(--teal)', fontSize:'0.85rem', flex:1, cursor:'pointer', userSelect:'all' }}
                        title="Cliquer pour copier"
                        onClick={() => navigator.clipboard?.writeText(fullUrl)}
                      >
                        {fullUrl}
                      </code>
                    </div>
                  );
                })}
              </div>
            </Section>
            <Section title="Export / Import config">
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <div style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.5)' }}>
                  Sauvegarde complète : manches, questions, équipes, musique, nom du jeu.
                </div>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  <a
                    href={`${SERVER_URL}/config/export`}
                    download="chalet-quiz-config.json"
                    style={{ textDecoration:'none' }}
                  >
                    <Btn color="#1565C0">⬇ Exporter la config</Btn>
                  </a>
                  <label style={{
                    padding:'10px 18px', borderRadius:'6px', cursor:'pointer',
                    background:'#4a148c', border:'2px solid #7B1FA2',
                    color:'white', fontFamily:'var(--font-title)', fontSize:'0.95rem',
                  }}>
                    ⬆ Importer une config
                    <input type="file" accept=".json" style={{ display:'none' }} onChange={handleImport}/>
                  </label>
                </div>
              </div>
            </Section>
            <Btn onClick={saveRounds} color="#1b5e20" full>💾 Sauvegarder configuration</Btn>
          </div>
        )}

        {tab === 'themes' && (
          <ThemesPanel gs={gs} emit={emit} editingTheme={editingTheme} setEditingTheme={setEditingTheme}/>
        )}

      </div>
    </div>
  );
}
