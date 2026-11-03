import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Map, useMap, useMapsLibrary, AdvancedMarker } from '@vis.gl/react-google-maps';
import { GpsCoordinate, RouteData, TurnStep, GpsTelemetry } from '../types/gps';
import { MONOCHROME_MAP_STYLES } from './MapStyles';
import { Navigation, Compass, Layers, Plus, Minus, RotateCw, MapPin, Flag, Eye } from 'lucide-react';
import { calculateBearingDeg, getHaversineDistanceKm } from '../services/taxiCalculator';

interface MapContainerProps {
  origin: GpsCoordinate;
  isOriginCustom: boolean;
  destination: GpsCoordinate | null;
  currentVehiclePos: GpsCoordinate;
  telemetry: GpsTelemetry;
  onRouteChange: (route: RouteData | null) => void;
  onVehiclePosChange: (pos: GpsCoordinate) => void;
  onTelemetryChange: React.Dispatch<React.SetStateAction<GpsTelemetry>>;
  is3DMode: boolean;
  onToggle3DMode: () => void;
  activeTargetMode: 'none' | 'set_origin' | 'set_destination' | 'set_waypoint';
  waypoints: GpsCoordinate[];
  onAddWaypoint: (coords: GpsCoordinate) => void;
  onMoveWaypoint: (index: number, coords: GpsCoordinate) => void;
  onSetOrigin: (coords: GpsCoordinate) => void;
  onUseMyLocationAsOrigin: () => void;
  onSetDestination: (coords: GpsCoordinate) => void;
  onCurrentCountryResolved?: (countryCode: string) => void;
}

