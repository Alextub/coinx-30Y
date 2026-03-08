# Chalet Quiz — CLAUDE.md

Guide de contexte pour Claude Code. Lis ce fichier en entier avant toute modification.

---

## Architecture

Monorepo en deux parties totalement séparées :

```
chalet-quiz/
├── server/          ← Node.js + Express + Socket.io  (port 3001)
│   └── index.js     ← TOUT le backend est dans ce seul fichier
└── client/          ← React + Vite                   (port 5173)
    └── src/
        ├── main.jsx              ← Router (3 routes)
        ├── index.css             ← Variables CSS globales + animations
        ├── hooks/useSocket.js    ← Singleton Socket.io client
        ├── components/
        │   ├── Snow.jsx          ← Flocons + silhouette montagnes SVG
        │   └── ScoreBar.jsx      ← Barre scores en haut des écrans jeu
        └── pages/
            ├── Display.jsx       ← Écran principal (projeté)
            ├── Buzzer.jsx        ← Page mobile buzzer des équipes
            └── Admin.jsx         ← Panneau de contrôle animateur
```

---

## Stack technique

| Composant | Techno | Notes |
|-----------|--------|-------|
| Backend | Node.js + Socket.io 4 + Express | Tout l'état du jeu vit dans `gameState` en mémoire |
| Frontend | React 18 + Vite 4 | Pas de state manager, juste useState + useSocket |
| Routing | react-router-dom v6 | 3 routes : `/`, `/buzzer`, `/admin` |
| Styles | CSS vanilla + variables | Pas de Tailwind, pas de CSS modules |
| Fonts | Google Fonts : Bangers, Fredoka One, Nunito | Chargées dans index.html |
| Déploiement serveur | Railway | `server/railway.toml` |
| Déploiement client | GitHub Pages | `.github/workflows/deploy.yml` |

---

## gameState — structure complète

```js
{
  screen: 'lobby',          // lobby | round_intro | question | reveal | scores |
                            // buzzer_active | timer_round | image_reveal | blind_test | end
  round: { ... },           // manche en cours (objet complet, voir ci-dessous)
  rounds: [ ... ],          // toutes les manches configurées par l'admin
  currentRoundIndex: -1,
  currentQuestionIndex: -1,
  scores: { team1: 0, team2: 0 },
  teamNames: { team1: 'Équipe 1', team2: 'Équipe 2' },

  buzzer: {
    active: false,          // true = on accepte les appuis
    winner: null,           // 'team1' | 'team2' | null
    locked: [],             // équipes bloquées (mauvaise réponse)
  },

  timer: {
    team1: 60,              // secondes restantes
    team2: 60,
    active: null,           // 'team1' | 'team2' | null — qui décompte
    running: false,
  },

  imageReveal: {
    totalPieces: 9,
    revealed: [],           // indices (0-8) des cases révélées
  },

  blindTest: {
    playing: false,
    revealed: false,        // true = titre affiché
  },

  question: null,           // string — question en cours
  answer: null,             // string — réponse en cours
  answerVisible: false,
}
```

### Structure d'une manche (round)

```js
{
  name: 'Nom affiché',
  type: 'buzzer',           // buzzer | timer | image_reveal | blind_test
  description: '',          // texte affiché sur l'écran round_intro
  questions: [
    {
      question: '...',
      answer: '...',
      imageUrl: '...',       // seulement pour image_reveal
    }
  ],
  timerDuration: 60,        // seulement pour timer (en secondes)
  points: 1,                // points attribués par bonne réponse
}
```

---

## Flux Socket.io

### Événements admin → serveur (emit depuis Admin.jsx)

| Événement | Payload | Effet |
|-----------|---------|-------|
| `admin_set_rounds` | `rounds[]` | Remplace toutes les manches |
| `admin_set_team_names` | `{team1, team2}` | Renomme les équipes |
| `admin_next_round` | — | Passe à la manche suivante |
| `admin_next_question` | — | Affiche la question suivante |
| `admin_reveal_answer` | — | Rend `answerVisible = true` |
| `admin_add_score` | `{team, points}` | Ajoute/retire des points |
| `admin_reset_buzzer` | — | Réinitialise le buzzer |
| `admin_show_scores` | — | Passe l'écran sur `scores` |
| `admin_show_lobby` | — | Passe l'écran sur `lobby` |
| `admin_reveal_piece` | `index` | Révèle une case image |
| `admin_reveal_all_pieces` | — | Révèle tout |
| `admin_blind_test_reveal` | — | Révèle le titre blind test |
| `admin_timer_start` | `{team}` | Démarre le timer d'une équipe |
| `admin_timer_pause` | — | Met en pause |
| `admin_timer_switch` | — | Bascule sur l'autre équipe |
| `admin_timer_set` | `{team, value}` | Ajuste manuellement un timer |

