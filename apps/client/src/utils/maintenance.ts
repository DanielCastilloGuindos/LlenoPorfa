import type { MaintenanceAlert, MaintenanceAlertReason, MaintenanceRule, RefuelLog, Vehicle } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_DAYS = 30;
const UPCOMING_KM = 500;

function validDate(value?: string): number | undefined {
  if (!value) return undefined;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function addMonths(date: string, months: number): string | undefined {
  const source = new Date(date);
  if (Number.isNaN(source.getTime())) return undefined;
  source.setMonth(source.getMonth() + months);
  return source.toISOString();
}

function maxOdometer(logs: RefuelLog[], vehicleId: string): number | undefined {
  const values = logs
    .filter((log) => log.vehicleId === vehicleId && typeof log.odometerKm === 'number' && log.odometerKm >= 0)
    .map((log) => log.odometerKm as number);
  return values.length ? Math.max(...values) : undefined;
}

export function calculateMaintenanceAlerts(
  rules: MaintenanceRule[] = [],
  vehicles: Vehicle[] = [],
  logs: RefuelLog[] = [],
  now: Date = new Date()
): MaintenanceAlert[] {
  const vehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
  const nowMs = now.getTime();
  const alerts: MaintenanceAlert[] = [];

  for (const rule of rules) {
    if (rule.enabled === false || !vehicleIds.has(rule.vehicleId)) continue;
    const snoozedUntil = validDate(rule.snoozedUntil);
    if (snoozedUntil !== undefined && snoozedUntil > nowMs) continue;
    const startDate = rule.startDate || now.toISOString();
    const startKm = typeof rule.startOdometerKm === 'number' ? rule.startOdometerKm : maxOdometer(logs, rule.vehicleId);
    const currentKm = maxOdometer(logs, rule.vehicleId);
    const dueDate = rule.intervalMonths && rule.intervalMonths > 0 ? addMonths(startDate, rule.intervalMonths) : undefined;
    const dueOdometerKm =
      typeof rule.targetOdometerKm === 'number'
        ? rule.targetOdometerKm
        : rule.intervalKm && rule.intervalKm > 0 && typeof startKm === 'number'
          ? startKm + rule.intervalKm
          : undefined;
    const dueDateMs = validDate(dueDate);
    const dateDue = dueDateMs !== undefined && nowMs >= dueDateMs;
    const kmDue = dueOdometerKm !== undefined && currentKm !== undefined && currentKm >= dueOdometerKm;
    const hasDate = dueDateMs !== undefined;
    const hasKm = dueOdometerKm !== undefined;
    if (!hasDate && !hasKm) continue;

    const dateUpcoming = hasDate && dueDateMs! - nowMs <= UPCOMING_DAYS * DAY_MS;
    const kmUpcoming = hasKm && currentKm !== undefined && dueOdometerKm! - currentKm <= UPCOMING_KM;
    const reason: MaintenanceAlertReason = dateDue && kmDue ? 'date_and_km' : dateDue || dateUpcoming ? 'date' : kmDue || kmUpcoming ? 'km' : 'none';
    const status: MaintenanceAlert['status'] = dateDue || kmDue ? 'overdue' : reason === 'none' ? 'upcoming' : 'pending';

    alerts.push({ rule, title: rule.title, vehicleId: rule.vehicleId, status, reason, dueDate, dueOdometerKm, currentOdometerKm: currentKm });
  }

  return alerts.sort((a, b) => (a.status === b.status ? a.title.localeCompare(b.title) : a.status === 'overdue' ? -1 : b.status === 'overdue' ? 1 : 0));
}

export function maintenanceRulesFromVehicles(vehicles: Vehicle[]): MaintenanceRule[] {
  return vehicles.flatMap((vehicle) => vehicle.maintenanceRules || []);
}
