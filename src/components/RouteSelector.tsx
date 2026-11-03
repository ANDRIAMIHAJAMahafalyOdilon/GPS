import React, { useRef, useState } from 'react';
import { GpsCoordinate, RouteData } from '../types/gps';
import { POPULAR_LOCATIONS } from '../services/taxiCalculator';
import { LocationSearch } from './LocationSearch';
import {
  MapPin,
  Flag,
  ChevronDown,
  Navigation,
  X,
  MousePointerClick,
} from 'lucide-react';

interface RouteSelectorProps {
  origin: GpsCoordinate;
  originAddress: string;
  isOriginCustom: boolean;
  onSetOrigin: (coords: GpsCoordinate) => void;
  onUseMyLocation: () => void;
  destination: GpsCoordinate | null;
  waypoints: GpsCoordinate[];
  onAddWaypoint: (coords: GpsCoordinate) => void;
  onRemoveWaypoint: (index: number) => void;
  onSetDestination: (coords: GpsCoordinate) => void;
  onClearDestination: () => void;
  activeTargetMode: 'none' | 'set_origin' | 'set_destination' | 'set_waypoint';
  onSetActiveTargetMode: (mode: 'none' | 'set_origin' | 'set_destination' | 'set_waypoint') => void;
  route: RouteData | null;
  isLocating: boolean;
  locationError: string | null;
}