export function MapContainer({
  origin,
  isOriginCustom,
  destination,
  currentVehiclePos,
  telemetry,
  onRouteChange,
  onVehiclePosChange,
  onTelemetryChange,
  is3DMode,
  onToggle3DMode,
  activeTargetMode,
  waypoints,
  onAddWaypoint,
  onMoveWaypoint,
  onSetOrigin,
  onUseMyLocationAsOrigin,
  onSetDestination,
  onCurrentCountryResolved,
}: MapContainerProps) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const geocodingLib = useMapsLibrary('geocoding');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const lastCountryPositionRef = useRef<GpsCoordinate | null>(null);
  const lastCountryRequestAtRef = useRef<number>(0);
  const geocoderUnavailableRef = useRef(false);
  const isSimulatingRef = useRef<boolean>(telemetry.isSimulating);

  useEffect(() => {
    isSimulatingRef.current = telemetry.isSimulating;
  }, [telemetry.isSimulating]);
  
  const [heading, setHeading] = useState<number>(0);
  const [tilt, setTilt] = useState<number>(is3DMode ? 60 : 0);
  const [zoom, setZoom] = useState<number>(16);

  // Synchronise le tilt lorsque le mode 3D change
  useEffect(() => {
    if (map) {
      const targetTilt = is3DMode ? 60 : 0;
      setTilt(targetTilt);
      map.setTilt(targetTilt);
      if (is3DMode) {
        // En 3D, le zoom est réglé pour faire ressortir les immeubles (bâtiments volumétriques)
        map.setZoom(Math.max(map.getZoom() || 16, 17));
      }
    }
  }, [is3DMode, map]);

  useEffect(() => {
    if (geocodingLib && !geocoderRef.current) {
      geocoderRef.current = new geocodingLib.Geocoder();
    }
  }, [geocodingLib]);

  useEffect(() => {
    const geocoder = geocoderRef.current;
    if (!geocoder || !onCurrentCountryResolved || geocoderUnavailableRef.current || telemetry.isSimulating || origin.address?.startsWith('Recherche')) return;
    const now = Date.now();
    const previous = lastCountryPositionRef.current;
    if (previous && (getHaversineDistanceKm(previous, currentVehiclePos) < 25 || now - lastCountryRequestAtRef.current < 15 * 60 * 1000)) return;
    lastCountryPositionRef.current = currentVehiclePos;
    lastCountryRequestAtRef.current = now;
    geocoder.geocode({ location: { lat: currentVehiclePos.lat, lng: currentVehiclePos.lng } }, (results, status) => {
      if (status === 'OVER_QUERY_LIMIT' || status === 'REQUEST_DENIED') {
        geocoderUnavailableRef.current = true;
        return;
      }
      if (status !== 'OK' || !results) return;
      const country = results.flatMap((result) => result.address_components)
        .find((component) => component.types.includes('country'));
      if (country?.short_name) onCurrentCountryResolved(country.short_name);
    });
  }, [currentVehiclePos.lat, currentVehiclePos.lng, geocodingLib, onCurrentCountryResolved, telemetry.isSimulating, origin.address]);

  useEffect(() => {
    if (!map || destination || telemetry.isSimulating) return;
    map.panTo({ lat: origin.lat, lng: origin.lng });
  }, [map, origin.lat, origin.lng, destination, telemetry.isSimulating]);

  useEffect(() => {
    if (map && telemetry.isSimulating && currentVehiclePos) {
      map.panTo({ lat: currentVehiclePos.lat, lng: currentVehiclePos.lng });
      if (is3DMode) {
        map.setHeading(telemetry.headingDeg);
      }
    }
  }, [currentVehiclePos, map, is3DMode, telemetry.headingDeg, telemetry.isSimulating]);

  // Calcul d'itinéraire avec le SDK Routes API moderne
  const computeRoute = useCallback(() => {
    if (!routesLib || !map || !destination) {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
      onRouteChange(null);
      return;
    }

    const target = destination;

    // Nettoyage des tracés précédents
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    const request = {
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: target.lat, lng: target.lng },
      intermediates: waypoints.map((point) => ({ location: { lat: point.lat, lng: point.lng }, via: true })),
      travelMode: 'DRIVING' as const,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
    };

    (routesLib.Route as any).computeRoutes(request)
      .then(({ routes }: { routes: any[] }) => {
        if (!routes || routes.length === 0) {
          fallbackSyntheticRoute();
          return;
        }

        const primaryRoute = routes[0];

        // Rendu de la polyligne monochrome stylisée
        const newPolylines = primaryRoute.createPolylines();
        newPolylines.forEach((polyline: google.maps.Polyline) => {
          polyline.setOptions({
            strokeColor: '#ffffff',
            strokeWeight: 6,
            strokeOpacity: 0.95,
            zIndex: 10,
          });
          polyline.setMap(map);
        });
        polylinesRef.current = newPolylines;

        // Cadrage de la caméra si la simulation n'est pas encore en cours
        if (!isSimulatingRef.current && primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport);
        }

        // Extraction des points du tracé pour l'animation GPS
        const pathCoords: GpsCoordinate[] = [];
        if (primaryRoute.path) {
          for (const pt of primaryRoute.path) {
            pathCoords.push({
              lat: typeof pt.lat === 'function' ? pt.lat() : pt.lat,
              lng: typeof pt.lng === 'function' ? pt.lng() : pt.lng,
            });
          }
        }

        // Extraction des étapes (instructions virage par virage)
        const steps: TurnStep[] = [];
        if (primaryRoute.legs && primaryRoute.legs[0] && primaryRoute.legs[0].steps) {
          primaryRoute.legs[0].steps.forEach((s: any) => {
            steps.push({
              instruction: s.navigationInstruction?.instructions || s.instructions || 'Continuez tout droit',
              distanceMeters: s.distanceMeters || 100,
              durationSeconds: s.durationMillis ? s.durationMillis / 1000 : 30,
              maneuver: s.navigationInstruction?.maneuver || 'STRAIGHT',
              startLocation: {
                lat: s.startLocation?.latLng?.latitude || origin.lat,
                lng: s.startLocation?.latLng?.longitude || origin.lng,
              },
              endLocation: {
                lat: s.endLocation?.latLng?.latitude || target.lat,
                lng: s.endLocation?.latLng?.longitude || target.lng,
              },
            });
          });
        }

        const distanceKm = (primaryRoute.distanceMeters || 1000) / 1000;
        const durationMin = (primaryRoute.durationMillis || 60000) / 60000;

        const displayedPath = pathCoords.length > 0 ? pathCoords : interpolatePath(origin, target, 30);
        onRouteChange({
          distanceKm,
          durationMinutes: durationMin,
          summary: primaryRoute.description || 'Itinéraire optimal calculé',
          steps: steps.length > 0 ? steps : generateDefaultSteps(origin, target, distanceKm),
          path: displayedPath,
          origin,
          destination: target,
        });
      })
      .catch((err: any) => {
        console.warn('Routes API computeRoutes notice, bascule sur interpolation GPS:', err);
        fallbackSyntheticRoute();
      });
  }, [routesLib, map, origin, destination, waypoints, onRouteChange, onAddWaypoint]);

  // Itinéraire de secours fluide si la clé est en limite de quota
  const fallbackSyntheticRoute = () => {
    if (!destination) return;
    const target = destination;
    const routePoints = [origin, ...waypoints, target];
    const dist = routePoints.slice(1).reduce(
      (total, point, index) => total + getHaversineDistanceKm(routePoints[index], point) * 1.35,
      0
    );
    const dur = (dist / 28) * 60;
    const segmentCount = Math.max(3, Math.floor(40 / (routePoints.length - 1)));
    const syntheticPath = routePoints.slice(1).flatMap((point, index) =>
      interpolatePath(routePoints[index], point, segmentCount).slice(index === 0 ? 0 : 1)
    );
    const steps = generateDefaultSteps(origin, target, dist);

    // Dessine une ligne directe élégante sur la carte
    if (map) {
      const line = new google.maps.Polyline({
        path: syntheticPath.map(p => ({ lat: p.lat, lng: p.lng })),
        strokeColor: '#ffffff',
        strokeOpacity: 0.9,
        strokeWeight: 5,
        map,
      });
      polylinesRef.current.push(line);

      const bounds = new google.maps.LatLngBounds();
      syntheticPath.forEach(p => bounds.extend(new google.maps.LatLng(p.lat, p.lng)));
      map.fitBounds(bounds);
    }

    onRouteChange({
      distanceKm: dist,
      durationMinutes: dur,
      summary: 'Trajet urbain optimisé',
      steps,
      path: syntheticPath,
      origin,
      destination: target,
    });
  };

  useEffect(() => {
    computeRoute();
    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [computeRoute]);

  // Double-cliquer sur la carte fixe une arrivée et recalcule le trajet depuis le GPS.
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('dblclick', (event: google.maps.MapMouseEvent) => {
      const latLng = event.latLng;
      if (!latLng) return;
      const point = {
        lat: latLng.lat(),
        lng: latLng.lng(),
        address: `Point choisi sur la carte (${latLng.lat().toFixed(4)}, ${latLng.lng().toFixed(4)})`,
      };

      if (activeTargetMode === 'set_origin') {
        onSetOrigin(point);
      } else if (activeTargetMode === 'set_waypoint' && destination) {
        onAddWaypoint(point);
      } else {
        onUseMyLocationAsOrigin();
        onSetDestination(point);
      }
    });
    return () => listener.remove();
  }, [map, activeTargetMode, destination, onAddWaypoint, onSetOrigin, onSetDestination, onUseMyLocationAsOrigin]);

  const handleMapClick = (e: any) => {
    if (activeTargetMode === 'none') return;

    const latLng = e.detail?.latLng || e.latLng;
    if (!latLng) return;
    const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
    const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;
    const fallbackAddress = `Point GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

    const setPoint = activeTargetMode === 'set_origin'
      ? onSetOrigin
      : activeTargetMode === 'set_waypoint'
        ? onAddWaypoint
        : onSetDestination;
    setPoint({ lat, lng, address: fallbackAddress });
  };

  // Rotation de la caméra
  const handleRotateHeading = (delta: number) => {
    if (!map) return;
    const newH = (heading + delta + 360) % 360;
    setHeading(newH);
    map.setHeading(newH);
  };

  const handleZoom = (delta: number) => {
    if (!map) return;
    const currentZ = map.getZoom() || 16;
    const nextZ = Math.min(Math.max(currentZ + delta, 3), 21);
    setZoom(nextZ);
    map.setZoom(nextZ);
  };

  const handleRecenter = () => {
    if (!map) return;
    map.panTo({ lat: currentVehiclePos.lat, lng: currentVehiclePos.lng });
    map.setZoom(17);
    if (is3DMode) {
      map.setTilt(60);
    }
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <Map
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        defaultCenter={{ lat: origin.lat, lng: origin.lng }}
        defaultZoom={16}
        defaultTilt={is3DMode ? 60 : 0}
        defaultHeading={0}
        gestureHandling="greedy"
        disableDoubleClickZoom={true}
        disableDefaultUI={true}
        className="w-full h-full"
        onClick={handleMapClick}
      >
        {/* Marqueur Destination */}
        {isOriginCustom && (
          <AdvancedMarker
            position={{ lat: origin.lat, lng: origin.lng }}
            draggable
            onDragEnd={(event) => {
              if (event.latLng) onSetOrigin({ lat: event.latLng.lat(), lng: event.latLng.lng(), address: 'Départ déplacé' });
            }}
          >
            <div className="relative flex flex-col items-center -translate-y-6">
              <div className="px-2 py-0.5 bg-zinc-950 text-white font-bold text-[10px] font-mono tracking-wider rounded uppercase border border-white shadow-lg">
                DÉPART
              </div>
              <div className="w-6 h-6 rounded-full bg-black border-2 border-white flex items-center justify-center shadow-lg mt-0.5">
                <Navigation className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          </AdvancedMarker>
        )}

        {waypoints.map((point, index) => (
          <AdvancedMarker
            key={`${index}-${point.lat.toFixed(5)}-${point.lng.toFixed(5)}`}
            position={{ lat: point.lat, lng: point.lng }}
            draggable
            onDragEnd={(event) => {
              if (event.latLng) onMoveWaypoint(index, { lat: event.latLng.lat(), lng: event.latLng.lng() });
            }}
          >
            <div className="w-6 h-6 rounded-full bg-white text-black border-2 border-black flex items-center justify-center shadow-lg text-[10px] font-bold font-mono">
              {index + 1}
            </div>
          </AdvancedMarker>
        ))}

        {destination && (
          <AdvancedMarker
            position={{ lat: destination.lat, lng: destination.lng }}
            draggable
            onDragEnd={(event) => {
              if (event.latLng) onSetDestination({ lat: event.latLng.lat(), lng: event.latLng.lng(), address: 'Arrivée déplacée' });
            }}
          >
            <div className="relative flex flex-col items-center group -translate-y-6">
              <div className="px-2 py-0.5 bg-white text-black font-bold text-[10px] font-mono tracking-wider rounded uppercase shadow-lg shadow-black">
                ARRIVÉE
              </div>
              <div className="w-6 h-6 rounded-full bg-white border-2 border-black flex items-center justify-center shadow-lg mt-0.5">
                <Flag className="w-3.5 h-3.5 text-black" />
              </div>
            </div>
          </AdvancedMarker>
        )}

        {/* Marqueur Position GPS réelle / Véhicule simulé */}
        <AdvancedMarker position={{ lat: currentVehiclePos.lat, lng: currentVehiclePos.lng }}>
          <div className="relative flex flex-col items-center justify-center">
            <div className="absolute w-14 h-14 rounded-full border border-white/40 bg-white/10 animate-ping-subtle" />
            <div className="absolute w-10 h-10 rounded-full border border-dashed border-white/60 animate-radar" />

            <div 
              className="relative w-8 h-8 rounded-full bg-black border-2 border-white flex items-center justify-center shadow-2xl transition-transform duration-300 ease-out"
              style={{ transform: `rotate(${telemetry.headingDeg}deg)` }}
            >
              <Navigation className="w-4 h-4 text-white fill-white -rotate-45" />
            </div>

            <div className="absolute -top-8 px-2 py-0.5 bg-black/90 border border-white/60 rounded text-[9px] font-mono text-white whitespace-nowrap shadow-md">
              {telemetry.isSimulating ? `${Math.round(telemetry.speedKmh)} km/h` : 'MA POSITION'}
            </div>
          </div>
        </AdvancedMarker>
      </Map>

      {/* Mode Clic actif indicateur */}
      {activeTargetMode !== 'none' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-black/90 border border-white text-white text-xs font-mono rounded-full flex items-center gap-2 shadow-2xl animate-bounce">
          <MapPin className="w-4 h-4 text-white" />
          <span>
              Cliquez sur la carte pour choisir votre{' '}
              <strong className="underline uppercase">{activeTargetMode === 'set_origin' ? 'Départ' : activeTargetMode === 'set_waypoint' ? 'Point de passage' : 'Destination'}</strong>
          </span>
        </div>
      )}

      {/* Commandes Flottantes de Caméra GPS 3D / 2D (Style Cockpit) */}
      <div className="absolute right-4 top-20 z-20 flex flex-col gap-2">
        {/* Toggle Vue 3D / Immeubles */}
        <button
          onClick={onToggle3DMode}
          title="Basculer vue 3D avec perspective des immeubles"
          className={`w-11 h-11 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all shadow-xl backdrop-blur-md ${
            is3DMode
              ? 'bg-white text-black border-white ring-2 ring-white/50'
              : 'bg-black/80 text-zinc-300 border-zinc-700 hover:text-white hover:border-zinc-500'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span className="text-[9px] font-mono font-bold leading-none">3D</span>
        </button>

        {/* Recentrer GPS */}
        <button
          onClick={handleRecenter}
          title="Recentrer le GPS sur le véhicule"
          className="w-11 h-11 rounded-lg bg-black/80 border border-zinc-700 hover:border-white text-zinc-300 hover:text-white flex items-center justify-center transition-all shadow-xl backdrop-blur-md"
        >
          <Navigation className="w-4 h-4" />
        </button>

        {/* Rotation Caméra */}
        <button
          onClick={() => handleRotateHeading(45)}
          title="Pivoter la vue (45°)"
          className="w-11 h-11 rounded-lg bg-black/80 border border-zinc-700 hover:border-white text-zinc-300 hover:text-white flex items-center justify-center transition-all shadow-xl backdrop-blur-md"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Zoom In */}
        <button
          onClick={() => handleZoom(1)}
          title="Zoom avant"
          className="w-11 h-11 rounded-lg bg-black/80 border border-zinc-700 hover:border-white text-zinc-300 hover:text-white flex items-center justify-center transition-all shadow-xl backdrop-blur-md"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => handleZoom(-1)}
          title="Zoom arrière"
          className="w-11 h-11 rounded-lg bg-black/80 border border-zinc-700 hover:border-white text-zinc-300 hover:text-white flex items-center justify-center transition-all shadow-xl backdrop-blur-md"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Échelle télémétrique basse droite */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-none hidden sm:flex items-center gap-3 px-3 py-1.5 bg-black/85 border border-zinc-800 rounded-lg backdrop-blur-md text-[11px] font-mono text-zinc-400">
        <div className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-zinc-400" />
          <span>INCLINAISON: <strong className="text-white">{is3DMode ? '60° 3D' : '0° 2D'}</strong></span>
        </div>
        <div className="w-px h-3 bg-zinc-700" />
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-zinc-400" />
          <span>CAP: <strong className="text-white">{Math.round(telemetry.headingDeg)}°</strong></span>
        </div>
      </div>
    </div>
  );
}

