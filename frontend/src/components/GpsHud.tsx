import React from 'react';
import { RouteData, GpsTelemetry, TrafficState } from '../types/gps';
import { 
  CornerUpRight, 
  CornerUpLeft, 
  ArrowUp, 
  Flag, 
  Navigation, 
  Clock, 
  Milestone, 
  Radio, 
  Compass,
  AlertCircle,
  Activity,
  AlertTriangle
} from 'lucide-react';

interface GpsHudProps {
  route: RouteData | null;
  telemetry: GpsTelemetry;
  traffic: TrafficState;
  isSimulating: boolean;
  onOpenTaxiPanel: () => void;
  taxiPriceEstimated?: number;
}

export function GpsHud({
  route,
  telemetry,
  traffic,
  isSimulating,
  onOpenTaxiPanel,
  taxiPriceEstimated,
}: GpsHudProps) {
  const currentStep = route?.steps?.[telemetry.activeStepIndex] || route?.steps?.[0];

  const getManeuverIcon = (maneuver?: string) => {
    switch (maneuver?.toUpperCase()) {
      case 'TURN_RIGHT':
      case 'ROUNDABOUT_RIGHT':
        return <CornerUpRight className="w-8 h-8 text-white stroke-[2.5]" />;
      case 'TURN_LEFT':
      case 'ROUNDABOUT_LEFT':
        return <CornerUpLeft className="w-8 h-8 text-white stroke-[2.5]" />;
      case 'ARRIVE':
        return <Flag className="w-8 h-8 text-white stroke-[2.5]" />;
      default:
        return <ArrowUp className="w-8 h-8 text-white stroke-[2.5]" />;
    }
  };

  const isCongested = traffic.level === 'dense' || traffic.level === 'jam';
  const effectiveDuration = route ? Math.round(route.durationMinutes + traffic.delayMinutes) : 0;

  return (
    <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none p-3 md:p-4 flex flex-col gap-2.5">
      {/* Barre Supérieure Principale HUD */}
      <div className="flex items-start justify-between gap-3 max-w-6xl mx-auto w-full">
        
        {/* Boîte Prochaine Instruction Virage GPS */}
        {route && currentStep && (
          <div className="pointer-events-auto flex items-center gap-3.5 bg-black/90 border border-zinc-700/80 rounded-xl p-3 md:p-3.5 backdrop-blur-xl shadow-2xl shadow-black/80 max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="w-13 h-13 rounded-xl bg-zinc-900 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              {getManeuverIcon(currentStep.maneuver)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xl md:text-2xl font-bold font-mono tracking-tight text-white">
                  {currentStep.distanceMeters > 1000
                    ? `${(currentStep.distanceMeters / 1000).toFixed(1)} km`
                    : `${Math.round(currentStep.distanceMeters)} m`}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                  PROCHAIN VIRAGE
                </span>
              </div>
              <p className="text-xs md:text-sm font-medium text-zinc-200 truncate mt-0.5">
                {currentStep.instruction}
              </p>
            </div>
          </div>
        )}

        {/* Bloc Compteur de Vitesse Cockpit GPS & Télémétrie */}
        <div className="pointer-events-auto flex items-center gap-2 md:gap-3 bg-black/90 border border-zinc-700/80 rounded-xl p-2.5 md:p-3 backdrop-blur-xl shadow-2xl shadow-black/80 shrink-0">
          
          {/* Badge Trafic Compact Dynamique */}
          <div className="hidden lg:flex flex-col items-end pr-2 border-r border-zinc-800 text-[10px] font-mono">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Activity className="w-3 h-3 text-white animate-pulse" />
              <span className="font-bold text-white uppercase">{traffic.level.toUpperCase()}</span>
            </div>
            <div className="text-zinc-400 text-[9px]">
              DENSITÉ {traffic.density.toFixed(2)}x
            </div>
          </div>

          {/* Indicateur Compteur Digital */}
          <div className="flex flex-col items-center justify-center px-2 py-0.5 min-w-[70px]">
            <div className="flex items-baseline gap-0.5">
              <span className={`text-2xl md:text-3xl font-mono font-bold tracking-tighter ${isCongested ? 'text-zinc-200 underline decoration-white/60' : 'text-white'}`}>
                {Math.round(telemetry.speedKmh)}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 uppercase">
                KM/H
              </span>
            </div>
            <div className="w-full bg-zinc-800 h-1 rounded-full mt-1 overflow-hidden">
              <div 
                className={`h-full transition-all duration-200 ${isCongested ? 'bg-zinc-400' : 'bg-white'}`}
                style={{ width: `${Math.min((telemetry.speedKmh / 90) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="w-px h-8 bg-zinc-800 hidden sm:block" />

          {/* Statut GPS & Satellites */}
          <div className="hidden sm:flex flex-col text-[10px] font-mono text-zinc-400 gap-0.5 pr-1">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Radio className="w-3 h-3 text-white animate-pulse" />
              <span className="font-semibold text-white">GPS ACTIF</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <span>{telemetry.satellites} SATS</span>
              <span>•</span>
              <span>±{telemetry.accuracyM}M</span>
            </div>
          </div>
        </div>

      </div>

      {/* Alerte Trafic / Incident en cours (si ralentissement ou bouchon) */}
      {isCongested && (
        <div className="pointer-events-auto max-w-6xl mx-auto w-full px-3 py-1.5 bg-zinc-900/90 border border-white/60 text-white rounded-lg flex items-center justify-between gap-2 text-xs font-mono backdrop-blur-md shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-white shrink-0 animate-bounce" />
            <span className="font-bold">RALENTISSEMENT TRAFIC DÉTECTÉ :</span>
            <span className="text-zinc-300 truncate">
              {traffic.lastIncident || 'Ralentissement sur l\'itinéraire en temps réel.'}
            </span>
          </div>

          <div className="text-[11px] text-zinc-300 font-semibold shrink-0">
            Retard estimé : +{traffic.delayMinutes.toFixed(1)} min
          </div>
        </div>
      )}

      {/* Bandeau d'état inférieur HUD (Distance restante, Heure d'arrivée, Prix Taxi) */}
      {route && (
        <div className="pointer-events-auto flex items-center justify-between gap-2 max-w-6xl mx-auto w-full bg-black/90 border border-zinc-800 rounded-lg p-2.5 md:px-4 backdrop-blur-md text-xs font-mono shadow-xl">
          {/* Destination & Rue */}
          <div className="flex items-center gap-2 truncate">
            <Navigation className="w-3.5 h-3.5 text-white shrink-0 rotate-45" />
            <span className="text-zinc-400 hidden sm:inline">DESTINATION:</span>
            <span className="text-white font-medium truncate">
              {route.destination.address || 'Point d\'arrivée sélectionné'}
            </span>
          </div>

          {/* Métriques Trajet */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Milestone className="w-3.5 h-3.5 text-white" />
              <span className="font-bold text-white">{route.distanceKm.toFixed(1)} km</span>
            </div>

            <div className="flex items-center gap-1.5 text-zinc-300" title={`Durée base : ${Math.round(route.durationMinutes)} min + Trafic : ${traffic.delayMinutes.toFixed(1)} min`}>
              <Clock className="w-3.5 h-3.5 text-white" />
              <span className="font-bold text-white">{effectiveDuration} min</span>
              {traffic.delayMinutes > 0.5 && (
                <span className="text-[10px] text-zinc-400 font-normal">
                  (+{traffic.delayMinutes.toFixed(0)}m trafic)
                </span>
              )}
            </div>

            {/* Bouton Rapide d'ouverture du Prix Taxi avec surcoût trafic */}
            {taxiPriceEstimated !== undefined && (
              <button
                onClick={onOpenTaxiPanel}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded transition-all shadow-md group"
              >
                <span>TAXI DÈS</span>
                <span className="font-mono text-sm underline decoration-black/40">
                  {taxiPriceEstimated.toFixed(2)}€
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
