import { TrafficLevel, TrafficState } from '../types/gps';

const TRAFFIC_INCIDENTS = [
  'Fluide : circulation dégagée sur les grands axes',
  'Ralentissement localisé : fort trafic aux intersections',
  'Trafic en accordéon : freinages fréquents en approche de carrefour',
  'Bouchon dense : travaux ou véhicule arrêté en double file',
  'Congestion urbaine majeure : vitesse moyenne très réduite',
  'Reprise de fluidité : dégagement progressif des voies',
  'Ralentissement modéré aux abords des zones piétonnes',
];

export function getTrafficLevel(density: number): TrafficLevel {
  if (density < 1.25) return 'fluid';
  if (density < 1.65) return 'moderate';
  if (density < 2.1) return 'dense';
  return 'jam';
}

export function getTrafficLabel(density: number): string {
  const level = getTrafficLevel(density);
  switch (level) {
    case 'fluid':
      return `Fluide (Index ${density.toFixed(2)}x)`;
    case 'moderate':
      return `Modéré (Index ${density.toFixed(2)}x)`;
    case 'dense':
      return `Dense (Index ${density.toFixed(2)}x)`;
    case 'jam':
      return `Bouchons Sévères (Index ${density.toFixed(2)}x)`;
  }
}

export function getSpeedFactor(density: number): number {
  // Plus la densité est élevée, plus la vitesse diminue
  // À 1.0x -> 1.0 (vitesse normale 50 km/h)
  // À 1.5x -> 0.65 (~32 km/h)
  // À 2.0x -> 0.40 (~20 km/h)
  // À 2.5x -> 0.22 (~11 km/h)
  return Math.max(0.18, 1.0 / Math.pow(density, 1.2));
}

export function computeNextRandomDensity(currentDensity: number): { nextDensity: number; incidentNotice?: string } {
  // Fluctuation aléatoire avec inertie (marche aléatoire bornée entre 0.90 et 2.70)
  const drift = (Math.random() - 0.49) * 0.28;
  const rawNext = currentDensity + drift;
  const clamped = Math.round(Math.min(Math.max(rawNext, 0.90), 2.70) * 100) / 100;

  // Chance de générer une notification d'incident si saut significatif
  let incidentNotice: string | undefined;
  if (Math.abs(clamped - currentDensity) > 0.12 || Math.random() < 0.25) {
    if (clamped >= 2.0) {
      incidentNotice = TRAFFIC_INCIDENTS[4];
    } else if (clamped >= 1.65) {
      incidentNotice = TRAFFIC_INCIDENTS[3];
    } else if (clamped >= 1.25) {
      incidentNotice = TRAFFIC_INCIDENTS[1];
    } else {
      incidentNotice = TRAFFIC_INCIDENTS[0];
    }
  }

  return { nextDensity: clamped, incidentNotice };
}
