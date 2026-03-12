import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import Snow from '../components/Snow';

const COLORS = ['#FF1744','#42A5F5','#00C853','#AB47BC','#FF6D00','#00BCD4','#F06292','#FFD600'];
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function Buzzer() {
  const { gameState: gs, emit, on } = useSocket();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState('idle'); // idle | buzzed | locked | waiting

  // Game buzzer state
  const [flash, setFlash] = useState(false);
  const audioCtx = useRef(null);

  // Profile setup state
  const [profileName, setProfileName] = useState('');
  const [profileColor, setProfileColor] = useState('');
  const [profileSent, setProfileSent] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null); // data URL
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [uploading, setUploading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const t = searchParams.get('team');
  const team = (t === 'team1' || t === 'team2') ? t : null;

  // Init profile from game state
  useEffect(() => {
    if (!gs || !team) return;
    if (!profileName) setProfileName(gs.teamNames?.[team] || '');
    if (!profileColor) setProfileColor(gs.teamColors?.[team] || (team === 'team1' ? '#FF1744' : '#42A5F5'));
  }, [gs?.teamNames?.[team], gs?.teamColors?.[team], team]);

  // Attach video stream when camera opens
  useEffect(() => {
    if (cameraOpen && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [cameraOpen, stream]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, [stream]);

  // Sync buzzer state from game state
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
        playQuack(true);
        setFlash(true);
        setTimeout(() => setFlash(false), 1000);
      } else {
        playQuack(false);
      }
    });
  }, [team]);

  const triggerHaptic = () => {
    if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
  };

  const playQuack = (win) => {
    try {
      if (win) {
        const audio = new Audio(import.meta.env.BASE_URL + 'sounds/quack.mp3');
        audio.volume = 0.9;
        audio.play().catch(() => {});
      } else {
        if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = audioCtx.current;
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.45);
        filter.type = 'bandpass'; filter.frequency.value = 700; filter.Q.value = 3;
        gain.gain.setValueAtTime(0.45, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
      }
    } catch(e) {}
  };

  const handleBuzz = () => {
    if (state !== 'waiting') return;
    emit('buzzer_press', { team });
  };

  // ── Camera ────────────────────────────────────────────────────────────────────

  const openCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      setStream(s);
      setCameraOpen(true);
      setCapturedPhoto(null);
    } catch {
      alert("Impossible d'accéder à la caméra");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const offsetX = (video.videoWidth - size) / 2;
    const offsetY = (video.videoHeight - size) / 2;
    canvas.width = 400; canvas.height = 400;
    canvas.getContext('2d').drawImage(video, offsetX, offsetY, size, size, 0, 0, 400, 400);
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setCameraOpen(false);
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.85));
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
  };

  // ── Confirm profile ───────────────────────────────────────────────────────────

  const confirmProfile = async () => {
    setUploading(true);
    try {
      let photoUrl = null;
      if (capturedPhoto) {
        const blob = await (await fetch(capturedPhoto)).blob();
        const fd = new FormData();
        fd.append('image', blob, 'selfie.jpg');
        const res = await fetch(`${SERVER_URL}/upload`, { method: 'POST', body: fd });
        const data = await res.json();
        photoUrl = `${SERVER_URL}${data.url}`;
      }
      emit('team_set_profile', { team, name: profileName.trim() || undefined, color: profileColor, photoUrl });
      setProfileSent(true);
    } catch {
      alert("Erreur lors de l'envoi du profil");
    }
    setUploading(false);
  };

  // ── Team selection screen (no team param) ─────────────────────────────────────

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
                <a href="#/buzzer?team=team1" style={{ textDecoration:'none' }}>
                  <div style={{ padding:'20px 40px', background:`${gs.teamColors?.team1 || '#FF1744'}22`, border:`3px solid ${gs.teamColors?.team1 || '#FF1744'}`, borderRadius:'12px', fontFamily:'var(--font-title)', fontSize:'1.5rem', color:'white', boxShadow:`0 0 20px ${gs.teamColors?.team1 || '#FF1744'}66`, display:'flex', alignItems:'center', gap:'16px', justifyContent:'center' }}>
                    {gs.teamPhotos?.team1
                      ? <img src={gs.teamPhotos.team1} alt="" style={{ width:'40px', height:'40px', borderRadius:'50%', objectFit:'cover' }}/>
                      : '🔴'}
                    {gs.teamNames.team1}
                  </div>
                </a>
                <a href="#/buzzer?team=team2" style={{ textDecoration:'none' }}>
                  <div style={{ padding:'20px 40px', background:`${gs.teamColors?.team2 || '#42A5F5'}22`, border:`3px solid ${gs.teamColors?.team2 || '#42A5F5'}`, borderRadius:'12px', fontFamily:'var(--font-title)', fontSize:'1.5rem', color:'white', boxShadow:`0 0 20px ${gs.teamColors?.team2 || '#42A5F5'}66`, display:'flex', alignItems:'center', gap:'16px', justifyContent:'center' }}>
                    {gs.teamPhotos?.team2
                      ? <img src={gs.teamPhotos.team2} alt="" style={{ width:'40px', height:'40px', borderRadius:'50%', objectFit:'cover' }}/>
                      : '🔵'}
                    {gs.teamNames.team2}
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
  const teamColor = gs?.teamColors?.[team] || (isTeam1 ? '#FF1744' : '#42A5F5');

  // ── Profile setup screen (lobby only) ────────────────────────────────────────

  if (gs?.screen === 'lobby' || gs?.screen === 'waiting') {
    // Camera open: show viewfinder
    if (cameraOpen) {
      return (
        <div style={{ minHeight:'100vh', background:'#000', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'20px', padding:'20px', position:'relative' }}>
          <canvas ref={canvasRef} style={{ display:'none' }}/>
          <div style={{ fontFamily:'var(--font-title)', color:teamColor, fontSize:'1.2rem', letterSpacing:'2px' }}>📷 SELFIE D'ÉQUIPE</div>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width:'min(340px,85vw)', height:'min(340px,85vw)', objectFit:'cover', borderRadius:'50%', border:`4px solid ${teamColor}`, boxShadow:`0 0 30px ${teamColor}88` }}
          />
          <button
            onClick={capturePhoto}
            style={{ width:'72px', height:'72px', borderRadius:'50%', background:teamColor, border:`4px solid white`, fontSize:'2rem', cursor:'pointer', boxShadow:`0 0 20px ${teamColor}` }}
          >📸</button>
          <button onClick={() => { stream?.getTracks().forEach(t => t.stop()); setStream(null); setCameraOpen(false); }}
            style={{ fontFamily:'var(--font-title)', background:'transparent', border:'none', color:'rgba(255,255,255,0.4)', fontSize:'1rem', cursor:'pointer' }}>
            Annuler
          </button>
        </div>
      );
    }

    // Profile sent: waiting screen
    if (profileSent) {
      return (
        <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'24px', padding:'20px', position:'relative' }}>
          <Snow count={10}/>
          <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'20px', textAlign:'center' }}>
            {capturedPhoto
              ? <img src={capturedPhoto} alt="" style={{ width:'100px', height:'100px', borderRadius:'50%', objectFit:'cover', border:`4px solid ${teamColor}`, boxShadow:`0 0 30px ${teamColor}88` }}/>
              : <div style={{ fontSize:'4rem' }}>{isTeam1?'🔴':'🔵'}</div>
            }
            <div style={{ fontFamily:'var(--font-display)', fontSize:'2.5rem', color:teamColor, letterSpacing:'3px' }}>{profileName || teamName}</div>
            <div style={{ fontFamily:'var(--font-title)', color:'var(--green)', fontSize:'1.2rem', letterSpacing:'3px' }}>✅ PRÊT !</div>
            <div style={{ fontFamily:'var(--font-body)', color:'rgba(255,255,255,0.4)', fontSize:'0.9rem' }}>
              {gs?.screen === 'waiting' ? "En attente du lancement de l'intro..." : "En attente du démarrage du jeu..."}
            </div>
            <button onClick={() => setProfileSent(false)} style={{ fontFamily:'var(--font-title)', background:'transparent', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'8px', color:'rgba(255,255,255,0.4)', padding:'8px 20px', cursor:'pointer', fontSize:'0.9rem', marginTop:'8px' }}>
              ✏️ Modifier
            </button>
          </div>
        </div>
      );
    }

    // Setup form
    return (
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', gap:'0', padding:'0', position:'relative', overflowY:'auto' }}>
        <Snow count={10}/>
        <canvas ref={canvasRef} style={{ display:'none' }}/>
        <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:'420px', padding:'32px 20px 40px', display:'flex', flexDirection:'column', gap:'24px', alignItems:'center' }}>

          {/* Header */}
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'1.6rem', color:'var(--yellow)', letterSpacing:'3px' }}>CHALET QUIZ</div>
            <div style={{ fontFamily:'var(--font-title)', fontSize:'1rem', color:teamColor, marginTop:'4px' }}>
              {isTeam1?'🔴':'🔵'} Configuration de votre équipe
            </div>
          </div>

          {/* Photo */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
            {capturedPhoto
              ? <img src={capturedPhoto} alt="" style={{ width:'100px', height:'100px', borderRadius:'50%', objectFit:'cover', border:`4px solid ${teamColor}`, boxShadow:`0 0 20px ${teamColor}88` }}/>
              : <div style={{ width:'100px', height:'100px', borderRadius:'50%', background:`${teamColor}22`, border:`3px dashed ${teamColor}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem' }}>📷</div>
            }
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={openCamera} style={{ fontFamily:'var(--font-title)', padding:'8px 20px', background:`${teamColor}cc`, border:`2px solid ${teamColor}`, borderRadius:'8px', color:'white', cursor:'pointer', fontSize:'0.95rem' }}>
                {capturedPhoto ? '🔄 Reprendre' : '📷 Selfie'}
              </button>
              {capturedPhoto && (
                <button onClick={retakePhoto} style={{ fontFamily:'var(--font-title)', padding:'8px 16px', background:'transparent', border:'2px solid rgba(255,255,255,0.3)', borderRadius:'8px', color:'rgba(255,255,255,0.6)', cursor:'pointer', fontSize:'0.95rem' }}>
                  ✕ Supprimer
                </button>
              )}
            </div>
          </div>

          {/* Name */}
          <div style={{ width:'100%' }}>
            <div style={{ fontFamily:'var(--font-title)', color:'rgba(255,255,255,0.6)', fontSize:'0.9rem', marginBottom:'8px', letterSpacing:'2px' }}>NOM DE L'ÉQUIPE</div>
            <input
              type="text"
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              maxLength={24}
              placeholder={isTeam1 ? 'Équipe 1' : 'Équipe 2'}
              style={{ width:'100%', padding:'12px 16px', background:'rgba(255,255,255,0.08)', border:`2px solid ${teamColor}66`, borderRadius:'8px', color:'white', fontFamily:'var(--font-title)', fontSize:'1.1rem', outline:'none' }}
            />
          </div>

          {/* Color picker */}
          <div style={{ width:'100%' }}>
            <div style={{ fontFamily:'var(--font-title)', color:'rgba(255,255,255,0.6)', fontSize:'0.9rem', marginBottom:'10px', letterSpacing:'2px' }}>COULEUR DE L'ÉQUIPE</div>
            <div style={{ display:'flex', flexWrap:'nowrap', gap:'6px', justifyContent:'center' }}>
              {COLORS.map(c => {
                const otherTeam = team === 'team1' ? 'team2' : 'team1';
                const takenByOther = gs?.teamColors?.[otherTeam] === c;
                const selected = profileColor === c;
                return (
                  <button
                    key={c}
                    onClick={() => !takenByOther && setProfileColor(c)}
                    disabled={takenByOther}
                    title={takenByOther ? `Déjà prise par ${gs.teamNames?.[otherTeam]}` : ''}
                    style={{
                      width:'38px', height:'38px', borderRadius:'50%',
                      background: takenByOther ? `${c}44` : c,
                      border: selected ? '4px solid white' : takenByOther ? '3px solid rgba(255,255,255,0.1)' : '3px solid rgba(255,255,255,0.2)',
                      cursor: takenByOther ? 'not-allowed' : 'pointer',
                      boxShadow: selected ? `0 0 16px ${c}` : 'none',
                      transform: selected ? 'scale(1.15)' : 'scale(1)',
                      transition:'all 0.15s',
                      position:'relative',
                    }}
                  >
                    {takenByOther && (
                      <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>🔒</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop:'8px', fontSize:'0.78rem', color:'rgba(255,255,255,0.35)', fontFamily:'var(--font-body)', textAlign:'center' }}>
              🔒 = déjà prise par l'autre équipe
            </div>
          </div>

          {/* Confirm */}
          <button
            onClick={confirmProfile}
            disabled={uploading}
            style={{ width:'100%', padding:'16px', background: uploading ? 'rgba(0,200,83,0.3)' : 'rgba(0,200,83,0.9)', border:'2px solid var(--green)', borderRadius:'12px', color:'white', fontFamily:'var(--font-display)', fontSize:'1.5rem', letterSpacing:'3px', cursor: uploading ? 'default' : 'pointer', boxShadow:'0 0 20px rgba(0,200,83,0.4)', marginTop:'8px' }}
          >
            {uploading ? '⏳ ENVOI...' : '✅ CONFIRMER'}
          </button>
        </div>
      </div>
    );
  }

  // ── Main buzzer screen ────────────────────────────────────────────────────────

  const config = {
    idle: {
      bg: 'rgba(0,0,0,0.5)', border: 'rgba(255,255,255,0.2)',
      label: '⏸ EN ATTENTE', sublabel: "La manche n'a pas encore démarré",
      btnBg: 'rgba(255,255,255,0.1)', btnColor: 'rgba(255,255,255,0.3)',
      emoji: '⛷️',
    },
    waiting: {
      bg: `${teamColor}22`, border: teamColor,
      label: '🔔 PRÊT !', sublabel: 'Appuie dès que tu connais la réponse !',
      btnBg: `${teamColor}cc`, btnColor: 'white',
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
  const photo = gs?.teamPhotos?.[team];

  return (
    <div style={{
      minHeight: '100vh', display:'flex', flexDirection:'column',
      background: flash ? `${teamColor}44` : 'var(--sky)',
      transition:'background 0.2s ease',
      position:'relative', overflow:'hidden',
    }}>
      <Snow count={10}/>
      <div style={{ position:'relative', zIndex:1, flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-between', padding:'24px 20px' }}>

        {/* Header */}
        <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px' }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', color:'var(--yellow)', letterSpacing:'3px' }}>CHALET QUIZ</div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            {photo && <img src={photo} alt="" style={{ width:'36px', height:'36px', borderRadius:'50%', objectFit:'cover', border:`2px solid ${teamColor}` }}/>}
            <div style={{ fontFamily:'var(--font-title)', fontSize:'1rem', color:teamColor }}>
              {!photo && (isTeam1?'🔴':'🔵')} {teamName}
            </div>
          </div>
        </div>

        {/* Status */}
        <div style={{
          display:'flex', flexDirection:'column', alignItems:'center', gap:'8px',
          padding:'16px 24px',
          background: c.bg, border:`2px solid ${c.border}`,
          borderRadius:'12px', textAlign:'center',
          boxShadow: state==='waiting' ? `0 0 30px ${teamColor}66` : 'none',
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
            boxShadow: state==='waiting' ? `0 0 60px ${teamColor}88, inset 0 0 20px rgba(0,0,0,0.3)` : 'inset 0 0 20px rgba(0,0,0,0.3)',
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
          <div style={{ display:'flex', gap:'24px', fontFamily:'var(--font-title)', fontSize:'1rem', alignItems:'center' }}>
            <span style={{ color: gs.teamColors?.team1 || 'var(--red-bright)' }}>
              {gs.teamPhotos?.team1 ? <img src={gs.teamPhotos.team1} alt="" style={{ width:'20px', height:'20px', borderRadius:'50%', objectFit:'cover', verticalAlign:'middle', marginRight:'4px' }}/> : '🔴'}
              {gs.scores.team1}
            </span>
            <span style={{ color:'rgba(255,255,255,0.3)' }}>pts</span>
            <span style={{ color: gs.teamColors?.team2 || 'var(--blue-light)' }}>
              {gs.teamPhotos?.team2 ? <img src={gs.teamPhotos.team2} alt="" style={{ width:'20px', height:'20px', borderRadius:'50%', objectFit:'cover', verticalAlign:'middle', marginRight:'4px' }}/> : '🔵'}
              {gs.scores.team2}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
