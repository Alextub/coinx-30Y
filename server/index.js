const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// ── FILE UPLOADS ───────────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

app.use('/uploads', express.static(uploadsDir));
app.post('/upload', upload.single('image'), (_, res) => {
  res.json({ url: `/uploads/${res.req.file.filename}` });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ── GAME STATE ────────────────────────────────────────────────────────────────
let gameState = {
  screen: 'lobby',      // lobby | question | scores | timer_round | blind_test | face_puzzle | wager | mime | creative | end
  round: null,          // current round config
  rounds: [],           // all rounds configured by admin
  currentRoundIndex: -1,
  currentQuestionIndex: -1,
  scores: { team1: 0, team2: 0 },
  roundScores: { team1: 0, team2: 0 },
  prevScores: { team1: 0, team2: 0 },
  teamNames: { team1: 'Équipe 1', team2: 'Équipe 2' },
  buzzer: {
    active: false,
    winner: null,       // 'team1' | 'team2' | null
    locked: [],         // teams locked out
  },
  timer: {
    team1: 60,          // seconds remaining
    team2: 60,
    active: null,       // 'team1' | 'team2' | null
    running: false,
  },
  blindTest: {
    playing: false,
    revealed: false,
  },
  facePuzzle: {
    found: [false, false, false, false],
  },
  wager: {
    bet: 0,
    phase: 'betting',   // 'betting' | 'question' | 'steal'
    theme: '',
    assignedTeam: 'team1',
  },
  mime: {
    team: null,         // 'team1' | 'team2' | null
    running: false,
    remaining: 0,
  },
  creative: {
    running: false,
    remaining: 0,
  },
  question: null,
  answer: null,
  answerVisible: false,
};

let timerInterval = null;
let mimeInterval = null;
let creativeInterval = null;

// ── TIMER LOGIC ───────────────────────────────────────────────────────────────
function startTimer(team) {
  if (timerInterval) clearInterval(timerInterval);
  gameState.timer.active = team;
  gameState.timer.running = true;
  timerInterval = setInterval(() => {
    if (gameState.timer[team] <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      gameState.timer.running = false;
      gameState.timer.active = null;
      io.emit('game_state', gameState);
      io.emit('timer_expired', { team });
      return;
    }
    gameState.timer[team] -= 1;
    io.emit('timer_tick', { team, value: gameState.timer[team] });
  }, 1000);
}

function pauseTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  gameState.timer.running = false;
  io.emit('game_state', gameState);
}

function startMime() {
  if (mimeInterval) clearInterval(mimeInterval);
  gameState.mime.running = true;
  mimeInterval = setInterval(() => {
    if (gameState.mime.remaining <= 0) {
      clearInterval(mimeInterval); mimeInterval = null;
      gameState.mime.running = false;
      io.emit('game_state', gameState);
      io.emit('mime_expired');
      return;
    }
    gameState.mime.remaining -= 1;
    io.emit('mime_tick', { value: gameState.mime.remaining });
  }, 1000);
}

function pauseMime() {
  if (mimeInterval) clearInterval(mimeInterval);
  mimeInterval = null;
  gameState.mime.running = false;
  io.emit('game_state', gameState);
}

function startCreative() {
  if (creativeInterval) clearInterval(creativeInterval);
  gameState.creative.running = true;
  creativeInterval = setInterval(() => {
    if (gameState.creative.remaining <= 0) {
      clearInterval(creativeInterval); creativeInterval = null;
      gameState.creative.running = false;
      io.emit('game_state', gameState);
      io.emit('creative_expired');
      return;
    }
    gameState.creative.remaining -= 1;
    io.emit('creative_tick', { value: gameState.creative.remaining });
  }, 1000);
}

function pauseCreative() {
  if (creativeInterval) clearInterval(creativeInterval);
  creativeInterval = null;
  gameState.creative.running = false;
  io.emit('game_state', gameState);
}

function switchTimer() {
  const current = gameState.timer.active;
  const next = current === 'team1' ? 'team2' : 'team1';
  startTimer(next);
  io.emit('game_state', gameState);
}

// ── SOCKET EVENTS ─────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  // Send current state on connect
  socket.emit('game_state', gameState);

  // ── ADMIN ACTIONS ──────────────────────────────────────────────────────────

  socket.on('admin_set_rounds', (rounds) => {
    gameState.rounds = rounds;
    io.emit('game_state', gameState);
  });

  socket.on('admin_set_team_names', ({ team1, team2 }) => {
    gameState.teamNames = { team1, team2 };
    io.emit('game_state', gameState);
  });

  socket.on('admin_start_game', () => {
    gameState.screen = 'lobby';
    gameState.scores = { team1: 0, team2: 0 };
    gameState.currentRoundIndex = -1;
    io.emit('game_state', gameState);
  });

  socket.on('admin_next_round', () => {
    const nextIdx = gameState.currentRoundIndex + 1;
    if (nextIdx >= gameState.rounds.length) {
      gameState.screen = 'end';
      io.emit('game_state', gameState);
      return;
    }
    gameState.currentRoundIndex = nextIdx;
    gameState.currentQuestionIndex = -1;
    gameState.round = gameState.rounds[nextIdx];
    gameState.answerVisible = false;
    gameState.buzzer = { active: false, winner: null, locked: [] };
    gameState.roundScores = { team1: 0, team2: 0 };

    if (gameState.round.type === 'timer') {
      gameState.screen = 'timer_round';
      const duration = gameState.round.timerDuration || 60;
      gameState.timer = { team1: duration, team2: duration, active: null, running: false };
      pauseTimer();
    } else if (gameState.round.type === 'blind_test') {
      gameState.screen = 'blind_test';
      gameState.currentQuestionIndex = 0;
      gameState.blindTest = { playing: false, revealed: false };
      gameState.question = gameState.round.questions[0]?.question || '';
      gameState.answer = gameState.round.questions[0]?.answer || '';
    } else if (gameState.round.type === 'face_puzzle') {
      gameState.screen = 'face_puzzle';
      gameState.facePuzzle = { found: [false, false, false, false] };
      gameState.currentQuestionIndex = 0;
      gameState.question = gameState.round.questions[0]?.question || '';
      gameState.buzzer = { active: true, winner: null, locked: [] };
    } else if (gameState.round.type === 'mime') {
      gameState.screen = 'mime';
      pauseMime();
      const firstSub = gameState.round.subRounds?.[0];
      gameState.mime = { team: null, running: false, remaining: firstSub?.timerDuration || 60, subRoundIndex: -1 };
    } else if (gameState.round.type === 'creative') {
      gameState.screen = 'creative';
      pauseCreative();
      gameState.creative = { running: false, remaining: gameState.round.timerDuration || 300 };
    } else if (gameState.round.type === 'wager') {
      const q = gameState.round.questions[0];
      gameState.screen = 'wager';
      gameState.currentQuestionIndex = 0;
      gameState.question = q?.question || '';
      gameState.answer = q?.answer || '';
      gameState.answerVisible = false;
      gameState.wager = { bet: 0, phase: 'betting', theme: q?.theme || '', assignedTeam: q?.team || 'team1' };
    } else {
      gameState.screen = 'round_intro';
    }
    io.emit('game_state', gameState);
  });

  socket.on('admin_next_question', () => {
    const round = gameState.round;
    if (!round) return;
    const nextIdx = gameState.currentQuestionIndex + 1;
    if (nextIdx >= round.questions.length) {
      io.emit('game_state', gameState);
      return;
    }
    gameState.currentQuestionIndex = nextIdx;
    const q = round.questions[nextIdx];
    gameState.question = q.question;
    gameState.answer = q.answer;
    gameState.answerVisible = false;
    gameState.buzzer = { active: false, winner: null, locked: [] };

    if (round.type === 'buzzer') {
      gameState.screen = 'question';
      gameState.buzzer.active = true;
    } else if (round.type === 'timer') {
      // question already shown in timer UI
    } else if (round.type === 'blind_test') {
      gameState.blindTest = { playing: false, revealed: false };
    } else if (round.type === 'face_puzzle') {
      gameState.facePuzzle = { found: [false, false, false, false] };
      gameState.buzzer = { active: true, winner: null, locked: [] };
    } else if (round.type === 'wager') {
      gameState.wager = { bet: 0, phase: 'betting', theme: q.theme || '', assignedTeam: q.team || 'team1' };
    }
    io.emit('game_state', gameState);
  });

  socket.on('admin_reveal_answer', () => {
    gameState.answerVisible = true;
    gameState.buzzer.active = false;
    io.emit('game_state', gameState);
  });

  socket.on('admin_add_score', ({ team, points }) => {
    gameState.roundScores[team] = (gameState.roundScores[team] || 0) + points;
    io.emit('game_state', gameState);
  });

  socket.on('admin_show_round_recap', () => {
    gameState.prevScores = { ...gameState.scores };
    gameState.scores.team1 = (gameState.scores.team1 || 0) + (gameState.roundScores.team1 || 0);
    gameState.scores.team2 = (gameState.scores.team2 || 0) + (gameState.roundScores.team2 || 0);
    gameState.screen = 'round_recap';
    io.emit('game_state', gameState);
  });

  socket.on('admin_reset_buzzer', () => {
    gameState.buzzer = { active: true, winner: null, locked: [] };
    io.emit('game_state', gameState);
  });

  socket.on('admin_show_scores', () => {
    gameState.screen = 'scores';
    io.emit('game_state', gameState);
  });

  socket.on('admin_show_lobby', () => {
    gameState.screen = 'lobby';
    io.emit('game_state', gameState);
  });

  // Face puzzle
  socket.on('admin_face_validate', ({ pieceIndex }) => {
    gameState.facePuzzle.found[pieceIndex] = true;
    io.emit('game_state', gameState);
  });

  socket.on('admin_face_reset_piece', ({ pieceIndex }) => {
    gameState.facePuzzle.found[pieceIndex] = false;
    io.emit('game_state', gameState);
  });

  // Wager
  socket.on('admin_wager_start_question', ({ bet }) => {
    gameState.wager.bet = bet;
    gameState.wager.phase = 'question';
    const other = gameState.wager.assignedTeam === 'team1' ? 'team2' : 'team1';
    gameState.buzzer = { active: true, winner: null, locked: [other] };
    io.emit('game_state', gameState);
  });

  socket.on('admin_wager_open_steal', () => {
    gameState.wager.phase = 'steal';
    const assigned = gameState.wager.assignedTeam;
    gameState.buzzer = { active: true, winner: null, locked: [assigned] };
    gameState.answerVisible = false;
    io.emit('game_state', gameState);
  });

  socket.on('admin_wager_award', ({ team }) => {
    const pts = gameState.wager?.bet || 0;
    gameState.roundScores[team] = (gameState.roundScores[team] || 0) + pts;
    io.emit('game_state', gameState);
  });

  // Blind test
  socket.on('admin_blind_test_play', () => {
    gameState.blindTest.playing = true;
    gameState.buzzer = { active: true, winner: null, locked: [] };
    io.emit('game_state', gameState);
  });

  socket.on('admin_blind_test_pause', () => {
    gameState.blindTest.playing = false;
    io.emit('game_state', gameState);
  });

  socket.on('admin_blind_test_reveal', () => {
    gameState.blindTest.playing = false;
    gameState.blindTest.revealed = true;
    io.emit('game_state', gameState);
  });

  // Timer round
  socket.on('admin_timer_start', ({ team }) => {
    startTimer(team);
    io.emit('game_state', gameState);
  });

  socket.on('admin_timer_pause', () => {
    pauseTimer();
  });

  socket.on('admin_timer_switch', () => {
    switchTimer();
  });

  socket.on('admin_timer_next_question', () => {
    const round = gameState.round;
    if (!round) return;
    const nextIdx = gameState.currentQuestionIndex + 1;
    if (nextIdx >= (round.questions || []).length) {
      pauseTimer();
      io.emit('game_state', gameState);
      return;
    }
    gameState.currentQuestionIndex = nextIdx;
    const q = round.questions[nextIdx];
    gameState.question = q.question;
    gameState.answer = q.answer;
    gameState.answerVisible = false;
    io.emit('game_state', gameState);
  });

  socket.on('admin_timer_set', ({ team, value }) => {
    gameState.timer[team] = value;
    io.emit('game_state', gameState);
  });

  // Mime
  socket.on('admin_mime_next_subround', () => {
    pauseMime();
    const subRounds = gameState.round.subRounds || [];
    const nextIdx = gameState.mime.subRoundIndex + 1;
    if (nextIdx >= subRounds.length) return;
    gameState.mime.subRoundIndex = nextIdx;
    gameState.mime.team = null;
    gameState.mime.running = false;
    gameState.mime.remaining = subRounds[nextIdx].timerDuration || 60;
    io.emit('game_state', gameState);
  });

  socket.on('admin_mime_start', ({ team }) => {
    const sub = gameState.round.subRounds?.[gameState.mime.subRoundIndex];
    gameState.mime.team = team;
    gameState.mime.remaining = sub?.timerDuration || 60;
    startMime();
    io.emit('game_state', gameState);
  });

  socket.on('admin_mime_pause', () => { pauseMime(); });

  socket.on('admin_mime_resume', () => {
    startMime();
    io.emit('game_state', gameState);
  });

  // Creative
  socket.on('admin_creative_start', () => {
    gameState.creative.remaining = gameState.round.timerDuration || 300;
    startCreative();
    io.emit('game_state', gameState);
  });

  socket.on('admin_creative_pause', () => { pauseCreative(); });

  socket.on('admin_creative_resume', () => {
    startCreative();
    io.emit('game_state', gameState);
  });

  // ── BUZZER ACTIONS ─────────────────────────────────────────────────────────
  socket.on('buzzer_press', ({ team }) => {
    if (!gameState.buzzer.active) return;
    if (gameState.buzzer.locked.includes(team)) return;
    if (gameState.buzzer.winner) return;
    gameState.buzzer.winner = team;
    gameState.buzzer.active = false;
    // Auto-pause blind test when a team buzzes
    if (gameState.round?.type === 'blind_test') {
      gameState.blindTest.playing = false;
    }
    io.emit('game_state', gameState);
    io.emit('buzzer_hit', { team });
  });

  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
  });
});

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', game: gameState.screen }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🎿 Chalet Quiz server running on port ${PORT}`));
