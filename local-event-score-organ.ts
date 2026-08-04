/**
 * CyberCrowd CORE — Local Event Score Organ
 *
 * Layer:
 * CORE / Local Signal Processing Boundary
 *
 * Owns:
 * - local event input structure
 * - local history reference structure
 * - external signal input structure
 * - local event score output artifact
 * - bounded score computation
 *
 * Does NOT Own:
 * - NET surface handling
 * - UI rendering
 * - identity ownership
 * - authentication
 * - payments
 * - analytics systems
 * - behavioral profiling
 * - participant tracking
 * - external routing
 * - persistent storage authority
 *
 * Boundary:
 * Local event signals enter CORE.
 * CORE produces a bounded scoring artifact.
 * The output remains a local calculation result.
 *
 * Security:
 * - No hidden synchronization
 * - No identity binding
 * - No behavioral tracking
 * - No external side effects
 *
 * Doctrine:
 * Local Event Score ≠ Identity Intelligence
 * Local Event Score ≠ Financial Authority
 */

// local-event-score-organ.ts

export type EventInput = {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  venueId: string;
  expectedAttendance?: number;
  category: 'concert' | 'sports' | 'conference' | 'bar_night' | 'other';
};

export type LocalHistory = {
  venueId: string;
  avgFootTraffic: number;
  peakFootTraffic: number;
  typicalEventTypes: string[];
};

export type ExternalSignals = {
  weatherScore: number;
  holidayScore: number;
  competingEventScore: number;
  paydayProximityScore: number;
};

export type LocalEventScoreOutput = {
  score: number;
  confidence: number;
  drivers: { label: string; impact: number }[];
  recommendations: string[];
};

export function computeLocalEventScore(
  event: EventInput,
  history: LocalHistory,
  signals: ExternalSignals
): LocalEventScoreOutput {
  const base = history.avgFootTraffic / (history.peakFootTraffic || 1);

  const boost =
    0.4 * signals.weatherScore +
    0.3 * signals.holidayScore +
    0.3 * signals.paydayProximityScore;

  const friction = 0.6 * signals.competingEventScore;

  let raw = base + boost - friction;
  raw = Math.max(0, Math.min(1, raw));

  const score = Math.round(raw * 100);

  const drivers = [
    { label: 'Venue baseline', impact: base },
    { label: 'Weather', impact: signals.weatherScore },
    { label: 'Holiday', impact: signals.holidayScore },
    { label: 'Payday proximity', impact: signals.paydayProximityScore },
    { label: 'Competing events', impact: -signals.competingEventScore },
  ];

  const recommendations: string[] = [];

  if (score >= 70) {
    recommendations.push('Increase staff levels');
    recommendations.push('Increase inventory for peak hours');
  } else if (score >= 40) {
    recommendations.push('Maintain normal staffing');
    recommendations.push('Targeted promo to lift attendance');
  } else {
    recommendations.push('Reduce inventory risk');
    recommendations.push('Consider stronger promo or rescheduling');
  }

  const confidence = 0.7;

  return { score, confidence, drivers, recommendations };
}
