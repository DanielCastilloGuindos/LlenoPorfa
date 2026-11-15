/**
 * Parses a string with a Spanish comma decimal separator (e.g. "1,459") into a number.
 */
export function parseSpanishDecimal(val: string | null | undefined): number | null {
  if (!val) return null;
  const clean = val.trim().replace(',', '.');
  if (!clean) return null;
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

/**
 * Checks if an operating schedule indicates 24-hour service.
 */
export function isOpen24Hours(schedule: string | null | undefined): boolean {
  if (!schedule) return false;
  const upper = schedule.toUpperCase();
  return (
    upper.includes('24H') ||
    upper.includes('24 H') ||
    upper.includes('00:00-24:00') ||
    upper.includes('24 HORAS') ||
    upper.includes('L-D: 24H')
  );
}

/**
 * Formats a number as a localized price string.
 */
export function formatPrice(price: number | null | undefined, decimals = 3): string {
  if (price === null || price === undefined || isNaN(price)) return '-';
  return `${price.toFixed(decimals)} €`;
}

/**
 * Formats power in kW for charging stations.
 */
export function formatPower(powerKw: number | null | undefined): string {
  if (!powerKw) return '- kW';
  return `${Math.round(powerKw)} kW`;
}