export function RouteSelector({
  origin,
  originAddress,
  isOriginCustom,
  onSetOrigin,
  onUseMyLocation,
  destination,
  waypoints,
  onAddWaypoint,
  onRemoveWaypoint,
  onSetDestination,
  onClearDestination,
  activeTargetMode,
  onSetActiveTargetMode,
  route,
  isLocating,
  locationError,
}: RouteSelectorProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ x: 16, y: 72 });
  const dragRef = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);

  const handleHeaderPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, ...panelPosition };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleHeaderPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const drag = dragRef.current;
    const maxX = Math.max(0, window.innerWidth - 300);
    const maxY = Math.max(0, window.innerHeight - 100);
    setPanelPosition({
      x: Math.max(0, Math.min(maxX, drag.x + event.clientX - drag.pointerX)),
      y: Math.max(0, Math.min(maxY, drag.y + event.clientY - drag.pointerY)),
    });
  };

  return (
    <div className="absolute z-30 pointer-events-auto max-w-sm w-[calc(100vw-1.5rem)] md:w-full" style={{ left: panelPosition.x, top: panelPosition.y }}>
      <div className="bg-black/90 border border-zinc-700/80 rounded-xl backdrop-blur-xl shadow-2xl shadow-black overflow-hidden flex flex-col">
        <div
          className={`flex items-center justify-between px-3.5 py-2.5 border-b bg-zinc-950/80 touch-none cursor-grab active:cursor-grabbing ${isMoveMode ? 'border-sky-500/60' : 'border-zinc-800'}`}
          onPointerDown={handleHeaderPointerDown}
          onPointerMove={handleHeaderPointerMove}
          onPointerUp={() => { dragRef.current = null; }}
          onPointerCancel={() => { dragRef.current = null; }}
          onDoubleClick={() => setIsMoveMode(true)}
          title={isMoveMode ? 'Fais glisser cet en-tête pour déplacer le panneau' : 'Double-clique ici, puis fais glisser pour déplacer le panneau'}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white animate-ping-subtle" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              ITINÉRAIRE
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isExpanded && (
          <div className="p-3.5 space-y-3 font-mono text-xs">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-white rotate-45" />
                  <span>DÉPART {isOriginCustom ? '— AUTRE LIEU' : '— MA POSITION'}</span>
                </span>
                <span className={isOriginCustom ? 'text-zinc-400' : locationError ? 'text-amber-400' : isLocating ? 'text-amber-400' : 'text-emerald-400'}>
                  {isOriginCustom ? 'Départ choisi' : locationError ? 'GPS indisponible' : isLocating ? 'Localisation...' : 'GPS actif'}
                </span>
              </div>

              <LocationSearch
                value={originAddress}
                onSelect={onSetOrigin}
                bias={origin}
                placeholder="Départ : ENI, maison, adresse..."
              />

              {isOriginCustom ? (
                <button onClick={onUseMyLocation} className="text-[10px] text-white underline hover:text-zinc-300">
                  Reprendre ma position GPS comme départ
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-[9px] text-zinc-500">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLocating ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                  <span>{origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}</span>
                </div>
              )}

              <button
                onClick={() => onSetActiveTargetMode(activeTargetMode === 'set_origin' ? 'none' : 'set_origin')}
                className={`text-[9px] underline ${activeTargetMode === 'set_origin' ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {activeTargetMode === 'set_origin' ? 'Clique sur la carte pour choisir le départ' : 'Ou pointer le départ sur la carte'}
              </button>

              {locationError && !isOriginCustom && (
                <p className="text-[10px] text-amber-400 font-sans">{locationError}</p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Flag className="w-3 h-3 text-white" />
                  <span>ARRIVÉE</span>
                </span>
                <button
                  onClick={() =>
                    onSetActiveTargetMode(activeTargetMode === 'set_destination' ? 'none' : 'set_destination')
                  }
                  className={`flex items-center gap-1 text-[9px] underline ${
                    activeTargetMode === 'set_destination'
                      ? 'text-white font-bold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <MousePointerClick className="w-3 h-3" />
                  {activeTargetMode === 'set_destination' ? 'En attente du clic...' : 'Pointer sur carte'}
                </button>
              </div>

              <LocationSearch
                value={destination?.address}
                onSelect={onSetDestination}
                bias={origin}
                placeholder="Arrivée : ENI, maison, adresse..."
              />

              {destination ? (
                <div className="flex items-center gap-1.5 p-2 bg-zinc-900/90 border border-white/40 rounded-lg text-white">
                  <Flag className="w-3 h-3 text-white shrink-0" />
                  <span className="truncate flex-1 font-sans text-xs font-medium">
                    {destination.address || `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`}
                  </span>
                  <button
                    onClick={onClearDestination}
                    title="Effacer la destination"
                    className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-white shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-zinc-500 font-sans">
                  Recherchez un établissement (ex. ENI), une maison, une adresse ou une région.
                </p>
              )}
            </div>

            {destination && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>POINTS DE PASSAGE ({waypoints.length})</span>
                  <button
                    onClick={() => onSetActiveTargetMode(activeTargetMode === 'set_waypoint' ? 'none' : 'set_waypoint')}
                    className={`text-[9px] underline ${activeTargetMode === 'set_waypoint' ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {activeTargetMode === 'set_waypoint' ? 'Clique sur la carte…' : 'Ajouter sur la carte'}
                  </button>
                </div>
                <LocationSearch
                  onSelect={onAddWaypoint}
                  bias={origin}
                  placeholder="Ajouter une place sur le trajet..."
                />
                {waypoints.map((point, index) => (
                  <div key={`${point.lat}-${point.lng}-${index}`} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1.5 text-[10px] text-zinc-300">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="flex-1 truncate">{point.address || `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`}</span>
                    <button onClick={() => onRemoveWaypoint(index)} title="Retirer ce point du trajet" className="text-zinc-500 hover:text-white"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}

            {route && (
              <div className="grid grid-cols-2 gap-2 p-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-center">
                <div>
                  <div className="text-[9px] text-zinc-500 uppercase">Distance</div>
                  <div className="text-sm font-bold text-white">{route.distanceKm.toFixed(1)} km</div>
                </div>
                <div>
                  <div className="text-[9px] text-zinc-500 uppercase">Durée</div>
                  <div className="text-sm font-bold text-white">{Math.round(route.durationMinutes)} min</div>
                </div>
              </div>
            )}

            <div className="space-y-1 pt-1">
              <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                <span>DESTINATIONS RAPIDES :</span>
                <span className="text-[9px] text-zinc-500">Vue 3D & Immeubles</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {POPULAR_LOCATIONS.map((loc) => {
                  const isCurrent = destination?.lat === loc.coords.lat && destination?.lng === loc.coords.lng;
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
                      <MapPin className="w-2.5 h-2.5" />
                      <span>{loc.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
