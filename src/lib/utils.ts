import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function getDaysRemaining(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function normalizeEntityName(name?: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(llc|inc|corp|co|incorporated|company|ltd|limited|d\/b\/a|dba|enterprises|group|services|contracting|construction)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function checkEntityMatch(extractedName?: string | null, expectedName?: string | null): boolean {
  if (!extractedName || !expectedName) return false;
  const normExtracted = normalizeEntityName(extractedName);
  const normExpected = normalizeEntityName(expectedName);
  if (!normExtracted || !normExpected) return false;
  return normExtracted === normExpected || normExtracted.includes(normExpected) || normExpected.includes(normExtracted);
}
