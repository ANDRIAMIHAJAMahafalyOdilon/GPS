# NOIR GPS - Architecture Backend Python & Frontend JavaScript

Ce projet sépare rigoureusement la logique métier et tarifaire (Backend Python FastAPI) de l'interface utilisateur interactive (Frontend React / TypeScript / Vite).

## 📁 Structure du Projet

```text
mon-projet-gps/
├── backend/                  # 🐍 BACKEND PYTHON
│   ├── main.py              # Serveur API FastAPI (calculs taxi, barèmes, GPS)
│   ├── requirements.txt     # Dépendances Python (fastapi, uvicorn, pydantic)
│   └── README.md            # Documentation et commandes
│
├── src/                      # ⚡ FRONTEND JAVASCRIPT / TYPESCRIPT
│   ├── components/          # Composants React (Carte 3D, HUD, Taxi, etc.)
│   ├── services/            # Client API Python & Calculateur de secours
│   ├── types/               # Typages GPS et modèles de données
│   ├── App.tsx              # Cockpit principal noir & blanc
│   ├── main.tsx             # Point d'entrée React
│   └── index.css            # Styles Tailwind & animations radar
│
├── package.json              # Dépendances Node.js / React
├── vite.config.ts           # Configuration Vite
└── index.html               # Page HTML principale
```

---

## 💻 Commandes à taper sur le Terminal

### 1️⃣ Lancement du Backend Python (Terminal 1)

```bash
# Se déplacer dans le dossier backend
cd backend

# Créer un environnement virtuel Python
python -m venv venv

# Activer l'environnement virtuel :
# Sur macOS / Linux :
source venv/bin/activate
# Sur Windows (cmd / PowerShell) :
# venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Lancer l'API FastAPI avec rechargement automatique
uvicorn main:app --reload --port 8000
```
Le backend sera disponible sur : **`http://localhost:8000`**
Documentation Swagger interactive : **`http://localhost:8000/docs`**

---

### 2️⃣ Lancement du Frontend JavaScript / React (Terminal 2)

```bash
# Ouvrir un deuxième terminal à la racine du projet
npm install

# Démarrer le serveur de développement
npm run dev
```
L'interface s'ouvrira sur : **`http://localhost:3000`** ou **`http://localhost:5173`**
