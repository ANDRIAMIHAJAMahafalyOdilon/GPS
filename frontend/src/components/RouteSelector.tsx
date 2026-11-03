import React, { useState } from 'react';
import { GpsCoordinate, RouteData } from '../types/gps';
import { POPULAR_LOCATIONS } from '../services/taxiCalculator';
import { 
  MapPin, 
  Flag, 
  Navigation, 
  Car, 
  Search, 
  ArrowRightLeft, 
  MousePointerClick,
  ChevronDown,
  Building2,
  Sparkles
} from 'lucide-react';

interface RouteSelectorProps {
  origin: GpsCoordinate;
  destination: GpsCoordinate;
  onSetOrigin: (coords: GpsCoordinate) => void;
  onSetDestination: (coords: GpsCoordinate) => void;
  onSwapCoordinates: () => void;
  activeTargetMode: 'none' | 'set_origin' | 'set_destination';
  onSetActiveTargetMode: (mode: 'none' | 'set_origin' | 'set_destination') => void;
  route: RouteData | null;
  onOpenTaxiPanel: () => void;
  is3DMode: boolean;
  onToggle3DMode: () => void;
  onOpenArchitectureModal: () => void;
}

export function RouteSelector({
  origin,
  destination,
  onSetOrigin,
  onSetDestination,
  onSwapCoordinates,
  activeTargetMode,
  onSetActiveTargetMode,
  route,
  onOpenTaxiPanel,
  is3DMode,
  onToggle3DMode,
  onOpenArchitectureModal,
}: RouteSelectorProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  return (
    <div className="absolute top-18 md:top-20 left-3 md:left-4 z-30 pointer-events-auto max-w-sm w-full">
      <div className="bg-black/90 border border-zinc-700/80 rounded-xl backdrop-blur-xl shadow-2xl shadow-black overflow-hidden flex flex-col">
        
        {/* Barre titre compacte */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white animate-ping-subtle" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              ITINÉRAIRE & DESTINATION
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenArchitectureModal}
              title="Guide Architecture Python & Commandes Terminal"
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-all flex items-center gap-1"
            >
              <span>Code Py/JS</span>
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white"
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-3.5 space-y-3 font-mono text-xs">
            
            {/* Ligne Départ */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-zinc-300" />
                  <span>DÉPART</span>
                </span>
                <button
                  onClick={() => onSetActiveTargetMode(activeTargetMode === 'set_origin' ? 'none' : 'set_origin')}
                  className={`text-[9px] underline ${
                    activeTargetMode === 'set_origin' ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {activeTargetMode === 'set_origin' ? '● En attente du clic...' : 'Pointer sur carte'}
                </button>
              </div>

              <div className="flex items-center gap-1.5 p-2 bg-zinc-900/90 border border-zinc-800 rounded-lg text-white">
                <div className="w-2 h-2 rounded-full bg-zinc-400 shrink-0" />
                <span className="truncate flex-1 font-sans text-xs">
                  {origin.address || `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`}
                </span>
              </div>
            </div>

            {/* Bouton d'inversion des points */}
            <div className="flex justify-center -my-1">
              <button
                onClick={onSwapCoordinates}
                title="Inverser départ et arrivée"
                className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 hover:border-white text-zinc-400 hover:text-white flex items-center justify-center transition-all shadow"
              >
                <ArrowRightLeft className="w-3 h-3 rotate-90" />
              </button>
            </div>

            {/* Ligne Destination */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Flag className="w-3 h-3 text-white" />
                  <span>DESTINATION</span>
                </span>
                <button
                  onClick={() => onSetActiveTargetMode(activeTargetMode === 'set_destination' ? 'none' : 'set_destination')}
                  className={`text-[9px] underline ${
                    activeTargetMode === 'set_destination' ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {activeTargetMode === 'set_destination' ? '● En attente du clic...' : 'Pointer sur carte'}
                </button>
              </div>

              <div className="flex items-center gap-1.5 p-2 bg-zinc-900/90 border border-zinc-800 rounded-lg text-white">
                <div className="w-2 h-2 rounded-full bg-white shrink-0" />
                <span className="truncate flex-1 font-sans text-xs font-medium">
                  {destination.address || `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`}
                </span>
              </div>
            </div>

            {/* Lieux Populaires Rapides (avec vue sur les grands immeubles et monuments) */}
            <div className="space-y-1 pt-1">
              <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                <span>DESTINATIONS RAPIDES :</span>
                <span className="text-[9px] text-zinc-500">Vue 3D & Immeubles</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {POPULAR_LOCATIONS.map((loc) => {
                  const isCurrent = destination.lat === loc.coords.lat && destination.lng === loc.coords.lng;
                  return (
                    <button
                      key={loc.name}
                      onClick={() => onSetDestination(loc.coords)}
                      className={`px-2 py-1 rounded text-[10px] transition-all flex items-center gap-1 border ${
                        isCurrent
                          ? 'bg-white text-black font-bold border-white'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <span>{loc.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Principale : Calculer Tarif Taxi */}
            <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2">
              <button
                onClick={onOpenTaxiPanel}
                className="flex-1 py-2 px-3 bg-white hover:bg-zinc-200 text-black font-mono text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
              >
                <Car className="w-4 h-4 stroke-[2.5]" />
                <span>Calculer Tarif Taxi</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
