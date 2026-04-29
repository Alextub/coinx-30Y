import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import Snow from '../components/Snow';
import StudioBackground from '../components/StudioBackground';

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

  const isChaletTheme = !gs || gs.themes?.find(t => t.id === gs.activeThemeId)?.backgroundStyle === 'chalet' || gs.activeThemeId === 'chalet';

  // ── Team selection screen (no team param) ─────────────────────────────────────

  if (!team) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'24px', padding:'20px', position:'relative' }}>
        {isChaletTheme ? <Snow count={15}/> : <StudioBackground/>}
        <div style={{ position:'relative', zIndex:1, textAlign:'center' }}>
          <h1 style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'3rem', color:'var(--yellow)', marginBottom:'24px', letterSpacing:'-0.01em', textShadow:'0 0 20px rgba(255,214,0,0.6)', textTransform:'uppercase' }}>{gs?.gameName || 'QUIZ'}</h1>
          <p style={{ fontFamily:'var(--font-ui)', fontWeight:500, color:'rgba(255,255,255,0.45)', marginBottom:'32px', fontSize:'0.9rem', letterSpacing:'0.2em', textTransform:'uppercase' }}>Choisissez votre équipe</p>
          <div style={{ display:'flex', gap:'16px', flexDirection:'column' }}>
            {gs?.teamNames && (
              <>
                <a href="#/buzzer?team=team1" style={{ textDecoration:'none' }}>
                  <div style={{ padding:'20px 40px', background:`${gs.teamColors?.team1 || '#FF1744'}15`, border:`2px solid ${gs.teamColors?.team1 || '#FF1744'}`, borderRadius:'4px', fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'1.8rem', letterSpacing:'0.03em', textTransform:'uppercase', color:'white', boxShadow:`0 0 24px ${gs.teamColors?.team1 || '#FF1744'}44`, display:'flex', alignItems:'center', gap:'16px', justifyContent:'center' }}>
                    {gs.teamPhotos?.team1
                      ? <img src={gs.teamPhotos.team1} alt="" style={{ width:'40px', height:'40px', borderRadius:'50%', objectFit:'cover', border:`2px solid ${gs.teamColors?.team1 || '#FF1744'}` }}/>
                      : <span style={{ width:'12px', height:'12px', borderRadius:'50%', background: gs.teamColors?.team1 || '#FF1744', display:'inline-block', boxShadow:`0 0 8px ${gs.teamColors?.team1 || '#FF1744'}` }}/>}
                    {gs.teamNames.team1}
                  </div>
                </a>
                <a href="#/buzzer?team=team2" style={{ textDecoration:'none' }}>
                  <div style={{ padding:'20px 40px', background:`${gs.teamColors?.team2 || '#42A5F5'}15`, border:`2px solid ${gs.teamColors?.team2 || '#42A5F5'}`, borderRadius:'4px', fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'1.8rem', letterSpacing:'0.03em', textTransform:'uppercase', color:'white', boxShadow:`0 0 24px ${gs.teamColors?.team2 || '#42A5F5'}44`, display:'flex', alignItems:'center', gap:'16px', justifyContent:'center' }}>
                    {gs.teamPhotos?.team2
                      ? <img src={gs.teamPhotos.team2} alt="" style={{ width:'40px', height:'40px', borderRadius:'50%', objectFit:'cover', border:`2px solid ${gs.teamColors?.team2 || '#42A5F5'}` }}/>
                      : <span style={{ width:'12px', height:'12px', borderRadius:'50%', background: gs.teamColors?.team2 || '#42A5F5', display:'inline-block', boxShadow:`0 0 8px ${gs.teamColors?.team2 || '#42A5F5'}` }}/>}
                    {gs.teamNames.team2}
                  </div>
                </a>
              </>
            )}
            {!gs?.teamNames && <div style={{ color:'rgba(255,255,255,0.4)', fontFamily:'var(--font-ui)', letterSpacing:'0.15em' }}>Connexion...</div>}
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
          <div style={{ fontFamily:'var(--font-ui)', fontWeight:600, color:teamColor, fontSize:'1rem', letterSpacing:'0.2em', textTransform:'uppercase' }}>SELFIE D'EQUIPE</div>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width:'min(340px,85vw)', height:'min(340px,85vw)', objectFit:'cover', borderRadius:'50%', border:`4px solid ${teamColor}`, boxShadow:`0 0 30px ${teamColor}88` }}
          />
          <button
            onClick={capturePhoto}
            style={{ width:'72px', height:'72px', borderRadius:'50%', background:teamColor, border:`3px solid white`, cursor:'pointer', boxShadow:`0 0 20px ${teamColor}`, display:'flex', alignItems:'center', justifyContent:'center' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
          <button onClick={() => { stream?.getTracks().forEach(t => t.stop()); setStream(null); setCameraOpen(false); }}
            style={{ fontFamily:'var(--font-ui)', fontWeight:500, background:'transparent', border:'none', color:'rgba(255,255,255,0.35)', fontSize:'0.9rem', cursor:'pointer', letterSpacing:'0.1em', textTransform:'uppercase' }}>
            Annuler
          </button>
        </div>
      );
    }

    // Profile sent: waiting screen
    if (profileSent) {
      return (
        <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'24px', padding:'20px', position:'relative' }}>
          {isChaletTheme ? <Snow count={10}/> : <StudioBackground/>}
          <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'20px', textAlign:'center' }}>
            {capturedPhoto
              ? <img src={capturedPhoto} alt="" style={{ width:'100px', height:'100px', borderRadius:'50%', objectFit:'cover', border:`4px solid ${teamColor}`, boxShadow:`0 0 30px ${teamColor}88` }}/>
              : <div style={{ width:'100px', height:'100px', borderRadius:'50%', background:`${teamColor}18`, border:`3px solid ${teamColor}55`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:'44px', height:'44px', borderRadius:'50%', background: teamColor, opacity:0.8 }}/>
                </div>
            }
            <div style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'2.5rem', color:teamColor, letterSpacing:'-0.01em', textShadow:`0 0 20px ${teamColor}66`, textTransform:'uppercase' }}>{profileName || teamName}</div>
            <div style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, color:'var(--green)', fontSize:'1.4rem', letterSpacing:'0.1em', textTransform:'uppercase', textShadow:'0 0 12px rgba(0,200,83,0.6)' }}>PRET</div>
            <div style={{ fontFamily:'var(--font-ui)', color:'rgba(255,255,255,0.35)', fontSize:'0.85rem', letterSpacing:'0.1em' }}>
              {gs?.screen === 'waiting' ? "En attente du lancement..." : "En attente du démarrage du jeu..."}
            </div>
            <button onClick={() => setProfileSent(false)} style={{ fontFamily:'var(--font-ui)', fontWeight:500, background:'transparent', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'4px', color:'rgba(255,255,255,0.35)', padding:'8px 20px', cursor:'pointer', fontSize:'0.85rem', marginTop:'8px', letterSpacing:'0.1em', textTransform:'uppercase' }}>
              Modifier
            </button>
          </div>
        </div>
      );
    }

    // Setup form
    return (
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', gap:'0', padding:'0', position:'relative', overflowY:'auto' }}>
        {isChaletTheme ? <Snow count={10}/> : <StudioBackground/>}
        <canvas ref={canvasRef} style={{ display:'none' }}/>
        <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:'420px', padding:'32px 20px 40px', display:'flex', flexDirection:'column', gap:'24px', alignItems:'center' }}>

          {/* Header */}
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'1.6rem', color:'var(--yellow)', letterSpacing:'-0.01em', textShadow:'0 0 14px rgba(255,214,0,0.5)', textTransform:'uppercase' }}>{gs?.gameName || 'QUIZ'}</div>
            <div style={{ fontFamily:'var(--font-ui)', fontWeight:500, fontSize:'0.9rem', color:teamColor, marginTop:'6px', letterSpacing:'0.15em', textTransform:'uppercase' }}>
              Configuration de votre équipe
            </div>
          </div>

          {/* Photo */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
            {capturedPhoto
              ? <img src={capturedPhoto} alt="" style={{ width:'100px', height:'100px', borderRadius:'50%', objectFit:'cover', border:`4px solid ${teamColor}`, boxShadow:`0 0 20px ${teamColor}88` }}/>
              : <div style={{ width:'100px', height:'100px', borderRadius:'50%', background:`${teamColor}18`, border:`2px dashed ${teamColor}88`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={teamColor} strokeWidth="1.5" opacity="0.7">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
            }
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={openCamera} style={{ fontFamily:'var(--font-ui)', fontWeight:600, padding:'8px 20px', background:`${teamColor}cc`, border:`2px solid ${teamColor}`, borderRadius:'4px', color:'white', cursor:'pointer', fontSize:'0.9rem', letterSpacing:'0.1em', textTransform:'uppercase' }}>
                {capturedPhoto ? 'Reprendre' : 'Selfie'}
              </button>
              {capturedPhoto && (
                <button onClick={retakePhoto} style={{ fontFamily:'var(--font-ui)', fontWeight:500, padding:'8px 16px', background:'transparent', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'4px', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:'0.9rem' }}>
                  Supprimer
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
                      <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" opacity="0.7"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/></svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop:'8px', fontSize:'0.75rem', color:'rgba(255,255,255,0.25)', fontFamily:'var(--font-ui)', textAlign:'center', letterSpacing:'0.05em' }}>
              Cadenas = déjà prise par l'autre équipe
            </div>
          </div>

          {/* Confirm */}
          <button
            onClick={confirmProfile}
            disabled={uploading}
            style={{ width:'100%', padding:'16px', background: uploading ? 'rgba(0,200,83,0.25)' : 'rgba(0,200,83,0.85)', border:'2px solid var(--green)', borderRadius:'4px', color:'white', fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'1.5rem', letterSpacing:'0.08em', textTransform:'uppercase', cursor: uploading ? 'default' : 'pointer', boxShadow:'0 0 20px rgba(0,200,83,0.4)', marginTop:'8px' }}
          >
            {uploading ? 'ENVOI...' : 'CONFIRMER'}
          </button>
        </div>
      </div>
    );
  }

  // ── Main buzzer screen ────────────────────────────────────────────────────────

  const config = {
    idle: {
      bg: 'rgba(0,0,0,0.5)', border: 'rgba(255,255,255,0.15)',
      label: 'EN ATTENTE', sublabel: "La manche n'a pas encore démarré",
      btnBg: 'rgba(255,255,255,0.06)', btnColor: 'rgba(255,255,255,0.2)',
      statusColor: 'rgba(255,255,255,0.3)',
    },
    waiting: {
      bg: `${teamColor}1A`, border: teamColor,
      label: 'PRET', sublabel: 'Appuie dès que tu connais la réponse !',
      btnBg: `${teamColor}cc`, btnColor: 'white',
      statusColor: teamColor,
    },
    buzzed: {
      bg: 'rgba(0,200,83,0.15)', border: 'var(--green)',
      label: 'BUZZE !', sublabel: 'Tu as la parole !',
      btnBg: 'rgba(0,200,83,0.25)', btnColor: 'var(--green)',
      statusColor: 'var(--green)',
    },
    locked: {
      bg: 'rgba(0,0,0,0.5)', border: 'rgba(255,255,255,0.1)',
      label: 'BLOQUE', sublabel: "Une autre équipe a buzzé en premier",
      btnBg: 'rgba(255,255,255,0.03)', btnColor: 'rgba(255,255,255,0.15)',
      statusColor: 'rgba(255,255,255,0.2)',
    },
  };

  const c = config[state];
  const photo = gs?.teamPhotos?.[team];

  const isBuzzed = state === 'buzzed';

  return (
    <div style={{
      minHeight: '100vh', display:'flex', flexDirection:'column',
      background: isBuzzed ? `${teamColor}22` : flash ? `${teamColor}33` : 'var(--sky)',
      transition:'background 0.25s ease',
      position:'relative', overflow:'hidden',
    }}>
      {isChaletTheme ? <Snow count={10}/> : <StudioBackground/>}

      {/* Plein écran buzze */}
      {isBuzzed && (
        <div style={{
          position:'fixed', inset:0, zIndex:10,
          background: `${teamColor}E0`,
          display:'flex', alignItems:'center', justifyContent:'center',
          flexDirection:'column', gap:'20px',
        }}>
          <div className="anim-slam-in" style={{
            fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900,
            fontSize:'clamp(4rem,18vw,8rem)',
            color:'white',
            textShadow:`0 0 40px rgba(255,255,255,0.9), 6px 6px 0 rgba(0,0,0,0.4)`,
            letterSpacing:'0.05em', textTransform:'uppercase',
            textAlign:'center', lineHeight:1,
          }}>BUZZ !</div>
          {photo && <img src={photo} alt="" style={{ width:'80px', height:'80px', borderRadius:'50%', objectFit:'cover', border:'4px solid white', boxShadow:'0 0 30px rgba(255,255,255,0.6)', animation:'tv-impact 0.5s ease both' }}/>}
          <div style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'clamp(1.5rem,6vw,2.5rem)', color:'white', letterSpacing:'0.15em', textTransform:'uppercase', textShadow:'0 0 20px rgba(255,255,255,0.7)' }}>{teamName}</div>
        </div>
      )}

      <div style={{ position:'relative', zIndex:1, flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-between', padding:'24px 20px' }}>

        {/* Header */}
        <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px' }}>
          <div style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'clamp(1.4rem,5vw,2rem)', color:'var(--gold, #FFB800)', letterSpacing:'-0.01em', textShadow:'0 0 18px rgba(255,184,0,0.6)', textTransform:'uppercase' }}>{gs?.gameName || 'QUIZ'}</div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            {photo
              ? <img src={photo} alt="" style={{ width:'38px', height:'38px', borderRadius:'50%', objectFit:'cover', border:`3px solid ${teamColor}`, boxShadow:`0 0 10px ${teamColor}88` }}/>
              : <span style={{ width:'12px', height:'12px', borderRadius:'50%', background:teamColor, display:'inline-block', boxShadow:`0 0 8px ${teamColor}` }}/>
            }
            <div style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'clamp(1rem,4vw,1.4rem)', color:teamColor, letterSpacing:'0.05em', textTransform:'uppercase', textShadow:`0 0 12px ${teamColor}88` }}>
              {teamName}
            </div>
          </div>
        </div>

        {/* Status badge */}
        <div style={{
          display:'flex', flexDirection:'column', alignItems:'center', gap:'6px',
          padding:'14px 28px',
          background: c.bg,
          border:`2px solid ${c.border}`,
          borderRadius:'4px', textAlign:'center',
          boxShadow: state==='waiting' ? `0 0 32px ${teamColor}55, inset 0 0 16px ${teamColor}11` : 'none',
          transition:'all 0.3s ease',
          minWidth:'220px',
        }}>
          <div style={{
            fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900,
            fontSize:'clamp(1.4rem,5vw,2rem)',
            letterSpacing:'0.05em', textTransform:'uppercase',
            color: c.statusColor,
            textShadow: state==='waiting' ? `0 0 20px ${teamColor}88` : 'none',
          }}>{c.label}</div>
          <div style={{ fontFamily:'var(--font-ui)', fontSize:'0.8rem', color:'rgba(255,255,255,0.38)', letterSpacing:'0.05em' }}>{c.sublabel}</div>
        </div>

        {/* GRAND BOUTON BUZZER */}
        <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {/* Ring externe pulsant */}
          {state === 'waiting' && (
            <div style={{
              position:'absolute',
              width:'min(320px,80vw)', height:'min(320px,80vw)',
              borderRadius:'50%',
              border:`3px solid ${teamColor}`,
              opacity:0.3,
              animation:'pulse-glow 1.5s ease-in-out infinite',
              pointerEvents:'none',
            }}/>
          )}
          <button
            onPointerDown={handleBuzz}
            disabled={state !== 'waiting'}
            style={{
              width:'min(260px,66vw)', height:'min(260px,66vw)',
              borderRadius:'50%',
              background: c.btnBg,
              border:`5px solid ${c.border}`,
              color: c.btnColor,
              fontFamily:'var(--font-display)',
              fontStyle:'italic',
              fontWeight:900,
              fontSize:'clamp(2.5rem,10vw,4.5rem)',
              letterSpacing:'0.06em',
              textTransform:'uppercase',
              cursor: state==='waiting' ? 'pointer' : 'default',
              boxShadow: state==='waiting'
                ? `0 0 70px ${teamColor}99, 0 0 140px ${teamColor}44, inset 0 0 30px rgba(0,0,0,0.25)`
                : 'inset 0 0 20px rgba(0,0,0,0.5)',
              animation: state==='locked' ? 'tv-shake 0.45s ease' : 'none',
              filter: state==='locked' ? 'grayscale(70%)' : state==='idle' ? 'brightness(0.45)' : 'none',
              transition:'filter 0.2s ease, box-shadow 0.2s ease',
              touchAction:'none',
              WebkitTapHighlightColor:'transparent',
              userSelect:'none',
            }}
          >
            {state === 'locked' ? 'BLOQUE' : 'BUZZ'}
          </button>
        </div>

        {/* Score display */}
        {gs?.scores && (
          <div style={{ display:'flex', gap:'20px', alignItems:'center' }}>
            {['team1','team2'].map((t, i) => {
              const tc = gs.teamColors?.[t] || (i===0?'var(--red-bright)':'var(--blue-light)');
              const tp = gs.teamPhotos?.[t];
              const isMe = t === team;
              return (
                <div key={t} style={{ display:'flex', alignItems:'center', gap:'7px', opacity: isMe?1:0.6 }}>
                  {tp
                    ? <img src={tp} alt="" style={{ width:'22px', height:'22px', borderRadius:'50%', objectFit:'cover', border:`2px solid ${tc}` }}/>
                    : <span style={{ width:'10px', height:'10px', borderRadius:'50%', background:tc, display:'inline-block', boxShadow:`0 0 5px ${tc}` }}/>}
                  <span style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, color: isMe?tc:'rgba(240,244,255,0.5)', fontSize:'clamp(1.1rem,4vw,1.6rem)', fontVariantNumeric:'tabular-nums', textShadow: isMe?`0 0 10px ${tc}77`:'none' }}>{gs.scores[t]}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
