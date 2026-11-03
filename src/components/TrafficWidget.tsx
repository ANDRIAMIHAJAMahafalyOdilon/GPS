import React from 'react';
import { TrafficState } from '../types/gps';
import { formatMoney } from '../services/currency';
import { 
  Activity, 
  Dices, 
  AlertOctagon, 
  TrendingUp, 
  TrendingDown, 
  Gauge, 
  Sparkles,
  Radio,
  Sliders
} from 'lucide-react';

interface TrafficWidgetProps {
  traffic: TrafficState;
  onToggleAutoSimulate: () => void;
  onSetDensity: (density: number) => void;
  onTriggerRandomSurge: () => void;
  speedKmh: number;
  addedCostEur: number;
  currencyCode: string;
  currencyRate: number;
}

export function TrafficWidget({
  traffic,
  onToggleAutoSimulate,
  onSetDensity,
  onTriggerRandomSurge,
  speedKmh,
  addedCostEur,
  currencyCode,
  currencyRate,
}: TrafficWidgetProps) {
  const getTrafficBadge = () => {
    switch (traffic.level) {
      case 'fluid':
        return {
          bg: 'bg-zinc-900 border-zinc-700 text-zinc-200',
          indicator: 'bg-white',
          desc: 'Conditions optimales (50-60 km/h)',
        };
      case 'moderate':
        return {
          bg: 'bg-zinc-800 border-zinc-500 text-white',
          indicator: 'bg-white',
          desc: 'Ralentissements ponctuels (30-45 km/h)',
        };
      case 'dense':
        return {
          bg: 'bg-zinc-900 border-white text-white ring-1 ring-white/50',
          indicator: 'bg-white animate-pulse',
          desc: 'Trafic accordéon dense (15-28 km/h)',
        };
      case 'jam':
        return {
          bg: 'bg-white border-white text-black font-bold shadow-lg shadow-white/20',
          indicator: 'bg-black animate-ping',
          desc: 'Embouteillage sévère (5-15 km/h)',
        };
    }
  };

  const badge = getTrafficBadge();

  return (
    <div className="bg-black/90 border border-zinc-700/80 rounded-xl p-3 backdrop-blur-xl shadow-2xl flex flex-col gap-2.5 font-mono text-xs max-w-sm w-full">
      
      {/* Ligne 1 : Titre + Statut Auto-Simulation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-white animate-pulse" />
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            TRAFIC DYNAMIQUE TEMPS RÉEL
          </span>
        </div>

        {/* Toggle Auto Simulation */}
        <button
          onClick={onToggleAutoSimulate}
          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 border ${
            traffic.autoSimulate
              ? 'bg-white text-black border-white'
              : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
          }`}
          title="Variation aléatoire dynamique du trafic au fil du trajet"
        >
          <Radio className={`w-2.5 h-2.5 ${traffic.autoSimulate ? 'animate-pulse' : ''}`} />
          <span>{traffic.autoSimulate ? 'AUTO ACTIF' : 'MANUEL'}</span>
        </button>
      </div>

      {/* Ligne 2 : Badge d'état actuel */}
      <div className={`p-2.5 rounded-lg border flex items-center justify-between transition-all ${badge.bg}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${badge.indicator}`} />
          <div>
            <div className="font-bold text-xs leading-none">{traffic.label}</div>
            <div className="text-[10px] opacity-80 mt-0.5">{badge.desc}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-bold font-mono">
            x{traffic.density.toFixed(2)}
          </div>
          <div className="text-[9px] opacity-75">Densité</div>
        </div>
      </div>

      {/* Ligne 3 : Télémétrie d'impact dynamique (Vitesse & Surcoût Taxi) */}
      <div className="grid grid-cols-2 gap-2 p-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-[10px]">
        <div>
          <span className="text-zinc-500 uppercase block">Impact Vitesse</span>
          <span className="text-white font-bold flex items-center gap-1 mt-0.5">
            <Gauge className="w-3 h-3 text-zinc-400" />
            <span>{Math.round(speedKmh)} km/h</span>
            <span className="text-zinc-500 text-[9px]">({Math.round(traffic.speedFactor * 100)}%)</span>
          </span>
        </div>

        <div>
          <span className="text-zinc-500 uppercase block">Impact Tarif Taxi</span>
          <span className="text-white font-bold flex items-center gap-1 mt-0.5">
            <TrendingUp className="w-3 h-3 text-white" />
            <span>+{formatMoney(addedCostEur, currencyCode, currencyRate)}</span>
            <span className="text-zinc-500 text-[9px]">(+{Math.round((traffic.density - 1) * 100)}%)</span>
          </span>
        </div>
      </div>

      {/* Notification d'incident / événement de circulation */}
      {traffic.lastIncident && (
        <div className="text-[10px] text-zinc-300 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 truncate flex items-center gap-1.5">
          <AlertOctagon className="w-3 h-3 text-white shrink-0" />
          <span className="truncate">{traffic.lastIncident}</span>
        </div>
      )}

      {/* Ligne 4 : Boutons de contrôle rapides & Aléatoire */}
      <div className="flex items-center gap-1 pt-1 border-t border-zinc-800">
        <button
          onClick={() => onSetDensity(1.0)}
          className={`flex-1 py-1 rounded text-[10px] border transition-all ${
            traffic.density < 1.2
              ? 'bg-white text-black font-bold border-white'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          Fluide
        </button>

        <button
          onClick={() => onSetDensity(1.55)}
          className={`flex-1 py-1 rounded text-[10px] border transition-all ${
            traffic.density >= 1.2 && traffic.density < 1.9
              ? 'bg-white text-black font-bold border-white'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          Dense
        </button>

        <button
          onClick={() => onSetDensity(2.35)}
          className={`flex-1 py-1 rounded text-[10px] border transition-all ${
            traffic.density >= 1.9
              ? 'bg-white text-black font-bold border-white'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          Bouchons
        </button>

        <button
          onClick={onTriggerRandomSurge}
          title="Générer une variation aléatoire immédiate de trafic"
          className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 transition-all flex items-center justify-center"
        >
          <Dices className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}
