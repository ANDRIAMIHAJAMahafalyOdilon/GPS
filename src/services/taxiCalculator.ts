import { TaxiEstimateResponse, VehicleTariff, GpsCoordinate } from '../types/gps';

// Optional FastAPI endpoint. Without it, use the local calculator without network noise.
const PYTHON_BACKEND_URL = import.meta.env.VITE_TAXI_BACKEND_URL?.replace(/\/+$/, '');
let backendRetryAfter = 0;

export const POPULAR_LOCATIONS: { name: string; category: string; coords: GpsCoordinate }[] = [
  {
    name: 'Tour Eiffel',
    category: 'Monument',
    coords: { lat: 48.8584, lng: 2.2945, address: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris' }
  },
  {
    name: 'Musée du Louvre',
    category: 'Culture',
    coords: { lat: 48.8606, lng: 2.3376, address: 'Rue de Rivoli, 75001 Paris' }
  },
  {
    name: 'Aéroport Charles de Gaulle (CDG)',
    category: 'Aéroport',
    coords: { lat: 49.0097, lng: 2.5479, address: '95700 Roissy-en-France' }
  },
  {
    name: 'Gare de Lyon',
    category: 'Transport',
    coords: { lat: 48.8449, lng: 2.3734, address: 'Place Louis-Armand, 75012 Paris' }
  },
  {
    name: 'Arc de Triomphe',
    category: 'Monument',
    coords: { lat: 48.8738, lng: 2.2950, address: 'Place Charles de Gaulle, 75008 Paris' }
  },
  {
    name: 'La Défense (Gratte-ciels 3D)',
    category: 'Affaires & 3D',
    coords: { lat: 48.8924, lng: 2.2361, address: 'Parvis de la Défense, 92800 Puteaux' }
  },
  {
    name: 'Opéra Garnier',
    category: 'Théâtre',
    coords: { lat: 48.8719, lng: 2.3316, address: 'Pl. de l\'Opéra, 75009 Paris' }
  }
];

const DEFAULT_VEHICLES_CONFIG = [
  {
    id: 'noir_standard',
    name: 'Noir Standard',
    category: 'Berline Confort',
    base_fare: 3.50,
    per_km_rate: 1.45,
    per_min_rate: 0.35,
    min_fare: 8.00,
    capacity_passengers: 4,
    capacity_luggage: 3,
    eta_pickup_minutes: 3,
    description: 'Taxi berline moderne, propre et silencieux. Chauffeur professionnel certifié.'
  },
  {
    id: 'noir_prestige',
    name: 'Noir Prestige VIP',
    category: 'Berline Luxe & Élite',
    base_fare: 6.00,
    per_km_rate: 2.20,
    per_min_rate: 0.55,
    min_fare: 15.00,
    capacity_passengers: 4,
    capacity_luggage: 4,
    eta_pickup_minutes: 5,
    description: 'Mercedes Classe E ou BMW Série 5. Vitres teintées, bouteille d\'eau et chargeurs à bord.'
  },
  {
    id: 'noir_eco',
    name: 'Noir Eco 100% Électrique',
    category: 'Hybride & Zéro Émission',
    base_fare: 3.00,
    per_km_rate: 1.30,
    per_min_rate: 0.30,
    min_fare: 7.50,
    capacity_passengers: 4,
    capacity_luggage: 2,
    eta_pickup_minutes: 4,
    description: 'Véhicule silencieux à faible impact carbone pour un trajet propre en ville.'
  },
  {
    id: 'noir_van',
    name: 'Noir Van XL',
    category: 'Grand Volume (6-7 places)',
    base_fare: 7.00,
    per_km_rate: 2.60,
    per_min_rate: 0.60,
    min_fare: 20.00,
    capacity_passengers: 7,
    capacity_luggage: 8,
    eta_pickup_minutes: 7,
    description: 'Van spacieux adapté aux familles, groupes professionnels et gros bagages d\'aéroport.'
  },
  {
    id: 'noir_moto',
    name: 'Noir Moto Express',
    category: 'Moto-Taxi Rapide',
    base_fare: 10.00,
    per_km_rate: 2.80,
    per_min_rate: 0.40,
    min_fare: 25.00,
    capacity_passengers: 1,
    capacity_luggage: 1,
    eta_pickup_minutes: 2,
    description: 'Maxi scooter / Goldwing avec équipement pluie fourni. Échappez aux bouchons parisiens.'
  }
];

export async function calculateTaxiFare(
  distanceKm: number,
  durationMinutes: number,
  options: {
    trafficDensity?: number;
    isNight?: boolean;
    isRushHour?: boolean;
  } = {}
): Promise<TaxiEstimateResponse> {
  const { trafficDensity = 1.0, isNight = false, isRushHour = false } = options;

  // 1. Call the Python API only when explicitly configured.
  if (PYTHON_BACKEND_URL && Date.now() >= backendRetryAfter) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    try {
      const response = await fetch(`${PYTHON_BACKEND_URL}/api/taxi/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distance_km: distanceKm,
          duration_minutes: durationMinutes,
          traffic_density: trafficDensity,
          is_night: isNight,
          is_rush_hour: isRushHour,
        }),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        backendRetryAfter = 0;
        return { ...data, source: 'python_api' };
      }
      backendRetryAfter = Date.now() + 30_000;
    } catch {
      // Keep calculating locally and pause retries while the optional API is offline.
      backendRetryAfter = Date.now() + 30_000;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // 2. Calcul client miroir (moteur autonome)
  let multiplier = trafficDensity;
  if (isNight) multiplier *= 1.20;
  if (isRushHour) multiplier *= 1.15;

  const vehicles: VehicleTariff[] = DEFAULT_VEHICLES_CONFIG.map((v) => {
    const distanceCost = distanceKm * v.per_km_rate;
    const timeCost = durationMinutes * v.per_min_rate * multiplier;
    const rawPrice = v.base_fare + distanceCost + timeCost;
    const finalPrice = Math.max(rawPrice, v.min_fare);

    return {
      id: v.id,
      name: v.name,
      category: v.category,
      base_fare: v.base_fare,
      per_km_rate: v.per_km_rate,
      per_min_rate: v.per_min_rate,
      min_fare: v.min_fare,
      surge_multiplier: Math.round(multiplier * 100) / 100,
      estimated_total: Math.round(finalPrice * 100) / 100,
      estimated_range_min: Math.round(finalPrice * 0.95 * 100) / 100,
      estimated_range_max: Math.round(finalPrice * 1.15 * 100) / 100,
      capacity_passengers: v.capacity_passengers,
      capacity_luggage: v.capacity_luggage,
      eta_pickup_minutes: v.eta_pickup_minutes,
      description: v.description,
    };
  });

  return {
    distance_km: Math.round(distanceKm * 100) / 100,
    duration_minutes: Math.round(durationMinutes * 10) / 10,
    traffic_factor: Math.round(multiplier * 100) / 100,
    is_night_tariff: isNight,
    currency: 'EUR (€)',
    vehicles,
    calculated_at: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    source: 'client_engine',
  };
}

// Distance géodésique Haversine (km)
export function getHaversineDistanceKm(p1: GpsCoordinate, p2: GpsCoordinate): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calcule le cap (heading en degrés de 0 à 360) entre deux points
export function calculateBearingDeg(start: GpsCoordinate, end: GpsCoordinate): number {
  const lat1 = (start.lat * Math.PI) / 180;
  const lat2 = (end.lat * Math.PI) / 180;
  const dLng = ((end.lng - start.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}