// Helpers d'interpolation de trajet pour simulation
function interpolatePath(start: GpsCoordinate, end: GpsCoordinate, pointsCount: number): GpsCoordinate[] {
  const result: GpsCoordinate[] = [];
  for (let i = 0; i <= pointsCount; i++) {
    const t = i / pointsCount;
    // Petite courbe pour simuler un tracé routier réaliste plutôt qu'une ligne droite géométrique
    const curvature = Math.sin(t * Math.PI) * 0.0035;
    result.push({
      lat: start.lat + (end.lat - start.lat) * t + curvature,
      lng: start.lng + (end.lng - start.lng) * t + curvature * 0.5,
    });
  }
  return result;
}

function generateDefaultSteps(start: GpsCoordinate, end: GpsCoordinate, distKm: number): TurnStep[] {
  return [
    {
      instruction: 'Prenez la direction nord-ouest sur le boulevard principal',
      distanceMeters: Math.round(distKm * 250),
      durationSeconds: 120,
      maneuver: 'DEPART',
      startLocation: start,
      endLocation: start,
    },
    {
      instruction: 'Tournez à droite au prochain carrefour',
      distanceMeters: Math.round(distKm * 350),
      durationSeconds: 150,
      maneuver: 'TURN_RIGHT',
      startLocation: start,
      endLocation: end,
    },
    {
      instruction: 'Continuez tout droit sur 500 mètres',
      distanceMeters: Math.round(distKm * 200),
      durationSeconds: 90,
      maneuver: 'STRAIGHT',
      startLocation: start,
      endLocation: end,
    },
    {
      instruction: 'Vous êtes arrivé à votre destination sur votre droite',
      distanceMeters: 50,
      durationSeconds: 20,
      maneuver: 'ARRIVE',
      startLocation: end,
      endLocation: end,
    },
  ];
}
