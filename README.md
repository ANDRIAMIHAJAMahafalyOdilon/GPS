# NOIR GPS - Projet Complet

Projet séparé avec Backend Python (FastAPI) et Frontend JavaScript (React).

## 📁 Structure

- **backend/** : API Python FastAPI pour le calcul des tarifs taxi et distances
- **frontend/** : Application Web React / TypeScript / Vite avec Google Maps 3D

## 🚀 Démarrage

### 1. Démarrer le Backend Python
```bash
cd backend
python -m venv venv
# Linux / Mac :
source venv/bin/activate
# Windows :
venv\Scriptsctivate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Démarrer le Frontend JavaScript / React
```bash
cd frontend
npm install
npm run dev
```
L'application web s'ouvre sur http://localhost:3000
