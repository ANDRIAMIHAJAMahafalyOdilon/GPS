import React, { useState, useEffect, useRef, useCallback } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { 
  GpsCoordinate, 
  RouteData, 
  GpsTelemetry, 
  TaxiEstimateResponse, 
  TrafficState, 
  TripHistoryItem,
  VehicleTariff 
} from './types/gps';
import { MapContainer } from './components/MapContainer';
import { GpsHud } from './components/GpsHud';
import { RouteSelector } from './components/RouteSelector';
import { TaxiFareModal } from './components/TaxiFareModal';
import { SimulationControls } from './components/SimulationControls';
import { TrafficWidget } from './components/TrafficWidget';
import { TripHistoryDrawer } from './components/TripHistoryDrawer';
import { calculateTaxiFare, calculateBearingDeg, getHaversineDistanceKm } from './services/taxiCalculator';
import { currencyForCountry, getEuroExchangeRate } from './services/currency';
import { 
  getTrafficLevel, 
  getTrafficLabel, 
  getSpeedFactor, 
  computeNextRandomDensity 
} from './services/trafficSimulator';
import { Car, CheckCircle2, Activity, History, Navigation, Radio } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBvNMKwP5RiP7-I54lgSqAP8zkLel2J4ZU';
const LOCAL_STORAGE_HISTORY_KEY = 'noir_gps_trips_history';
const TOTAL_DISTANCE_KEY = 'noir_gps_total_distance_km';

const INITIAL_ORIGIN: GpsCoordinate = {
  lat: 48.8566,
  lng: 2.3522,
  address: 'Recherche de votre position GPS...',
};

// Exemples de trajets initiaux pour le localStorage
const INITIAL_DEMO_TRIPS: TripHistoryItem[] = [
  {
    id: 'trip-demo-1',
    origin: { lat: 48.8584, lng: 2.3470, address: 'Place du Châtelet, 75001 Paris' },
    destination: { lat: 48.8584, lng: 2.2945, address: 'Tour Eiffel, 75007 Paris' },
    distanceKm: 5.4,
    durationMinutes: 16.5,
    finalCostEur: 18.20,
    vehicleName: 'Noir Standard',
    trafficDensity: 1.25,
    completedAt: 'Aujourd\'hui à 14:32',
  },
  {
    id: 'trip-demo-2',
    origin: { lat: 48.8606, lng: 2.3376, address: 'Musée du Louvre, 75001 Paris' },
    destination: { lat: 48.8738, lng: 2.2950, address: 'Arc de Triomphe, 75008 Paris' },
    distanceKm: 4.8,
    durationMinutes: 14.0,
    finalCostEur: 23.50,
    vehicleName: 'Noir Prestige VIP',
    trafficDensity: 1.40,
    completedAt: 'Hier à 19:15',
  }
];

