# 🎿 Chalet Quiz

Jeu de quiz style émission TV — thème ski & montagne années 90.

---

## Structure

```
chalet-quiz/
├── server/        ← Backend Node.js + Socket.io
└── client/        ← Frontend React (Vite)
```

## Pages

| URL | Usage |
|-----|-------|
| `/` | Écran principal (à projeter) |
| `/admin` | Panneau de contrôle animateur |
| `/buzzer?team=team1` | Buzzer téléphone équipe 1 |
| `/buzzer?team=team2` | Buzzer téléphone équipe 2 |

---

## 🚀 Installation locale (pour tester)

### 1. Serveur

```bash
cd server
npm install
npm run dev     # démarre sur le port 3001
```

### 2. Client

```bash
cd client
npm install
npm run dev     # démarre sur le port 5173
```

Ouvre http://localhost:5173 pour l'écran principal.
Ouvre http://localhost:5173/admin pour l'admin.

---

## 🌐 Mise en production (en 3 étapes)

### Étape 1 : Déployer le serveur sur Railway

1. Crée un compte sur [railway.app](https://railway.app) (gratuit)
2. Clique **New Project → Deploy from GitHub repo**
3. Sélectionne ton repo, dossier : `server`
4. Railway détecte automatiquement le `package.json` et démarre
5. Dans **Settings → Networking**, génère un domaine public
6. Note l'URL, ex : `https://chalet-quiz-server.railway.app`

### Étape 2 : Configurer le secret GitHub

1. Sur GitHub, va dans ton repo → **Settings → Secrets → Actions**
2. Crée un secret : `VITE_SERVER_URL` = `https://ton-serveur.railway.app`

### Étape 3 : Activer GitHub Pages

1. Dans ton repo GitHub → **Settings → Pages**
2. Source : **GitHub Actions**
3. Pousse le code → le workflow se déclenche automatiquement
4. Ton app sera sur `https://ton-username.github.io/chalet-quiz/`

---

## 📱 Le jour J — Démarrage

1. Ouvre l'URL GitHub Pages sur le grand écran → `/`
2. Ouvre `/admin` sur ton téléphone (animateur)
3. Partage `/buzzer?team=team1` avec l'équipe 1
4. Partage `/buzzer?team=team2` avec l'équipe 2
5. Dans l'admin : onglet **📝 Manches** → crée tes manches et questions → **Envoyer au jeu**
6. Dans l'admin : onglet **⚙️ Config** → nomme tes équipes
7. **🎮 Contrôle** → tu pilotes tout de là

---

## 🎮 Types de manches

### 🔔 Buzzer
Questions classiques. Les équipes buzzent depuis leur téléphone. L'admin révèle la réponse et attribue les points.

### ⏱ Timer
Chaque équipe a un timer qui décompte pendant qu'elle répond. L'admin démarre/pause/change d'équipe. Le timer de l'équipe active diminue jusqu'à épuisement.

### 🖼 Image mystère
Une image se révèle progressivement (9 cases). L'admin clique sur les cases à révéler depuis le panneau. Les équipes devinent au fur et à mesure.  
→ Renseigne l'URL de l'image dans chaque question.

### 🎵 Blind test
L'animateur joue la musique depuis son téléphone/enceinte. L'appli affiche l'animation. L'admin révèle le titre quand une équipe a trouvé.

---

## ✏️ Personnalisation facile

Tout ce qui est modifiable sans toucher au code :
- Noms des équipes → onglet Config dans l'admin
- Questions & réponses → onglet Manches dans l'admin
- Points par manche → paramètre dans chaque manche

Pour changer les couleurs : modifie les variables CSS dans `client/src/index.css` (section `:root`).

---

## 💡 Conseils pour le jour J

- **WiFi** : Connecte tous les appareils au même réseau
- **Partage des liens** : Envoie les liens buzzer par QR code (génère-les sur qr-code-generator.com) ou WhatsApp
- **Blind test** : Prépare ta playlist à l'avance, joue la musique depuis ton téléphone/une enceinte BT
- **Batterie** : Charge les téléphones buzzer à 100%
- **Écran** : Ouvre l'écran principal en plein écran (F11)
