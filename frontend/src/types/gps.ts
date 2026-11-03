export interface GpsCoordinate {
  lat: number;
  lng: number;
  address?: string;
}

export interface TurnStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuver?: string;
  startLocation: GpsCoordinate;
  endLocation: GpsCoordinate;
}

export interface RouteData {
  distanceKm: number;
  durationMinutes: number;
  summary: string;
  steps: TurnStep[];
  path: GpsCoordinate[];
  origin: GpsCoordinate;
  destination: GpsCoordinate;
}

export interface VehicleTariff {
  id: string;
  name: string;
  category: string;
  base_fare: number;
  per_km_rate: number;
  per_min_rate: number;
  min_fare: number;
  surge_multiplier: number;
  estimated_total: number;
  estimated_range_min: number;
  estimated_range_max: number;
  capacity_passengers: number;
  capacity_luggage: number;
  eta_pickup_minutes: number;
  description: string;
}

export interface TaxiEstimateResponse {
  distance_km: number;
  duration_minutes: number;
  traffic_factor: number;
  is_night_tariff: boolean;
  currency: string;
  vehicles: VehicleTariff[];
  calculated_at: string;
  source: 'python_api' | 'client_engine';
}

export type TrafficLevel = 'fluid' | 'moderate' | 'dense' | 'jam';

export interface TrafficState {
  density: number; // 0.90 à 2.70
  level: TrafficLevel;
  label: string;
  speedFactor: number;
  delayMinutes: number;
  autoSimulate: boolean;
  lastIncident?: string;
}

export interface GpsTelemetry {
  speedKmh: number;
  headingDeg: number;
  altitudeM: number;
  accuracyM: number;
  satellites: number;
  currentStreet: string;
  isSimulating: boolean;
  activeStepIndex: number;
  trafficDensity?: number;
  trafficLevel?: TrafficLevel;
}

export interface TripHistoryItem {
  id: string;
  origin: GpsCoordinate;
  destination: GpsCoordinate;
  distanceKm: number;
  durationMinutes: number;
  finalCostEur: number;
  vehicleName: string;
  trafficDensity: number;
  completedAt: string;
}

