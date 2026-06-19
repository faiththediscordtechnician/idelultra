# 🏥 Idle Hospital

The ultimate incremental hospital management game! Hire doctors, build rooms, upgrade facilities, and expand to larger hospitals to grow your medical empire.

## Features

- **Progressive Gameplay**: Slow-burn early game (45+ mins) with strategic progression
- **Staff Management**: Hire doctors and nurses with scaling costs and efficiency bonuses
- **Building System**: Construct and upgrade 6 different room types (Reception, Examination, Surgery, ICU, Pharmacy, Lab)
- **Hospital Tiers**: Unlock bigger hospitals with better income multipliers
- **Prestige System**: Strategic prestige mechanic with 15% per prestige point income bonus
- **Patient Types**: Unlock different patient services with increasing revenue (General Checkup, Emergency, Surgery, ICU, Maternity)
- **Auto-Save**: Your progress is automatically saved to localStorage

## Gameplay Tips

- **Early Game**: Focus on buying examination rooms first for steady income
- **Mid Game**: Hire staff strategically and upgrade rooms to boost production
- **Late Game**: Plan your prestige runs - each prestige point gives a permanent 15% income boost
- **Prestige Strategy**: Different patient types and hospital upgrades require specific prestige levels

## Prestige Benefits

- **+15% production** per prestige point (multiplicative!)
- **Staff efficiency increases** with prestige
- **Unlocks new patient types** at key prestige milestones
- **Access to better hospitals** at higher prestige levels

## How to Play Locally

```bash
npm install
npm start
```

Game will run at `http://localhost:3000`

## Deploy to Railway

1. Push this repo to GitHub
2. Go to [Railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub"
4. Select this repository
5. Railway will automatically detect `package.json` and deploy!

The game is now playable online without any downloads needed.

## Project Structure

```
├── public/
│   ├── index.html      # Game HTML
│   ├── app.js          # UI and rendering logic
│   ├── gameEngine.js   # Game state and mechanics
│   └── electron.js     # (Optional) Electron desktop wrapper
├── server.js           # Express web server
├── package.json        # Dependencies
└── Procfile            # Railway deployment config
```

## Technologies

- **Frontend**: Vanilla JavaScript with HTML5/CSS3
- **Backend**: Express.js
- **Storage**: localStorage (automatic save/load)
- **Deployment**: Railway.app

Enjoy building your hospital empire! 🏥💰
