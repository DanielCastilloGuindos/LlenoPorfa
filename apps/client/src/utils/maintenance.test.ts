import { describe, expect, it } from 'bun:test';
import type { MaintenanceRule, RefuelLog, Vehicle } from '../types';
import { calculateMaintenanceAlerts } from './maintenance';

const vehicle = (id: string): Vehicle => ({ id, alias: id, brand: 'Marca', model: 'Modelo', fuelType: 'g95_e5', tankCapacityLiters: 50 });
const log = (vehicleId: string, odometerKm?: number, date = '2026-01-01'): RefuelLog => ({ id: `${vehicleId}-${date}`, stationName: 'Test', date, fuelType: 'g95_e5', pricePerLiter: 1, liters: 1, totalAmount: 1, odometerKm, vehicleId, createdAt: 1 });
const rule = (data: Partial<MaintenanceRule>): MaintenanceRule => ({ id: 'r1', title: 'Aceite', vehicleId: 'v1', startDate: '2026-01-01T00:00:00Z', ...data });

describe('calculateMaintenanceAlerts', () => {
  it('calculates date, km and OR conditions', () => {
    const date = new Date('2026-02-01T00:00:00Z');
    expect(calculateMaintenanceAlerts([rule({ intervalMonths: 1 })], [vehicle('v1')], [], date)[0].reason).toBe('date');
    expect(calculateMaintenanceAlerts([rule({ intervalKm: 1000, startOdometerKm: 10000 })], [vehicle('v1')], [log('v1', 11000)], date)[0].reason).toBe('km');
    expect(calculateMaintenanceAlerts([rule({ intervalMonths: 3, intervalKm: 1000, startOdometerKm: 10000 })], [vehicle('v1')], [log('v1', 11000)], new Date('2026-05-01'))[0].reason).toBe('date_and_km');
  });

  it('supports a day-based interval', () => {
    expect(calculateMaintenanceAlerts([rule({ intervalDays: 15 })], [vehicle('v1')], [], new Date('2026-01-16'))[0].reason).toBe('date');
  });

  it('supports a custom due date', () => {
    expect(calculateMaintenanceAlerts([rule({ customDueDate: '2026-04-15T00:00:00.000Z' })], [vehicle('v1')], [], new Date('2026-04-15'))[0].reason).toBe('date');
  });

  it('uses the maximum vehicle odometer, supports multiple vehicles and ignores legacy logs', () => {
    const alerts = calculateMaintenanceAlerts(
      [rule({ intervalKm: 500 }), { ...rule({ id: 'r2', vehicleId: 'v2', intervalKm: 500 }), title: 'ITV' }],
      [vehicle('v1'), vehicle('v2')],
      [log('v1', 10500), log('v1', 10001), { ...log('v2'), vehicleId: undefined, odometerKm: 99999 }],
      new Date('2026-02-01')
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0].vehicleId).toBe('v1');
  });

  it('returns upcoming for a future date and omits rules with both conditions missing', () => {
    const alerts = calculateMaintenanceAlerts(
      [rule({ intervalMonths: 12 }), rule({ id: 'none', title: 'Personalizado' })],
      [vehicle('v1')],
      [],
      new Date('2026-02-01')
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0].status).toBe('upcoming');
  });

  it('tolerates disabled rules', () => {
    expect(calculateMaintenanceAlerts([rule({ intervalMonths: 1, enabled: false })], [vehicle('v1')], [], new Date('2026-02-01'))).toEqual([]);
  });
});
