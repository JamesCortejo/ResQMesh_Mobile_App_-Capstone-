/**
 * Converts an ISO 8601 string (preferably with 'Z' suffix) to a localized date/time string.
 * Example: "2026-03-01T13:17:23Z" -> "3/1/2026, 9:17:23 PM" (depending on device locale)
 */
export const formatLocalDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};