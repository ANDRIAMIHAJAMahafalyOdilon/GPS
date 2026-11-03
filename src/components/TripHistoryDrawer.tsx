import React from 'react';
import { TripHistoryItem, GpsCoordinate } from '../types/gps';
import { formatMoney } from '../services/currency';
import { 
  History, 
  MapPin, 
  Flag, 
  Car, 
  Trash2, 
  RotateCw, 
  ArrowRight, 
  X, 
  Clock, 
  Milestone, 
  BookmarkPlus,
  Sparkles
} from 'lucide-react';

interface TripHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: TripHistoryItem[];
  onSelectTrip: (item: TripHistoryItem) => void;
  onClearHistory: () => void;
  onDeleteTrip: (id: string) => void;
  onSaveCurrentTrip: () => void;
  canSaveCurrent: boolean;
  currencyCode: string;
  currencyRate: number;
}

export function TripHistoryDrawer({
  isOpen,
  onClose,
  history,
  onSelectTrip,
  onClearHistory,
  onDeleteTrip,
  onSaveCurrentTrip,
  canSaveCurrent,
  currencyCode,
  currencyRate,
}: TripHistoryDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-zinc-950/95 border-l border-zinc-800 shadow-2xl backdrop-blur-2xl flex flex-col font-mono text-xs animate-in slide-in-from-right-6 duration-200">
      
      {/* En-tête du tiroir latéral */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800 bg-black/90">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center">
            <History className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight uppercase">
              DERNIERS TRAJETS
            </h2>
            <p className="text-[10px] text-zinc-400">
              {history.length} / 5 trajets enregistrés (localStorage)
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-white text-zinc-400 hover:text-white flex items-center justify-center transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Bouton d'action rapide pour sauvegarder le trajet en cours */}
      {canSaveCurrent && (
        <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/40">
          <button
            onClick={onSaveCurrentTrip}
            className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-white text-white rounded-lg flex items-center justify-center gap-2 text-xs transition-all shadow-sm active:scale-95"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-white" />
            <span>Mémoriser le trajet actuel</span>
          </button>
        </div>
      )}

      {/* Liste des 5 trajets */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {history.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
            <History className="w-8 h-8 text-zinc-700 stroke-[1.5]" />
            <p className="text-xs font-medium text-zinc-400">Aucun trajet enregistré</p>
            <p className="text-[10px] text-zinc-600 leading-relaxed max-w-xs">
              Les trajets terminés ou réservés seront automatiquement conservés dans le stockage local de votre navigateur (jusqu'à 5 trajets récents).
            </p>
          </div>
        ) : (
          history.map((trip, idx) => (
            <div
              key={trip.id}
              className="p-3 bg-black/80 border border-zinc-800 hover:border-zinc-600 rounded-xl space-y-2.5 transition-all group shadow-sm hover:shadow-md"
            >
              {/* Ligne 1 : Date & Coût final */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-600" />
                  {trip.completedAt}
                </span>

                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] text-zinc-400">Total :</span>
                  <span className="text-sm font-bold text-white tracking-tight">
                    {formatMoney(trip.finalCostEur, currencyCode, currencyRate)}
                  </span>
                </div>
              </div>

              {/* Ligne 2 : Origine & Destination */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                  <span className="text-zinc-300 truncate font-sans">
                    {trip.origin.address || `${trip.origin.lat.toFixed(3)}, ${trip.origin.lng.toFixed(3)}`}
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <Flag className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                  <span className="text-white font-medium truncate font-sans">
                    {trip.destination.address || `${trip.destination.lat.toFixed(3)}, ${trip.destination.lng.toFixed(3)}`}
                  </span>
                </div>
              </div>

              {/* Ligne 3 : Métriques (Distance, Durée, Véhicule) */}
              <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-900">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Milestone className="w-3 h-3 text-zinc-500" />
                    {trip.distanceKm.toFixed(1)} km
                  </span>
                  <span>•</span>
                  <span>{Math.round(trip.durationMinutes)} min</span>
                </div>

                <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9px] text-zinc-300">
                  {trip.vehicleName}
                </span>
              </div>

              {/* Ligne 4 : Actions (Recharger / Supprimer) */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onSelectTrip(trip)}
                  className="flex-1 py-1.5 px-2 bg-white hover:bg-zinc-200 text-black font-bold text-[10px] uppercase rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Recharger ce trajet</span>
                </button>

                <button
                  onClick={() => onDeleteTrip(trip.id)}
                  title="Supprimer ce trajet"
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-white transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pied de tiroir : Vider l'historique */}
      {history.length > 0 && (
        <div className="p-3 border-t border-zinc-800 bg-black/90 flex items-center justify-between">
          <button
            onClick={onClearHistory}
            className="text-[10px] text-zinc-500 hover:text-white flex items-center gap-1 transition-all"
          >
            <Trash2 className="w-3 h-3" />
            <span>Vider l'historique</span>
          </button>

          <button
            onClick={onClose}
            className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded border border-zinc-700 text-[10px]"
          >
            Fermer
          </button>
        </div>
      )}

    </div>
  );
}
