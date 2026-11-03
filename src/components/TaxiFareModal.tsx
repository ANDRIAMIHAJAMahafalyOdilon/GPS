import React, { useEffect, useState } from 'react';
import { RouteData, VehicleTariff } from '../types/gps';
import { formatMoney } from '../services/currency';
import { Car, CheckCircle2, X } from 'lucide-react';

interface TaxiFareModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: RouteData | null;
  currencyCode: string;
  currencyRate: number;
  customPricePerKm: number;
  customBasePrice: number;
  transportMode: 'route' | 'taxi' | 'rental';
  onCustomPricesChange: (perKm: number, base: number) => void;
  onBookTaxi?: (vehicle: VehicleTariff) => void;
}

export function TaxiFareModal({
  isOpen,
  onClose,
  route,
  currencyCode,
  currencyRate,
  customPricePerKm,
  customBasePrice,
  transportMode,
  onCustomPricesChange,
  onBookTaxi,
}: TaxiFareModalProps) {
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const distanceKm = route?.distanceKm ?? 0;
  const safeRate = Number.isFinite(currencyRate) && currencyRate > 0 ? currencyRate : 1;
  const customTotal = customBasePrice + distanceKm * customPricePerKm;
  const customTotalEur = customTotal / safeRate;

  useEffect(() => {
    if (isOpen) setBookingConfirmed(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedTariff: VehicleTariff = {
    id: 'custom_tariff',
    name: transportMode === 'rental' ? 'Location (tarif personnalisé)' : transportMode === 'taxi' ? 'Taxi (tarif personnalisé)' : 'Trajet (tarif personnalisé)',
    category: 'Personnalisé',
    base_fare: customBasePrice / safeRate,
    per_km_rate: customPricePerKm / safeRate,
    per_min_rate: 0,
    min_fare: 0,
    surge_multiplier: 1,
    estimated_total: customTotalEur,
    estimated_range_min: customTotalEur,
    estimated_range_max: customTotalEur,
    capacity_passengers: 1,
    capacity_luggage: 0,
    eta_pickup_minutes: 0,
    description: 'Tarif défini manuellement.',
  };

  const handleSaveFare = () => {
    if (!route) return;
    setBookingConfirmed(true);
    onBookTaxi?.(selectedTariff);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-black/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center shadow-md">
              <Car className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white font-mono">
                {transportMode === 'rental' ? 'MON TARIF DE LOCATION' : transportMode === 'taxi' ? 'MON TARIF TAXI' : 'MON TARIF DE TRAJET'}
              </h2>
              <p className="text-xs text-zinc-400">Saisis tes prix : ils sont utilisés directement pour ce trajet.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-white text-zinc-400 hover:text-white flex items-center justify-center transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <section className="p-4 bg-zinc-900/60 border border-zinc-700 rounded-xl space-y-4">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase text-white">Définir mon tarif</h3>
              <p className="text-[11px] text-zinc-400 mt-1">La devise suit le pays détecté. Tes prix restent enregistrés pour les prochains trajets.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-[10px] font-mono text-zinc-400">PRIX PAR KILOMÈTRE ({currencyCode}/km)
                <input type="number" min="0" step="0.01" value={customPricePerKm} onChange={(event) => onCustomPricesChange(Math.max(0, Number(event.target.value) || 0), customBasePrice)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-white" />
              </label>
              <label className="text-[10px] font-mono text-zinc-400">FRAIS DE DÉPART ({currencyCode})
                <input type="number" min="0" step="0.01" value={customBasePrice} onChange={(event) => onCustomPricesChange(customPricePerKm, Math.max(0, Number(event.target.value) || 0))} className="mt-1 w-full rounded-lg border border-zinc-700 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-white" />
              </label>
            </div>
          </section>

          <section className="p-4 bg-black border border-zinc-800 rounded-xl space-y-3 font-mono">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] uppercase text-zinc-400">Distance du trajet</span>
              <span className="text-sm font-bold text-white">{route ? `${distanceKm.toFixed(1)} km` : 'Choisis une arrivée'}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-zinc-800 pt-3">
              <span className="text-[10px] uppercase text-zinc-400">Calcul</span>
              <span className="text-xs text-zinc-300">{customBasePrice.toFixed(2)} + {distanceKm.toFixed(1)} × {customPricePerKm.toFixed(2)} {currencyCode}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-zinc-800 pt-3">
              <span className="text-xs uppercase font-bold text-zinc-300">Mon total</span>
              <span className="text-2xl font-bold text-white">{formatMoney(customTotal, currencyCode, 1)}</span>
            </div>
          </section>

          {bookingConfirmed && (
            <div className="p-4 bg-zinc-900 border border-white rounded-xl flex items-center gap-3 animate-in fade-in duration-300">
              <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">Tarif personnalisé enregistré</div>
                <div className="text-xs text-zinc-300">{formatMoney(customTotal, currencyCode, 1)} pour {distanceKm.toFixed(1)} km</div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-zinc-800 bg-black/90 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-400 font-mono">{route ? `${distanceKm.toFixed(1)} km · ${Math.round(route.durationMinutes)} min` : 'Ajoute une destination pour calculer le total'}</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white text-xs font-mono">Fermer</button>
            <button onClick={handleSaveFare} disabled={!route || bookingConfirmed} className="px-4 py-2.5 rounded-lg bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-black disabled:cursor-not-allowed text-xs font-mono font-bold transition-all">
              {transportMode === 'taxi' ? 'Enregistrer le tarif' : 'Valider mon tarif'} · {formatMoney(customTotal, currencyCode, 1)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
