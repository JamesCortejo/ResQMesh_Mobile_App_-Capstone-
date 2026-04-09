// utils/dateHelpers.ts

/**
 * Convert a UTC timestamp string to Philippines local time (UTC+8)
 * and format it as 12‑hour with AM/PM.
 * Example: "2025-04-07T15:04:00Z" → "04/08/2025, 12:04:00 AM"
 */
export const formatLocalTime12hr = (utcString: string): string => {
  // Ensure UTC parsing by appending 'Z' if missing (cloud DB may omit timezone)
  const normalized = utcString.endsWith('Z') ? utcString : utcString + 'Z';
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return 'Invalid date';

  return date.toLocaleString(undefined, {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

/**
 * Short version (only time, no date).
 * Example: "11:04 PM"
 */
export const formatTime12hr = (utcString: string): string => {
  const normalized = utcString.endsWith('Z') ? utcString : utcString + 'Z';
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return 'Invalid time';

  return date.toLocaleString(undefined, {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};