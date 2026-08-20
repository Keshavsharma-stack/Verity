import { ExpirationStatusCategory } from '../types/index.js';

export type ExpirationClassification = 'EXPIRED' | 'CRITICAL' | 'UPCOMING' | 'ACTIVE' | 'PERMANENT';

export interface ExpirationEvaluation {
  category: ExpirationStatusCategory;
  classification: ExpirationClassification;
  daysRemaining: number | null;
  isExpired: boolean;
  isCritical: boolean;
  isUpcoming: boolean;
  isExpiringSoon: boolean;
  displayStatus: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'CRITICAL' | 'UPCOMING' | 'LAPSED' | 'PERMANENT' | 'NO_EXPIRATION_DATE';
  badgeVariant: 'success' | 'warning' | 'danger' | 'neutral';
  humanReadable: string;
}

/**
 * Parses calendar date parts (YYYY, MM, DD) safely without timezone shifting.
 */
export function parseCalendarDate(dateStr?: string | null): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10) - 1, // 0-indexed month
    day: parseInt(match[3], 10),
  };
}

/**
 * Returns normalized UTC midnight timestamp for a given date or today.
 */
export function getNormalizedUtcMidnight(date?: Date): number {
  const d = date || new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Calculates accurate calendar days remaining until an expiration date.
 * Returns null if no expiration date is provided.
 * Negative number means expired (e.g. -2 means expired 2 days ago).
 */
export function calculateDaysRemaining(expiresAt?: string | null, referenceDate?: Date): number | null {
  const parsed = parseCalendarDate(expiresAt);
  if (!parsed) return null;

  const targetUtc = Date.UTC(parsed.year, parsed.month, parsed.day);
  const todayUtc = getNormalizedUtcMidnight(referenceDate);

  const diffMs = targetUtc - todayUtc;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Evaluates the full centralized expiration status of a document.
 */
export function evaluateExpiration(expiresAt?: string | null, referenceDate?: Date): ExpirationEvaluation {
  const days = calculateDaysRemaining(expiresAt, referenceDate);

  if (days === null) {
    return {
      category: 'NO_EXPIRATION_DATE',
      classification: 'PERMANENT',
      daysRemaining: null,
      isExpired: false,
      isCritical: false,
      isUpcoming: false,
      isExpiringSoon: false,
      displayStatus: 'PERMANENT',
      badgeVariant: 'neutral',
      humanReadable: 'Permanent Record',
    };
  }

  if (days < 0) {
    const absDays = Math.abs(days);
    return {
      category: 'EXPIRED',
      classification: 'EXPIRED',
      daysRemaining: days,
      isExpired: true,
      isCritical: false,
      isUpcoming: false,
      isExpiringSoon: false,
      displayStatus: 'EXPIRED',
      badgeVariant: 'danger',
      humanReadable: absDays === 1 ? 'Expired yesterday' : `Expired ${absDays} days ago`,
    };
  }

  if (days === 0) {
    return {
      category: 'EXPIRING_7_DAYS',
      classification: 'CRITICAL',
      daysRemaining: 0,
      isExpired: false,
      isCritical: true,
      isUpcoming: true,
      isExpiringSoon: true,
      displayStatus: 'CRITICAL',
      badgeVariant: 'danger',
      humanReadable: 'Expires today',
    };
  }

  if (days <= 7) {
    return {
      category: 'EXPIRING_7_DAYS',
      classification: 'CRITICAL',
      daysRemaining: days,
      isExpired: false,
      isCritical: true,
      isUpcoming: true,
      isExpiringSoon: true,
      displayStatus: 'CRITICAL',
      badgeVariant: 'danger',
      humanReadable: days === 1 ? '1 day remaining' : `${days} days remaining`,
    };
  }

  if (days <= 15) {
    return {
      category: 'EXPIRING_15_DAYS',
      classification: 'UPCOMING',
      daysRemaining: days,
      isExpired: false,
      isCritical: false,
      isUpcoming: true,
      isExpiringSoon: true,
      displayStatus: 'UPCOMING',
      badgeVariant: 'warning',
      humanReadable: `${days} days remaining`,
    };
  }

  if (days <= 30) {
    return {
      category: 'EXPIRING_30_DAYS',
      classification: 'UPCOMING',
      daysRemaining: days,
      isExpired: false,
      isCritical: false,
      isUpcoming: true,
      isExpiringSoon: true,
      displayStatus: 'UPCOMING',
      badgeVariant: 'warning',
      humanReadable: `${days} days remaining`,
    };
  }

  return {
    category: 'ACTIVE',
    classification: 'ACTIVE',
    daysRemaining: days,
    isExpired: false,
    isCritical: false,
    isUpcoming: false,
    isExpiringSoon: false,
    displayStatus: 'ACTIVE',
    badgeVariant: 'success',
    humanReadable: `${days} days remaining`,
  };
}
