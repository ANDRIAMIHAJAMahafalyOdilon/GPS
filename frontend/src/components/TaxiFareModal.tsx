import React, { useState } from 'react';
import { TaxiEstimateResponse, VehicleTariff, RouteData } from '../types/gps';
import { 
  Car, 
  Users, 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  X, 
  ShieldCheck, 
  AlertTriangle,
  Server,
  Zap,
  Info
} from 'lucide-react';

interface TaxiFareModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimate: TaxiEstimateResponse | null;
  route: RouteData | null;
  onUpdateOptions: (options: { trafficDensity: number; isNight: boolean; isRushHour: boolean }) => void;
  currentOptions: { trafficDensity: number; isNight: boolean; isRushHour: boolean };
  onBookTaxi?: (vehicle: VehicleTariff) => void;
}

export function TaxiFareModal({
  isOpen,
  onClose,
  estimate,
  route,
  onUpdateOptions,
  currentOptions,
  onBookTaxi,
}: TaxiFareModalProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('noir_standard');
  const [bookingConfirmed, setBookingConfirmed] = useState<boolean>(false);
  const [driverArrivalSec, setDriverArrivalSec] = useState<number>(180);

  if (!isOpen) return null;

  const selectedVehicle = estimate?.vehicles.find((v) => v.id === selectedVehicleId) || estimate?.vehicles[0];

  const handleBookTaxi = () => {
    setBookingConfirmed(true);
    setDriverArrivalSec((selectedVehicle?.eta_pickup_minutes || 3) * 60);
    if (selectedVehicle && onBookTaxi) {
      onBookTaxi(selectedVehicle);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* En-tête Monochrome */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-black/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center shadow-md">
              <Car className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold tracking-tight text-white font-mono">
                  TARIFICATION TAXI GPS
                </h2>
                {estimate?.source === 'python_api' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-white border border-zinc-600 flex items-center gap-1">
                    <Server className="w-3 h-3 text-emerald-400" />
                    API PYTHON ACTIF
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-white" />
                    MOTEUR LOCAL AUTONOME
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Calcul en temps réel selon la distance, le trafic et la catégorie du véhicule
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

        {/* Corps Principal */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          
          {/* Résumé du Trajet & Sélecteur de Paramètres Réalistes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
            <div>
              <div className="text-[10px] font-mono uppercase text-zinc-400">DISTANCE TOTALE</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                {estimate?.distance_km ?? route?.distanceKm?.toFixed(1) ?? '--'} km
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-zinc-400">DURÉE ESTIMÉE TRAJET</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                {estimate?.duration_minutes ?? Math.round(route?.durationMinutes ?? 0)} min
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-zinc-400">DENSITÉ DU TRAFIC DYNAMIQUE</span>
                <span className="text-[11px] font-mono font-bold text-white">x{currentOptions.trafficDensity.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <button
                  onClick={() => onUpdateOptions({ ...currentOptions, trafficDensity: 1.0 })}
                  className={`flex-1 px-1.5 py-1 text-[11px] font-mono rounded border transition-all ${
                    currentOptions.trafficDensity < 1.25
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  Fluide
                </button>
                <button
                  onClick={() => onUpdateOptions({ ...currentOptions, trafficDensity: 1.55 })}
                  className={`flex-1 px-1.5 py-1 text-[11px] font-mono rounded border transition-all ${
                    currentOptions.trafficDensity >= 1.25 && currentOptions.trafficDensity < 1.9
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  Dense
                </button>
                <button
                  onClick={() => onUpdateOptions({ ...currentOptions, trafficDensity: 2.3 })}
                  className={`flex-1 px-1.5 py-1 text-[11px] font-mono rounded border transition-all ${
                    currentOptions.trafficDensity >= 1.9
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  Bouchons
                </button>
              </div>
            </div>
          </div>

          {/* Filtres Heure de Pointe & Tarif Nuit */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onUpdateOptions({ ...currentOptions, isNight: !currentOptions.isNight })}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-2 ${
                currentOptions.isNight
                  ? 'bg-zinc-100 text-black border-white font-bold shadow'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500'
              }`}
            >
              <span>TARIF NUIT / DIMANCHE (+20%)</span>
              <span className={`w-2 h-2 rounded-full ${currentOptions.isNight ? 'bg-black' : 'bg-zinc-600'}`} />
            </button>

            <button
              onClick={() => onUpdateOptions({ ...currentOptions, isRushHour: !currentOptions.isRushHour })}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-2 ${
                currentOptions.isRushHour
                  ? 'bg-zinc-100 text-black border-white font-bold shadow'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500'
              }`}
            >
              <span>HEURE DE POINTE (+15%)</span>
              <span className={`w-2 h-2 rounded-full ${currentOptions.isRushHour ? 'bg-black' : 'bg-zinc-600'}`} />
            </button>
          </div>

          {/* Grille des Véhicules */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              VÉHICULES DISPONIBLES & TARIFS ESTIMATIFS
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {estimate?.vehicles.map((v) => {
                const isSelected = v.id === selectedVehicleId;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVehicleId(v.id)}
                    className={`relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-zinc-900 border-white ring-1 ring-white/60 shadow-xl'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-white tracking-tight">{v.name}</h4>
                          <span className="text-[11px] font-mono text-zinc-400">{v.category}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-mono font-bold text-white">
                            {v.estimated_total.toFixed(2)}€
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400">
                            {v.estimated_range_min.toFixed(0)}€ - {v.estimated_range_max.toFixed(0)}€
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                        {v.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-300">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1" title={`${v.capacity_passengers} passagers`}>
                          <Users className="w-3.5 h-3.5 text-zinc-400" />
                          {v.capacity_passengers}
                        </span>
                        <span className="flex items-center gap-1" title={`${v.capacity_luggage} bagages`}>
                          <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                          {v.capacity_luggage}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-white font-semibold">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Arrivée {v.eta_pickup_minutes} min</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Détail Transparent du Calcul pour le Véhicule Sélectionné */}
          {selectedVehicle && (
            <div className="p-4 bg-black border border-zinc-800 rounded-xl space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400 uppercase font-semibold">
                  Détail du barème légal : {selectedVehicle.name}
                </span>
                <span className="text-white font-bold">
                  Total : {selectedVehicle.estimated_total.toFixed(2)} € TTC
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-zinc-300">
                <div>
                  <div className="text-zinc-400 text-[10px]">PRISE EN CHARGE</div>
                  <div className="text-sm font-bold text-white">{selectedVehicle.base_fare.toFixed(2)} €</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-[10px]">PRIX KILOMÉTRIQUE</div>
                  <div className="text-sm font-bold text-white">{selectedVehicle.per_km_rate.toFixed(2)} € / km</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-[10px]">PRIX MINUTE TRAFIC</div>
                  <div className="text-sm font-bold text-white">{selectedVehicle.per_min_rate.toFixed(2)} € / min</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-[10px]">MULTIPLICATEUR SURGE</div>
                  <div className="text-sm font-bold text-white">x{selectedVehicle.surge_multiplier.toFixed(2)}</div>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-1">
                <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>
                  Ce calcul applique la formule officielle : Prise en charge + (Distance × Tarif/km) + (Durée × Tarif/min × Trafic).
                </span>
              </div>
            </div>
          )}

          {/* Notification de Réservation Confirmée */}
          {bookingConfirmed && (
            <div className="p-4 bg-zinc-900 border border-white rounded-xl flex items-center justify-between gap-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    Chauffeur en route ({selectedVehicle?.name})
                  </div>
                  <div className="text-xs text-zinc-300 font-mono mt-0.5">
                    Véhicule : Berline Noire • Plaque : AA-742-NK • Arrivée dans ~{selectedVehicle?.eta_pickup_minutes} min
                  </div>
                </div>
              </div>

              <button
                onClick={() => setBookingConfirmed(false)}
                className="px-3 py-1.5 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-600"
              >
                Annuler
              </button>
            </div>
          )}

        </div>

        {/* Pied de Page d'Action */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-black/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-zinc-400 font-mono">
            {route ? (
              <span>Itinéraire : {route.distanceKm.toFixed(1)} km • {Math.round(route.durationMinutes)} min</span>
            ) : (
              <span>Sélectionnez un itinéraire pour calculer le tarif exact</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white text-xs font-mono transition-all"
            >
              Fermer
            </button>

            <button
              onClick={handleBookTaxi}
              disabled={bookingConfirmed}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                bookingConfirmed
                  ? 'bg-zinc-800 text-zinc-400 border border-zinc-700 cursor-not-allowed'
                  : 'bg-white hover:bg-zinc-200 text-black shadow-xl shadow-white/10 active:scale-95'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>{bookingConfirmed ? 'Course Commandée' : `Commander (${selectedVehicle?.estimated_total.toFixed(2)}€)`}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