### Événements serveur → clients (broadcast)

| Événement | Payload | Quand |
|-----------|---------|-------|
| `game_state` | `gameState` | À chaque changement d'état |
| `buzzer_hit` | `{team}` | Quand une équipe buzze |
| `timer_tick` | `{team, value}` | Chaque seconde pendant le décompte |
| `timer_expired` | `{team}` | Quand un timer atteint 0 |
| `score_update` | `{team, score}` | Après chaque modification de score |

### Événements buzzer → serveur (depuis Buzzer.jsx)

| Événement | Payload |
|-----------|---------|
| `buzzer_press` | `{team}` |

---

## Conventions de code

- **Pas de fichiers CSS séparés** — tout le style est inline (objets JS) sauf les classes globales dans `index.css`
- **Variables CSS** — utilise `var(--nom)` pour toutes les couleurs (définies dans `:root` de `index.css`)
- **Fonts** — `var(--font-display)` (Bangers) pour les gros titres, `var(--font-title)` (Fredoka One) pour les labels, `var(--font-body)` (Nunito) pour le texte
- **Animations** — les keyframes sont dans `index.css`, on les applique via `animation:` inline ou les classes `.anim-*`
- **Socket** — toujours passer par le hook `useSocket()`, ne jamais importer `socket.io-client` directement dans les pages
- **Pas de TypeScript** — le projet est en JS vanilla, ne pas migrer

---

## Pour ajouter un nouveau type de manche

1. **`server/index.js`** — dans `admin_next_round`, ajouter un `else if (round.type === 'mon_type')` pour initialiser l'état spécifique
2. **`server/index.js`** — ajouter les événements socket nécessaires au contrôle
3. **`client/src/pages/Display.jsx`** — ajouter un composant `MonTypeScreen` et le cas dans `renderScreen()`
4. **`client/src/pages/Admin.jsx`** — dans `ROUND_TYPES`, ajouter l'entrée ; dans `ControlPanel`, ajouter une `<Section>` dédiée
5. **`client/src/pages/Admin.jsx`** — dans `QuestionEditor`, gérer les champs spécifiques si nécessaire

---

## Pour ajouter un son/jingle

Les sons sont générés via Web Audio API (voir `Buzzer.jsx`, fonction `playBuzz`). Pour des sons plus riches, utiliser des fichiers audio :

```js
// Dans public/ → ajouter mon-son.mp3
// Dans le composant :
const audio = new Audio('/mon-son.mp3');
audio.play();
```

Place les fichiers audio dans `client/public/sounds/`.

---

## Variables d'environnement

| Variable | Fichier | Usage |
|----------|---------|-------|
| `VITE_SERVER_URL` | `client/.env` (local) | URL du serveur Socket.io |
| `VITE_SERVER_URL` | GitHub Secret | URL Railway en prod |
| `PORT` | Injecté par Railway | Port d'écoute du serveur |

En local : `VITE_SERVER_URL=http://localhost:3001`
En prod : `VITE_SERVER_URL=https://ton-app.railway.app`

---

## Lancer le projet

```bash
# Terminal 1 — serveur
cd server
npm install
npm run dev      # nodemon, redémarre auto

# Terminal 2 — client
cd client
npm install
npm run dev      # Vite HMR, redémarre auto
```

URLs locales :
- Écran principal : http://localhost:5173/
- Admin : http://localhost:5173/admin
- Buzzer équipe 1 : http://localhost:5173/buzzer?team=team1
- Buzzer équipe 2 : http://localhost:5173/buzzer?team=team2

---

## Pièges connus

- **Socket singleton** : `useSocket.js` garde une instance globale pour éviter les reconnexions multiples sur les re-renders React. Ne pas modifier ce pattern.
- **Timer côté serveur** : le décompte est géré par `setInterval` dans `server/index.js`. Ne jamais gérer le timer côté client (sauf affichage local pour la fluidité via `timer_tick`).
- **État en mémoire** : le `gameState` n'est pas persisté. Si le serveur redémarre, tout est perdu. C'est volontaire pour la simplicité.
- **`admin_next_question` vs `admin_timer_next_question`** : la manche timer a son propre flux de questions (sans changer d'écran), les autres types utilisent `admin_next_question`.
