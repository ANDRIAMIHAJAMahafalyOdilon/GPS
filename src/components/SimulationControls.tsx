import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Gauge, 
  MapPin, 
  Flag,
  Navigation2
} from 'lucide-react';
import { RouteData, GpsTelemetry } from '../types/gps';

interface SimulationControlsProps {
  route: RouteData | null;
  telemetry: GpsTelemetry;
  isSimulating: boolean;
  onToggleSimulate: () => void;
  onResetSimulate: () => void;
  simSpeedMultiplier: number;
  onSetSpeedMultiplier: (mult: number) => void;
  progressPercent: number;
}

export function SimulationControls({
  route,
  telemetry,
  isSimulating,
  onToggleSimulate,
  onResetSimulate,
  simSpeedMultiplier,
  onSetSpeedMultiplier,
  progressPercent,
}: SimulationControlsProps) {
  return (
    <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-30 pointer-events-auto">
      <div className="bg-black/90 border border-zinc-700/80 rounded-xl p-3 md:p-4 backdrop-blur-xl shadow-2xl shadow-black flex flex-col gap-3">
        
        {/* Ligne d'action principale : Bouton Play/Pause + Vitesse simulation */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSimulate}
              disabled={!route || route.path.length === 0}
              className={`px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                !route || route.path.length === 0
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                  : isSimulating
                  ? 'bg-zinc-200 text-black border border-white hover:bg-white'
                  : 'bg-white text-black border border-white hover:bg-zinc-200 shadow-white/20'
              }`}
            >
              {isSimulating ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-black" />
                  <span>Pause GPS</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Démarrer Guidage</span>
                </>
              )}
            </button>

            <button
              onClick={onResetSimulate}
              title="Réinitialiser la position au départ"
              className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Multiplicateur de vitesse */}
          <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-lg p-0.5">
            {[1, 2, 5, 10].map((mult) => (
              <button
                key={mult}
                onClick={() => onSetSpeedMultiplier(mult)}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-all ${
                  simSpeedMultiplier === mult
                    ? 'bg-white text-black font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {mult}x
              </button>
            ))}
          </div>
        </div>

        {/* Barre de progression du parcours */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-1">
              <Navigation2 className="w-3 h-3 text-white rotate-45" />
              <span>PROGRESSION DU TRAJET</span>
            </span>
            <span className="text-white font-bold">{Math.round(progressPercent)}%</span>
          </div>

          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-white h-full transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
