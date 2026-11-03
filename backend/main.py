"""
NOIR GPS - Backend Python (FastAPI)
Ce fichier constitue l'API Backend pour le calcul des tarifs de taxi, 
la gestion des coordonnées GPS et la simulation d'itinéraires.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import math
from datetime import datetime

app = FastAPI(
    title="Noir GPS Taxi API",
    description="API de calcul kilométrique de taxi et services GPS en temps réel",
    version="1.0.0"
)

# Configuration CORS pour permettre les requêtes depuis l'application Frontend (React / Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En production, spécifier l'URL exacte du frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modèles de données Pydantic
class Coordinates(BaseModel):
    lat: float = Field(..., example=48.8566)
    lng: float = Field(..., example=2.3522)
    address: Optional[str] = Field(None, example="Paris, France")

class TaxiEstimateRequest(BaseModel):
    distance_km: float = Field(..., ge=0, example=12.5, description="Distance totale en kilomètres")
    duration_minutes: float = Field(..., ge=0, example=25.0, description="Durée estimée en minutes")
    traffic_density: Optional[float] = Field(1.0, ge=0.5, le=3.0, description="Facteur de trafic (1.0 = fluide, 1.5 = modéré, 2.0 = bouchons)")
    is_night: Optional[bool] = Field(False, description="Tarif de nuit / dimanche")
    is_rush_hour: Optional[bool] = Field(False, description="Majoration heure de pointe")

class VehicleTariff(BaseModel):
    id: str
    name: str
    category: str
    base_fare: float
    per_km_rate: float
    per_min_rate: float
    min_fare: float
    surge_multiplier: float
    estimated_total: float
    estimated_range_min: float
    estimated_range_max: float
    capacity_passengers: int
    capacity_luggage: int
    eta_pickup_minutes: int
    description: str

class TaxiEstimateResponse(BaseModel):
    distance_km: float
    duration_minutes: float
    traffic_factor: float
    is_night_tariff: bool
    currency: str
    vehicles: List[VehicleTariff]
    calculated_at: str

# Barèmes des véhicules (Style Taxi Parisien / VTC Haut de Gamme Monochrome)
VEHICLE_CATALOG = [
    {
        "id": "noir_standard",
        "name": "Noir Standard",
        "category": "Berline Confort",
        "base_fare": 3.50,
        "per_km_rate": 1.45,
        "per_min_rate": 0.35,
        "min_fare": 8.00,
        "capacity_passengers": 4,
        "capacity_luggage": 3,
        "eta_pickup_minutes": 3,
        "description": "Taxi berline moderne, propre et silencieux. Chauffeur professionnel."
    },
    {
        "id": "noir_prestige",
        "name": "Noir Prestige VIP",
        "category": "Berline Luxe",
        "base_fare": 6.00,
        "per_km_rate": 2.20,
        "per_min_rate": 0.55,
        "min_fare": 15.00,
        "capacity_passengers": 4,
        "capacity_luggage": 4,
        "eta_pickup_minutes": 5,
        "description": "Mercedes Classe E / BMW Série 5. Vitres teintées, eau minérale et chargeur USB."
    },
    {
        "id": "noir_eco",
        "name": "Noir Eco 100% Électrique",
        "category": "Écologique",
        "base_fare": 3.00,
        "per_km_rate": 1.30,
        "per_min_rate": 0.30,
        "min_fare": 7.50,
        "capacity_passengers": 4,
        "capacity_luggage": 2,
        "eta_pickup_minutes": 4,
        "description": "Tesla ou véhicule hybride zéro émission. Conduite douce et silencieuse."
    },
    {
        "id": "noir_van",
        "name": "Noir Van XL",
        "category": "Grand Volume (6-7 places)",
        "base_fare": 7.00,
        "per_km_rate": 2.60,
        "per_min_rate": 0.60,
        "min_fare": 20.00,
        "capacity_passengers": 7,
        "capacity_luggage": 8,
        "eta_pickup_minutes": 7,
        "description": "Van spacieux idéal pour groupes, voyages et aéroports avec nombreux bagages."
    },
    {
        "id": "noir_moto",
        "name": "Noir Moto Express",
        "category": "Moto Taxi",
        "base_fare": 10.00,
        "per_km_rate": 2.80,
        "per_min_rate": 0.40,
        "min_fare": 25.00,
        "capacity_passengers": 1,
        "capacity_luggage": 1,
        "eta_pickup_minutes": 2,
        "description": "Honda Goldwing 1800cc tout confort. Rapide et ponctuel face aux embouteillages."
    }
]

@app.get("/")
def read_root():
    return {
        "app": "NOIR GPS - Taxi Backend API",
        "status": "online",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "estimate_taxi": "POST /api/taxi/estimate",
            "vehicles": "/api/taxi/vehicles"
        }
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "noir-gps-python-backend",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/taxi/vehicles")
def get_vehicles():
    """Retourne la liste des types de véhicules et tarifs de base"""
    return {"vehicles": VEHICLE_CATALOG}

@app.post("/api/taxi/estimate", response_model=TaxiEstimateResponse)
def estimate_taxi_fare(req: TaxiEstimateRequest):
    """
    Calcule le prix estimatif pour chaque catégorie de véhicule en fonction :
    - De la distance (km)
    - De la durée estimée (minutes)
    - De la densité du trafic (1.0 à 3.0)
    - Du tarif nuit / dimanche (+20%)
    - Du tarif heure de pointe (+15%)
    """
    # Facteur multiplicateur temporel / trafic
    multiplier = req.traffic_density
    if req.is_night:
        multiplier *= 1.20  # Majoration de nuit
    if req.is_rush_hour:
        multiplier *= 1.15  # Majoration de pointe

    result_vehicles: List[VehicleTariff] = []

    for v in VEHICLE_CATALOG:
        # Formule de tarification taxi officielle :
        # Total = Prise en charge + (Distance * Tarif_km) + (Temps * Tarif_min * Trafic)
        distance_cost = req.distance_km * v["per_km_rate"]
        time_cost = req.duration_minutes * v["per_min_rate"] * multiplier
        raw_price = v["base_fare"] + distance_cost + time_cost

        # Application du prix minimum
        final_price = max(raw_price, v["min_fare"])

        # Fourchette basse et haute pour donner une estimation réaliste à l'utilisateur
        price_min = round(final_price * 0.95, 2)
        price_max = round(final_price * 1.15, 2)
        final_price = round(final_price, 2)

        result_vehicles.append(
            VehicleTariff(
                id=v["id"],
                name=v["name"],
                category=v["category"],
                base_fare=v["base_fare"],
                per_km_rate=v["per_km_rate"],
                per_min_rate=v["per_min_rate"],
                min_fare=v["min_fare"],
                surge_multiplier=round(multiplier, 2),
                estimated_total=final_price,
                estimated_range_min=price_min,
                estimated_range_max=price_max,
                capacity_passengers=v["capacity_passengers"],
                capacity_luggage=v["capacity_luggage"],
                eta_pickup_minutes=v["eta_pickup_minutes"],
                description=v["description"]
            )
        )

    return TaxiEstimateResponse(
        distance_km=round(req.distance_km, 2),
        duration_minutes=round(req.duration_minutes, 1),
        traffic_factor=round(multiplier, 2),
        is_night_tariff=req.is_night or False,
        currency="EUR (€)",
        vehicles=result_vehicles,
        calculated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )

# Calcul géodésique Haversine (distance vol d'oiseau entre 2 points GPS)
@app.get("/api/gps/distance")
def haversine_distance(
    lat1: float = Query(..., description="Latitude départ"),
    lng1: float = Query(..., description="Longitude départ"),
    lat2: float = Query(..., description="Latitude arrivée"),
    lng2: float = Query(..., description="Longitude arrivée")
):
    R = 6371.0  # Rayon de la Terre en km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance_straight = R * c
    # Estimation routière approx (coefficient de détour urbain standard ~ 1.3)
    estimated_road_km = round(distance_straight * 1.32, 2)

    return {
        "straight_line_km": round(distance_straight, 2),
        "estimated_road_km": estimated_road_km,
        "estimated_duration_min": round((estimated_road_km / 28.0) * 60, 1)  # Vitesse moyenne 28 km/h en ville
    }

# Endpoint de simulation dynamique de trafic en temps réel
@app.get("/api/traffic/simulate")
def simulate_live_traffic(current_density: Optional[float] = 1.0):
    import random
    drift = (random.random() - 0.49) * 0.28
    new_density = round(max(0.9, min(2.7, (current_density or 1.0) + drift)), 2)
    speed_factor = max(0.18, 1.0 / (new_density ** 1.2))
    level = "fluid" if new_density < 1.25 else ("moderate" if new_density < 1.65 else ("dense" if new_density < 2.1 else "jam"))
    
    return {
        "density": new_density,
        "level": level,
        "speed_factor": round(speed_factor, 2),
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    # Lancement direct du serveur de développement sur le port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