export default function App() {
  const [origin, setOrigin] = useState<GpsCoordinate>(INITIAL_ORIGIN);
  const [isOriginCustom, setIsOriginCustom] = useState(false);
  const [currencyCode, setCurrencyCode] = useState(() => localStorage.getItem('noir_gps_currency') || 'EUR');
  const [currencyRate, setCurrencyRate] = useState(1);
  const [transportMode, setTransportMode] = useState<'route' | 'taxi' | 'rental'>('route');
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [customPricePerKm, setCustomPricePerKm] = useState(() => Number(localStorage.getItem('noir_gps_price_per_km') || 1.45));
  const [customBasePrice, setCustomBasePrice] = useState(() => Number(localStorage.getItem('noir_gps_base_price') || 3.5));
  const [totalDistanceKm, setTotalDistanceKm] = useState(() => Number(localStorage.getItem(TOTAL_DISTANCE_KEY) || 0));
  const hasSavedCustomPricesRef = useRef(Boolean(localStorage.getItem('noir_gps_price_per_km')));
  const [destination, setDestination] = useState<GpsCoordinate | null>(null);
  const [waypoints, setWaypoints] = useState<GpsCoordinate[]>([]);
  const [currentVehiclePos, setCurrentVehiclePos] = useState<GpsCoordinate>(INITIAL_ORIGIN);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const lastGpsPositionRef = useRef<GpsCoordinate | null>(null);
  const isOriginCustomRef = useRef(false);
  const isSimulatingRef = useRef<boolean>(false);
  const tripDistanceCountedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void getEuroExchangeRate(currencyCode).then((rate) => {
      if (!cancelled && rate !== null) {
        setCurrencyRate(rate);
        if (!hasSavedCustomPricesRef.current) {
          setCustomPricePerKm(1.45 * rate);
          setCustomBasePrice(3.5 * rate);
        }
      }
    });
    return () => { cancelled = true; };
  }, [currencyCode]);

  const handleCurrentCountryResolved = useCallback((countryCode: string) => {
    const nextCurrency = currencyForCountry(countryCode);
    setCurrencyCode((current) => {
      if (current === nextCurrency) return current;
      localStorage.setItem('noir_gps_currency', nextCurrency);
      return nextCurrency;
    });
  }, []);

  const handleCustomPricesChange = (perKm: number, base: number) => {
    hasSavedCustomPricesRef.current = true;
    const safePerKm = Math.max(0, perKm);
    const safeBase = Math.max(0, base);
    setCustomPricePerKm(safePerKm);
    setCustomBasePrice(safeBase);
    localStorage.setItem('noir_gps_price_per_km', String(safePerKm));
    localStorage.setItem('noir_gps_base_price', String(safeBase));
  };

  // État Global du Trafic en Temps Réel
  const [traffic, setTraffic] = useState<TrafficState>({
    density: 1.15,
    level: 'fluid',
    label: 'Fluide (Index 1.15x)',
    speedFactor: 1.0,
    delayMinutes: 0,
    autoSimulate: true,
    lastIncident: 'Circulation dégagée en temps réel sur l\'axe principal',
  });
  const [isTrafficWidgetOpen, setIsTrafficWidgetOpen] = useState<boolean>(false);

  // Historique des 5 derniers trajets (localStorage)
  const [tripsHistory, setTripsHistory] = useState<TripHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 5);
        }
      }
    } catch (e) {
      console.warn('Lecture du localStorage échouée:', e);
    }
    return INITIAL_DEMO_TRIPS;
  });
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
  
  // Télémétrie GPS en temps réel
  const [telemetry, setTelemetry] = useState<GpsTelemetry>({
    speedKmh: 0,
    headingDeg: 0,
    altitudeM: 0,
    accuracyM: 0,
    satellites: 0,
    currentStreet: 'Recherche de votre position GPS...',
    isSimulating: false,
    activeStepIndex: 0,
  });

  // Mode 3D / Perspective Immeubles
  const [is3DMode, setIs3DMode] = useState<boolean>(true);

  // État de placement sur la carte
  const [activeTargetMode, setActiveTargetMode] = useState<'none' | 'set_origin' | 'set_destination' | 'set_waypoint'>('none');

  // Modales
  const [isTaxiModalOpen, setIsTaxiModalOpen] = useState<boolean>(false);

  // Options Tarifaires Taxi (synchronisées avec la densité de trafic globale)
  const [taxiOptions, setTaxiOptions] = useState({
    trafficDensity: 1.15,
    isNight: false,
    isRushHour: false,
  });
  const [taxiEstimate, setTaxiEstimate] = useState<TaxiEstimateResponse | null>(null);

  // Simulation GPS
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState<number>(2);
  const [currentPathIndex, setCurrentPathIndex] = useState<number>(0);
  const [hasArrived, setHasArrived] = useState<boolean>(false);

  // Quota handling selon Section 8 du skill Google Maps
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setQuotaExceeded(true);
    };
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  useEffect(() => {
    isSimulatingRef.current = isSimulating;
  }, [isSimulating]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLocating(false);
      setLocationError('La géolocalisation n’est pas disponible sur cet appareil.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;
        const nextPosition: GpsCoordinate = { lat: latitude, lng: longitude };
        const previousPosition = lastGpsPositionRef.current;
        const nextHeading =
          heading !== null && Number.isFinite(heading) && heading >= 0
            ? heading
            : previousPosition
            ? calculateBearingDeg(previousPosition, nextPosition)
            : 0;

        lastGpsPositionRef.current = nextPosition;

        if (!isSimulatingRef.current) {
          if (!isOriginCustomRef.current) setOrigin((prev) => {
            const movedMeters = getHaversineDistanceKm(prev, nextPosition) * 1000;
            if (movedMeters < 15 && !prev.address?.startsWith('Recherche')) return prev;
            return { lat: latitude, lng: longitude, address: prev.address?.startsWith('Recherche') ? 'Ma position actuelle' : prev.address };
          });
          setCurrentVehiclePos({ lat: latitude, lng: longitude });
          setTelemetry((prev) => ({
            ...prev,
            speedKmh: speed !== null && Number.isFinite(speed) ? Math.max(0, speed * 3.6) : 0,
            headingDeg: nextHeading,
            altitudeM: altitude ?? prev.altitudeM,
            accuracyM: accuracy ?? prev.accuracyM,
            isSimulating: false,
          }));
        }

        setIsLocating(false);
        setLocationError(null);
      },
      (error) => {
        setIsLocating(false);
        const messages: Record<number, string> = {
          1: 'Accès à votre position refusé. Autorisez la géolocalisation dans le navigateur.',
          2: 'Votre position est momentanément indisponible. Vérifiez le GPS de l’appareil.',
          3: 'La localisation GPS a expiré. Réessayez dans un instant.',
        };
        setLocationError(messages[error.code] ?? 'Impossible de récupérer votre position GPS.');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Sauvegarde d'un trajet dans le localStorage (max 5 trajets)
  const saveTripToHistory = useCallback((customTrip?: { finalCostEur?: number; vehicleName?: string }) => {
    if (!route) return;

    const defaultVehicle = taxiEstimate?.vehicles[0];
    const customTotalLocal = customBasePrice + (route.distanceKm * customPricePerKm);
    const modeCostEur = transportMode === 'route'
      ? 0
      : transportMode === 'rental'
        ? customTotalLocal / currencyRate
        : customTotalLocal / currencyRate;
    const finalCost = customTrip?.finalCostEur ?? (transportMode === 'route' ? 0 : modeCostEur || defaultVehicle?.estimated_total || 18.0);
    const vehicleName = customTrip?.vehicleName ?? (transportMode === 'taxi' ? 'Taxi (tarif personnalisé)' : transportMode === 'rental' ? 'Voiture de location' : 'Voiture / itinéraire');

    const now = new Date();
    const timeStr = `Aujourd'hui à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

    const newTrip: TripHistoryItem = {
      id: `trip-${Date.now()}`,
      origin: route.origin,
      destination: route.destination,
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes + traffic.delayMinutes,
      finalCostEur: Math.round(finalCost * 100) / 100,
      vehicleName,
      trafficDensity: traffic.density,
      completedAt: timeStr,
    };

    setTripsHistory((prev) => {
      const updated = [newTrip, ...prev.filter((t) => t.id !== newTrip.id)].slice(0, 5);
      try {
        localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Erreur écriture localStorage:', err);
      }
      return updated;
    });
  }, [route, taxiEstimate, traffic, customBasePrice, customPricePerKm, transportMode, currencyRate]);

  // Vider l'historique
  const handleClearHistory = () => {
    setTripsHistory([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
    } catch (e) {
      console.warn('Erreur nettoyage localStorage:', e);
    }
  };

  // Supprimer un élément d'historique
  const handleDeleteTrip = (id: string) => {
    setTripsHistory((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      try {
        localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Erreur suppression localStorage:', e);
      }
      return updated;
    });
  };

  // Recharger un trajet depuis l'historique
  const handleSelectTrip = (item: TripHistoryItem) => {
    setDestination(item.destination);
    handleResetSimulate();
    setIsHistoryDrawerOpen(false);
  };

  // Service de simulation de trafic aléatoire continu (toutes les 4.5 secondes)
  useEffect(() => {
    if (!traffic.autoSimulate) return;

    const trafficInterval = setInterval(() => {
      setTraffic((prev) => {
        const { nextDensity, incidentNotice } = computeNextRandomDensity(prev.density);
        const level = getTrafficLevel(nextDensity);
        const label = getTrafficLabel(nextDensity);
        const speedFactor = getSpeedFactor(nextDensity);
        const delayMinutes = route ? Math.round(route.durationMinutes * (nextDensity - 1.0) * 10) / 10 : 0;

        return {
          ...prev,
          density: nextDensity,
          level,
          label,
          speedFactor,
          delayMinutes: Math.max(0, delayMinutes),
          lastIncident: incidentNotice || prev.lastIncident,
        };
      });
    }, 4500);

    return () => clearInterval(trafficInterval);
  }, [traffic.autoSimulate, route]);

  // Synchronisation de la densité de trafic avec le calculateur taxi
  useEffect(() => {
    setTaxiOptions((prev) => ({
      ...prev,
      trafficDensity: traffic.density,
    }));
  }, [traffic.density]);

  // Calcul du prix taxi dès que l'itinéraire ou la densité de trafic change
  useEffect(() => {
    if (!route) {
      setTaxiEstimate(null);
      return;
    }
    let isCancelled = false;
    calculateTaxiFare(route.distanceKm, route.durationMinutes, taxiOptions).then((res) => {
      if (!isCancelled) {
        setTaxiEstimate(res);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [route, taxiOptions]);

  // Boucle de simulation GPS virage par virage en temps réel avec adaptation dynamique de la vitesse
  useEffect(() => {
    if (!isSimulating || !route || route.path.length === 0) {
      if (!isSimulating) {
        setTelemetry((prev) => ({ ...prev, speedKmh: 0, isSimulating: false }));
      }
      return;
    }

    const intervalTime = 300 / simSpeedMultiplier;

    const timer = setInterval(() => {
      setCurrentPathIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= route.path.length) {
          // Arrivée à destination
          setIsSimulating(false);
          setHasArrived(true);
          setTelemetry((prev) => ({
            ...prev,
            speedKmh: 0,
            isSimulating: false,
          }));
          
          if (!tripDistanceCountedRef.current) {
            tripDistanceCountedRef.current = true;
            setTotalDistanceKm((previous) => {
              const total = previous + route.distanceKm;
              localStorage.setItem(TOTAL_DISTANCE_KEY, String(total));
              return total;
            });
          }

          // Enregistrement automatique du trajet dans le localStorage
          saveTripToHistory();
          return prevIndex;
        }

        const currentPt = route.path[prevIndex];
        const nextPt = route.path[nextIndex];
        const bearing = calculateBearingDeg(currentPt, nextPt);

        // Vitesse de base modifiée dynamiquement par le paramètre 'densité du trafic'
        const baseSpeed = 48 + Math.sin(nextIndex * 0.4) * 8;
        // Si densité élevée -> forte décélération (ex: 8-15 km/h en bouchon sévère)
        const currentSpeed = Math.min(Math.max(baseSpeed * traffic.speedFactor, 6), 68);

        // Recherche de l'étape active
        let stepIdx = 0;
        if (route.steps && route.steps.length > 0) {
          const ratio = nextIndex / route.path.length;
          stepIdx = Math.min(
            Math.floor(ratio * route.steps.length),
            route.steps.length - 1
          );
        }

        setCurrentVehiclePos(nextPt);
        setTelemetry((prev) => ({
          ...prev,
          speedKmh: currentSpeed,
          headingDeg: bearing,
          isSimulating: true,
          activeStepIndex: stepIdx,
          trafficDensity: traffic.density,
          trafficLevel: traffic.level,
        }));

        return nextIndex;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isSimulating, route, simSpeedMultiplier, traffic.speedFactor, traffic.density, traffic.level, saveTripToHistory]);

  // Contrôles manuels du trafic
  const handleToggleAutoSimulate = () => {
    setTraffic((prev) => ({ ...prev, autoSimulate: !prev.autoSimulate }));
  };

  const handleSetDensity = (density: number) => {
    const level = getTrafficLevel(density);
    const label = getTrafficLabel(density);
    const speedFactor = getSpeedFactor(density);
    const delayMinutes = route ? Math.round(route.durationMinutes * (density - 1.0) * 10) / 10 : 0;

    setTraffic((prev) => ({
      ...prev,
      density,
      level,
      label,
      speedFactor,
      delayMinutes: Math.max(0, delayMinutes),
    }));
  };

  const handleTriggerRandomSurge = () => {
    const { nextDensity, incidentNotice } = computeNextRandomDensity(traffic.density);
    handleSetDensity(nextDensity);
    if (incidentNotice) {
      setTraffic((prev) => ({ ...prev, lastIncident: incidentNotice }));
    }
  };

  const handleToggleSimulate = () => {
    if (hasArrived) {
      handleResetSimulate();
    }
    setIsSimulating(!isSimulating);
  };

  const handleResetSimulate = useCallback(() => {
    tripDistanceCountedRef.current = false;
    setIsSimulating(false);
    setHasArrived(false);
    setCurrentPathIndex(0);
    setCurrentVehiclePos(lastGpsPositionRef.current ?? origin);
    setTelemetry((prev) => ({
      ...prev,
      speedKmh: 0,
      isSimulating: false,
      activeStepIndex: 0,
    }));
  }, [origin]);

  const handleSetDestination = (coords: GpsCoordinate) => {
    tripDistanceCountedRef.current = false;
    setDestination(coords);
    setWaypoints([]);
    setActiveTargetMode('none');
    handleResetSimulate();
  };

  const handleAddWaypoint = useCallback((coords: GpsCoordinate) => {
    setWaypoints((current) => {
      if (current.some((point) => getHaversineDistanceKm(point, coords) < 0.03)) return current;
      return [...current, coords].slice(0, 25);
    });
    setActiveTargetMode('none');
    handleResetSimulate();
  }, [handleResetSimulate]);

  const handleMoveWaypoint = useCallback((index: number, coords: GpsCoordinate) => {
    setWaypoints((current) => current.map((point, pointIndex) => pointIndex === index ? { ...coords, address: 'Point de passage déplacé' } : point));
    handleResetSimulate();
  }, [handleResetSimulate]);

  const handleRemoveWaypoint = (index: number) => {
    setWaypoints((current) => current.filter((_, waypointIndex) => waypointIndex !== index));
    handleResetSimulate();
  };

  const handleSetOrigin = (coords: GpsCoordinate) => {
    tripDistanceCountedRef.current = false;
    isOriginCustomRef.current = true;
    setIsOriginCustom(true);
    setOrigin(coords);
    setActiveTargetMode('none');
    setIsSimulating(false);
    setHasArrived(false);
    setCurrentPathIndex(0);
    setTelemetry((prev) => ({ ...prev, speedKmh: 0, isSimulating: false, activeStepIndex: 0 }));
  };

  const handleUseMyLocationAsOrigin = () => {
    tripDistanceCountedRef.current = false;
    isOriginCustomRef.current = false;
    setIsOriginCustom(false);
    if (lastGpsPositionRef.current) {
      const gpsOrigin = { ...lastGpsPositionRef.current, address: 'Ma position actuelle' };
      setOrigin(gpsOrigin);
      setCurrentVehiclePos(gpsOrigin);
    }
    setActiveTargetMode('none');
    setIsSimulating(false);
    setHasArrived(false);
    setCurrentPathIndex(0);
  };

  const handleClearDestination = () => {
    setDestination(null);
    setWaypoints([]);
    setActiveTargetMode('none');
    handleResetSimulate();
  };

  const progressPercent = route && route.path.length > 0
    ? (currentPathIndex / (route.path.length - 1)) * 100
    : 0;

  // Calcul du surcoût lié au trafic sur le taxi
  const baseStandardRate = taxiEstimate?.vehicles[0]?.estimated_total || 0;
  const addedCostEur = Math.max(0, baseStandardRate * (1 - 1 / traffic.density));

  return (
    <div className="relative w-screen h-screen bg-black text-white overflow-hidden flex flex-col font-sans select-none">
      
      {/* ⚠️ Bannière officielle de Quota requise par le Skill Google Maps Platform */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Barre de Cockpit Supérieure / Status Bar */}
      <header className="relative z-40 h-14 bg-black/95 border-b border-zinc-800/90 px-3 sm:px-4 flex items-center justify-between shrink-0 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-mono font-bold text-sm tracking-tighter shadow-md shadow-white/10">
            N
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold font-mono tracking-tight text-white uppercase">
                NOIR GPS
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-mono uppercase bg-zinc-900 text-zinc-300 border border-zinc-700 rounded">
                Cockpit 3D
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono hidden lg:block">
              Navigation autonome • 3D Immeubles • Trafic & Historique
            </p>
          </div>
        </div>

        {/* Actions Rapides Header */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 font-mono" title="État du GPS et vitesse actuelle">
            <Radio className="w-3.5 h-3.5 text-white animate-pulse" />
            <span className="hidden sm:inline text-[10px] font-semibold text-white">GPS</span>
            <span className="text-[10px] sm:text-xs font-bold text-white tabular-nums">{Math.round(telemetry.speedKmh)}<span className="hidden lg:inline text-[9px] font-normal text-zinc-400"> KM/H</span></span>
            <span className="hidden lg:inline text-[9px] text-zinc-400">±{Math.round(telemetry.accuracyM)}M</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] font-mono text-zinc-300" title="Kilométrage cumulé de tous les trajets terminés">
            <Navigation className="w-3 h-3" />
            TOTAL {totalDistanceKm.toFixed(1)} km
          </div>

          <div className="relative">
            <button
              onClick={() => setIsModeMenuOpen((open) => !open)}
              aria-expanded={isModeMenuOpen}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${isModeMenuOpen ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-500'}`}
              title="Choisir le mode de trajet"
            >
              <Car className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">MODE</span>
              <span className="font-bold">{transportMode === 'route' ? 'ITINÉRAIRE' : transportMode === 'taxi' ? 'TAXI' : 'LOCATION'}</span>
            </button>
            {isModeMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-zinc-700 bg-zinc-950 p-1.5 shadow-2xl shadow-black z-[60]">
                {([
                  ['route', 'Itinéraire'],
                  ['taxi', 'Taxi'],
                  ['rental', 'Voiture de location'],
                ] as const).map(([mode, label]) => (
                  <button key={mode} onClick={() => { setTransportMode(mode); setIsModeMenuOpen(false); }} className={`w-full rounded-lg px-3 py-2 text-left text-xs font-mono transition-colors ${transportMode === mode ? 'bg-white text-black font-bold' : 'text-zinc-300 hover:bg-zinc-800'}`}>
                    {label}{transportMode === mode ? ' ✓' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Bouton Historique des 5 Derniers Trajets (localStorage) */}
          <button
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-200 hover:text-white text-xs font-mono transition-all shadow-sm"
            title="Afficher la liste des 5 derniers trajets enregistrés en localStorage"
          >
            <History className="w-3.5 h-3.5 text-white" />
            <span className="hidden md:inline">Trajets</span>
            <span className="px-1.5 py-0.2 bg-white text-black font-bold text-[10px] rounded-full">
              {tripsHistory.length}
            </span>
          </button>

          {/* Bouton Widget Trafic Dynamique */}
          <button
            onClick={() => setIsTrafficWidgetOpen(!isTrafficWidgetOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
              isTrafficWidgetOpen
                ? 'bg-white text-black border-white font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
            }`}
            title="Afficher le panneau de simulation de trafic en temps réel"
          >
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden md:inline">TRAFIC:</span>
            <span className="hidden sm:inline text-[10px]">{traffic.label.split(' ')[0]}</span>
            <span className="font-bold">{traffic.density.toFixed(2)}x</span>
          </button>

          {/* Tarifs et options */}
          <button
            onClick={() => setIsTaxiModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-mono font-bold tracking-tight transition-all shadow-md active:scale-95"
            title="Ouvrir les tarifs et options"
          >
            <Car className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Tarifs</span>
          </button>
        </div>
      </header>

      {/* Zone Cartographique & HUD */}
      <main className="relative flex-1 w-full h-[calc(100vh-3.5rem)] bg-black overflow-hidden">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          
          {/* Carte Principale Monochrome avec Bâtiments 3D et Tracé */}
          <MapContainer
            origin={origin}
            isOriginCustom={isOriginCustom}
            destination={destination}
            currentVehiclePos={currentVehiclePos}
            telemetry={telemetry}
            onRouteChange={setRoute}
            onVehiclePosChange={setCurrentVehiclePos}
            onTelemetryChange={setTelemetry}
            is3DMode={is3DMode}
            onToggle3DMode={() => setIs3DMode(!is3DMode)}
            activeTargetMode={activeTargetMode}
            waypoints={waypoints}
            onAddWaypoint={handleAddWaypoint}
            onMoveWaypoint={handleMoveWaypoint}
            onSetDestination={handleSetDestination}
            onSetOrigin={handleSetOrigin}
            onUseMyLocationAsOrigin={handleUseMyLocationAsOrigin}
            onCurrentCountryResolved={handleCurrentCountryResolved}
          />

          {/* HUD Supérieur (Vitesse ajustée par trafic, Virages, Satellites) */}
          <GpsHud
            route={route}
            telemetry={telemetry}
            traffic={traffic}
            isSimulating={isSimulating}
            onOpenTaxiPanel={() => setIsTaxiModalOpen(true)}
            taxiPriceEstimated={taxiEstimate?.vehicles[0]?.estimated_total}
            currencyCode={currencyCode}
            currencyRate={currencyRate}
          />

          {/* Sélecteur d'Itinéraire Flottant */}
          <RouteSelector
            origin={origin}
            originAddress={origin.address ?? `${origin.lat.toFixed(5)}, ${origin.lng.toFixed(5)}`}
            isOriginCustom={isOriginCustom}
            onSetOrigin={handleSetOrigin}
            onUseMyLocation={handleUseMyLocationAsOrigin}
            destination={destination}
            onSetDestination={handleSetDestination}
            onClearDestination={handleClearDestination}
            activeTargetMode={activeTargetMode}
            waypoints={waypoints}
            onAddWaypoint={handleAddWaypoint}
            onRemoveWaypoint={handleRemoveWaypoint}
            onSetActiveTargetMode={setActiveTargetMode}
            route={route}
            isLocating={isLocating}
            locationError={locationError}
          />

          {/* Panneau Flottant de Simulation de Trafic Dynamique (ouvrable depuis le header) */}
          {isTrafficWidgetOpen && (
            <div className="absolute top-18 md:top-20 right-3 md:right-16 z-30 pointer-events-auto animate-in fade-in slide-in-from-right-4 duration-200">
              <TrafficWidget
                traffic={traffic}
                onToggleAutoSimulate={handleToggleAutoSimulate}
                onSetDensity={handleSetDensity}
                onTriggerRandomSurge={handleTriggerRandomSurge}
                speedKmh={telemetry.speedKmh}
                addedCostEur={addedCostEur}
                currencyCode={currencyCode}
                currencyRate={currencyRate}
              />
            </div>
          )}

          {/* Commandes de Simulation de Trajet GPS */}
          <SimulationControls
            route={route}
            telemetry={telemetry}
            isSimulating={isSimulating}
            onToggleSimulate={handleToggleSimulate}
            onResetSimulate={handleResetSimulate}
            simSpeedMultiplier={simSpeedMultiplier}
            onSetSpeedMultiplier={setSimSpeedMultiplier}
            progressPercent={progressPercent}
          />

          {/* Tiroir Latéral des 5 Derniers Trajets (localStorage) */}
          <TripHistoryDrawer
            isOpen={isHistoryDrawerOpen}
            onClose={() => setIsHistoryDrawerOpen(false)}
            history={tripsHistory}
            onSelectTrip={handleSelectTrip}
            onClearHistory={handleClearHistory}
            onDeleteTrip={handleDeleteTrip}
            onSaveCurrentTrip={() => saveTripToHistory()}
            canSaveCurrent={Boolean(route)}
            currencyCode={currencyCode}
            currencyRate={currencyRate}
          />

          {/* Bannière d'Arrivée à Destination */}
          {hasArrived && (
            <div className="absolute top-28 left-1/2 -translate-x-1/2 z-40 bg-white text-black px-6 py-4 rounded-2xl shadow-2xl border-2 border-black flex items-center gap-4 animate-in zoom-in-95 duration-300">
              <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-mono font-bold text-sm tracking-tight">VOUS ÊTES ARRIVÉ À DESTINATION</h3>
                <p className="text-xs text-zinc-700 font-mono">
                  Trajet terminé : {route?.distanceKm.toFixed(1)} km • Enregistré dans l'historique local
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsHistoryDrawerOpen(true)}
                  className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-black rounded text-xs font-mono font-bold tracking-wide"
                >
                  Voir l'Historique
                </button>
                <button
                  onClick={() => setIsTaxiModalOpen(true)}
                  className="px-3 py-1.5 bg-black hover:bg-zinc-800 text-white rounded text-xs font-mono font-bold tracking-wide"
                >
                  Facture Taxi
                </button>
              </div>
            </div>
          )}

          {/* Modal Tarifs Taxi */}
          <TaxiFareModal
            isOpen={isTaxiModalOpen}
            onClose={() => setIsTaxiModalOpen(false)}
            route={route}
            currencyCode={currencyCode}
            currencyRate={currencyRate}
            customPricePerKm={customPricePerKm}
            customBasePrice={customBasePrice}
            transportMode={transportMode}
            onCustomPricesChange={handleCustomPricesChange}
            onBookTaxi={(vehicle) => {
              saveTripToHistory({
                finalCostEur: vehicle.estimated_total,
                vehicleName: vehicle.name,
              });
            }}
          />

        </APIProvider>
      </main>

    </div>
  );
}
