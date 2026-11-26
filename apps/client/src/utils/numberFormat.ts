export function formatKilometers(value: number | string | null | undefined): string {
  if (value === '' || value === null || value === undefined) return '';
  const digits = String(value).replace(/\D/g, '');
  return digits ? Number(digits).toLocaleString('es-ES') : '';
}

export function parseKilometers(value: string): number | '' {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : '';
}
