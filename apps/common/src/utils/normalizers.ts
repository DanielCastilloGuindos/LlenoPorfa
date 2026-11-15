/**
 * Normalizes brand and operator names to consistent casing and canonical labels.
 */
export function normalizeBrand(raw: string | null | undefined): string {
  if (!raw) return 'Independiente';
  const clean = raw.trim();
  const upper = clean.toUpperCase();

  if (upper.includes('REPSOL') || upper.includes('CAMPSA') || upper.includes('PETRONOR')) return 'Repsol';
  if (upper.includes('CEPSA') || upper.includes('MOEVE')) return 'Cepsa';
  if (upper.includes('BP') || upper.includes('BRITISH PETROLEUM')) return 'BP';
  if (upper.includes('SHELL')) return 'Shell';
  if (upper.includes('GALP')) return 'Galp';
  if (upper.includes('PLENOIL')) return 'Plenoil';
  if (upper.includes('BALLENOIL')) return 'Ballenoil';
  if (upper.includes('PETROPRIX')) return 'Petroprix';
  if (upper.includes('CARREFOUR')) return 'Carrefour';
  if (upper.includes('ALCAMPO')) return 'Alcampo';
  if (upper.includes('EROSKI')) return 'Eroski';
  if (upper.includes('IBERDROLA')) return 'Iberdrola';
  if (upper.includes('ENDESA')) return 'Endesa X';
  if (upper.includes('IONITY')) return 'Ionity';
  if (upper.includes('TESLA')) return 'Tesla Supercharger';
  if (upper.includes('WENEA')) return 'Wenea';
  if (upper.includes('EDP')) return 'EDP';
  if (upper.includes('TOTAL') || upper.includes('TOTALENERGIES')) return 'TotalEnergies';

  return clean || 'Independiente';
}

/**
 * Normalizes postal codes (pads to 5 digits if needed).
 */
export function normalizePostalCode(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return digits.padStart(5, '0').slice(0, 5);
}
