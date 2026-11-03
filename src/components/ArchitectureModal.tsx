import React, { useState } from 'react';
import { 
  X, 
  Terminal, 
  Copy, 
  Check, 
  FolderTree, 
  FileCode, 
  Server, 
  Sparkles,
  ExternalLink,
  Activity,
  CheckCircle2,
  XCircle,
  Download
} from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ArchitectureModal({ isOpen, onClose }: ArchitectureModalProps) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'structure' | 'backend_code' | 'api_test'>('terminal');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [apiPingStatus, setApiPingStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle');
  const [apiPingData, setApiPingData] = useState<any>(null);

  if (!isOpen) return null;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const testPythonApi = async () => {
    setApiPingStatus('checking');
    try {
      const res = await fetch('http://localhost:8000/api/health', {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setApiPingData(data);
        setApiPingStatus('online');
      } else {
        setApiPingStatus('offline');
      }
    } catch {
      setApiPingStatus('offline');
    }
  };

  const terminalCommandsPython = `# 1. Se déplacer dans le dossier backend
cd backend

# 2. Créer un environnement virtuel Python
python -m venv venv

# 3. Activer l'environnement virtuel :
# Sur Linux / macOS :
source venv/bin/activate
# Sur Windows :
# venv\\Scripts\\activate

# 4. Installer les dépendances (FastAPI, Uvicorn, Pydantic)
pip install -r requirements.txt

# 5. Démarrer le serveur API Python
uvicorn main:app --reload --port 8000`;

  const terminalCommandsFrontend = `# 1. À la racine du projet (dans un 2e terminal) :
npm install

# 2. Lancer l'application web frontend
npm run dev`;

  const folderStructureText = `mon-projet-gps/
│
├── 🐍 backend/                        # BACKEND PYTHON (FastAPI)
│   ├── main.py                       # API REST : Calculs Taxi & Distances GPS
│   ├── requirements.txt              # Dépendances (fastapi, uvicorn, pydantic)
│   └── README.md                     # Documentation backend
│
├── ⚡ src/                            # FRONTEND JAVASCRIPT / REACT
│   ├── components/                   # Composants UI
│   │   ├── MapContainer.tsx          # Carte Google Maps 3D & tracé polyligne
│   │   ├── GpsHud.tsx                # Vitesseur & guidage virage par virage
│   │   ├── TaxiFareModal.tsx         # Calculateur tarifaire des 5 catégories de taxis
│   │   ├── SimulationControls.tsx    # Commandes de lecture et simulation GPS
│   │   └── ArchitectureModal.tsx     # Guide Architecture & Terminal
│   ├── services/
│   │   └── taxiCalculator.ts         # Connecteur API Python + calcul miroir
│   ├── types/
│   │   └── gps.ts                    # Modèles TypeScript
│   ├── App.tsx                       # Interface principale cockpit monochrome
│   ├── main.tsx                      # Point d'entrée React & gestion de quotas
│   └── index.css                     # Styles Tailwind & animations radar
│
├── package.json                       # Dépendances Node.js / React
├── vite.config.ts                    # Config bundler Vite
├── .env.example                      # Variables d'environnement
└── index.html                        # Page HTML d'accueil`;

  const pythonMainCode = `"""
NOIR GPS - Backend Python (FastAPI)
Ce fichier constitue l'API Backend pour le calcul des tarifs de taxi, 
la gestion des coordonnées GPS et la simulation d'itinéraires.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import math
from datetime import datetime

app = FastAPI(
    title="Noir GPS Taxi API",
    description="API de calcul kilométrique de taxi et services GPS en temps réel",
    version="1.0.0"
)

# Configuration CORS pour autoriser le frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TaxiEstimateRequest(BaseModel):
    distance_km: float = Field(..., ge=0)
    duration_minutes: float = Field(..., ge=0)
    traffic_density: Optional[float] = Field(1.0, ge=0.5, le=3.0)
    is_night: Optional[bool] = Field(False)
    is_rush_hour: Optional[bool] = Field(False)

VEHICLE_CATALOG = [
    {
        "id": "noir_standard",
        "name": "Noir Standard",
        "category": "Berline Confort",
        "base_fare": 3.50,
        "per_km_rate": 1.45,
        "per_min_rate": 0.35,
        "min_fare": 8.00,
        "capacity_passengers": 4,
        "capacity_luggage": 3,
        "eta_pickup_minutes": 3,
        "description": "Taxi berline moderne, propre et silencieux."
    },
    {
        "id": "noir_prestige",
        "name": "Noir Prestige VIP",
        "category": "Berline Luxe",
        "base_fare": 6.00,
        "per_km_rate": 2.20,
        "per_min_rate": 0.55,
        "min_fare": 15.00,
        "capacity_passengers": 4,
        "capacity_luggage": 4,
        "eta_pickup_minutes": 5,
        "description": "Mercedes Classe E / BMW. Eau et chargeur inclus."
    },
    {
        "id": "noir_eco",
        "name": "Noir Eco 100% Électrique",
        "category": "Écologique",
        "base_fare": 3.00,
        "per_km_rate": 1.30,
        "per_min_rate": 0.30,
        "min_fare": 7.50,
        "capacity_passengers": 4,
        "capacity_luggage": 2,
        "eta_pickup_minutes": 4,
        "description": "Véhicule électrique silencieux zéro émission."
    },
    {
        "id": "noir_van",
        "name": "Noir Van XL",
        "category": "Grand Volume (6-7 places)",
        "base_fare": 7.00,
        "per_km_rate": 2.60,
        "per_min_rate": 0.60,
        "min_fare": 20.00,
        "capacity_passengers": 7,
        "capacity_luggage": 8,
        "eta_pickup_minutes": 7,
        "description": "Van spacieux pour groupes et nombreux bagages."
    },
    {
        "id": "noir_moto",
        "name": "Noir Moto Express",
        "category": "Moto Taxi",
        "base_fare": 10.00,
        "per_km_rate": 2.80,
        "per_min_rate": 0.40,
        "min_fare": 25.00,
        "capacity_passengers": 1,
        "capacity_luggage": 1,
        "eta_pickup_minutes": 2,
        "description": "Idéal pour échapper aux bouchons parisiens."
    }
]

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "noir-gps-python-backend"}

@app.post("/api/taxi/estimate")
def estimate_taxi_fare(req: TaxiEstimateRequest):
    multiplier = req.traffic_density or 1.0
    if req.is_night:
        multiplier *= 1.20
    if req.is_rush_hour:
        multiplier *= 1.15

    vehicles = []
    for v in VEHICLE_CATALOG:
        distance_cost = req.distance_km * v["per_km_rate"]
        time_cost = req.duration_minutes * v["per_min_rate"] * multiplier
        raw_price = v["base_fare"] + distance_cost + time_cost
        final_price = max(raw_price, v["min_fare"])

        vehicles.append({
            "id": v["id"],
            "name": v["name"],
            "category": v["category"],
            "base_fare": v["base_fare"],
            "per_km_rate": v["per_km_rate"],
            "per_min_rate": v["per_min_rate"],
            "min_fare": v["min_fare"],
            "surge_multiplier": round(multiplier, 2),
            "estimated_total": round(final_price, 2),
            "estimated_range_min": round(final_price * 0.95, 2),
            "estimated_range_max": round(final_price * 1.15, 2),
            "capacity_passengers": v["capacity_passengers"],
            "capacity_luggage": v["capacity_luggage"],
            "eta_pickup_minutes": v["eta_pickup_minutes"],
            "description": v["description"]
        })

    return {
        "distance_km": round(req.distance_km, 2),
        "duration_minutes": round(req.duration_minutes, 1),
        "traffic_factor": round(multiplier, 2),
        "is_night_tariff": req.is_night,
        "currency": "EUR (€)",
        "vehicles": vehicles,
        "calculated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

# Endpoint de simulation dynamique de trafic en temps réel
@app.get("/api/traffic/simulate")
def simulate_live_traffic(current_density: Optional[float] = 1.0):
    import random
    drift = (random.random() - 0.49) * 0.28
    new_density = round(max(0.9, min(2.7, (current_density or 1.0) + drift)), 2)
    speed_factor = max(0.18, 1.0 / (new_density ** 1.2))
    level = "fluid" if new_density < 1.25 else ("moderate" if new_density < 1.65 else ("dense" if new_density < 2.1 else "jam"))
    return {
        "density": new_density,
        "level": level,
        "speed_factor": round(speed_factor, 2),
        "timestamp": datetime.now().isoformat()
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-black/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold text-sm">
              PY/JS
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                ARCHITECTURE PYTHON & JAVASCRIPT
              </h2>
              <p className="text-[11px] text-zinc-400">
                Structure découplée Backend (Python) / Frontend (JavaScript/React)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-white text-zinc-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-zinc-800 bg-zinc-950">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-4 py-2 border-b-2 font-bold transition-all flex items-center gap-2 ${
              activeTab === 'terminal'
                ? 'border-white text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>1. Commandes Terminal</span>
          </button>

          <button
            onClick={() => setActiveTab('structure')}
            className={`px-4 py-2 border-b-2 font-bold transition-all flex items-center gap-2 ${
              activeTab === 'structure'
                ? 'border-white text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>2. Structure Fichiers</span>
          </button>

          <button
            onClick={() => setActiveTab('backend_code')}
            className={`px-4 py-2 border-b-2 font-bold transition-all flex items-center gap-2 ${
              activeTab === 'backend_code'
                ? 'border-white text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>3. Code Python Backend</span>
          </button>

          <button
            onClick={() => setActiveTab('api_test')}
            className={`px-4 py-2 border-b-2 font-bold transition-all flex items-center gap-2 ${
              activeTab === 'api_test'
                ? 'border-white text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>4. Test API Direct</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          
          {/* TAB 1 : Terminal */}
          {activeTab === 'terminal' && (
            <div className="space-y-4">
              {/* Carte de téléchargement ZIP direct */}
              <div className="p-4 bg-zinc-900 border border-white/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Télécharger le Projet Complet (.ZIP)
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Contient tous les fichiers : Backend Python (FastAPI), Frontend React, styles et configuration.
                    </p>
                  </div>
                </div>

                <a
                  href="/noir-gps-projet-complet.zip"
                  download="noir-gps-projet-complet.zip"
                  className="px-4 py-2 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-2 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger .ZIP (75 Ko)</span>
                </a>
              </div>

              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-200 font-bold uppercase tracking-wider">
                    Terminal 1 : Démarrage du Backend Python (FastAPI)
                  </span>
                  <button
                    onClick={() => handleCopy('term_py', terminalCommandsPython)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-600 transition-all"
                  >
                    {copiedKey === 'term_py' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'term_py' ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-black border border-zinc-800 rounded-lg text-emerald-400 overflow-x-auto text-[11px] leading-relaxed">
                  {terminalCommandsPython}
                </pre>
              </div>

              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-200 font-bold uppercase tracking-wider">
                    Terminal 2 : Démarrage du Frontend JavaScript (Vite / React)
                  </span>
                  <button
                    onClick={() => handleCopy('term_js', terminalCommandsFrontend)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-600 transition-all"
                  >
                    {copiedKey === 'term_js' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'term_js' ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-black border border-zinc-800 rounded-lg text-cyan-300 overflow-x-auto text-[11px] leading-relaxed">
                  {terminalCommandsFrontend}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2 : Structure */}
          {activeTab === 'structure' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 uppercase tracking-wider">
                  Arborescence complète du projet (Séparation Backend / Frontend)
                </span>
                <button
                  onClick={() => handleCopy('structure', folderStructureText)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-600 transition-all"
                >
                  {copiedKey === 'structure' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'structure' ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
              <pre className="p-4 bg-black border border-zinc-800 rounded-xl text-zinc-300 overflow-x-auto text-[11px] leading-relaxed">
                {folderStructureText}
              </pre>
            </div>
          )}

          {/* TAB 3 : Backend Code */}
          {activeTab === 'backend_code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-bold">backend/main.py</span>
                  <span className="text-zinc-500 ml-2">FastAPI • Formules de calcul taxi officielles</span>
                </div>
                <button
                  onClick={() => handleCopy('main_py', pythonMainCode)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-zinc-200 text-black font-bold rounded transition-all"
                >
                  {copiedKey === 'main_py' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'main_py' ? 'Code Copié !' : 'Copier le code Python'}</span>
                </button>
              </div>
              <pre className="p-4 bg-black border border-zinc-800 rounded-xl text-zinc-300 overflow-x-auto text-[11px] max-h-[500px]">
                {pythonMainCode}
              </pre>
            </div>
          )}

          {/* TAB 4 : Test API */}
          {activeTab === 'api_test' && (
            <div className="space-y-4 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Test de communication Frontend ↔ Backend Python
                </h3>
                <p className="text-zinc-400 text-[11px] mt-1">
                  Cliquez sur le bouton ci-dessous pour vérifier si votre serveur Python local tourne sur <code className="text-white">http://localhost:8000</code>.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={testPythonApi}
                  className="px-4 py-2 bg-white hover:bg-zinc-200 text-black font-bold rounded-lg transition-all"
                >
                  Tester la connexion (Ping /api/health)
                </button>

                {apiPingStatus === 'checking' && (
                  <span className="text-zinc-400 animate-pulse">Vérification en cours...</span>
                )}

                {apiPingStatus === 'online' && (
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Backend Python en ligne et connecté !</span>
                  </div>
                )}

                {apiPingStatus === 'offline' && (
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <XCircle className="w-4 h-4 text-zinc-500" />
                    <span>Non connecté localement (Le frontend utilise automatiquement le moteur de calcul miroir autonome).</span>
                  </div>
                )}
              </div>

              {apiPingData && (
                <pre className="p-3 bg-black border border-zinc-800 rounded-lg text-emerald-400 text-[11px]">
                  {JSON.stringify(apiPingData, null, 2)}
                </pre>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-black/90 flex items-center justify-between text-zinc-500 text-[11px]">
          <span>Format : Fullstack Python FastAPI & React / TypeScript / Vite</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded border border-zinc-700"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
