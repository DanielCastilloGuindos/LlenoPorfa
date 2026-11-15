import { describe, it, expect } from 'bun:test';
import { handleRegisterStats } from '../src/presentation/controllers/registerController';

describe('handleRegisterStats', () => {
  it('rejects unauthorized requests', async () => {
    const req = new Request('http://localhost:3002/api/register/stats?days=30', {
      headers: { Authorization: 'Bearer wrong_token' },
    });
    const url = new URL(req.url);
    const res = await handleRegisterStats(req, url);
    expect(res.status).toBe(401);
  });

  it('returns valid StatsResponse with correct structure when authorized', async () => {
    const req = new Request('http://localhost:3002/api/register/stats?days=30', {
      headers: { Authorization: 'Bearer llenoporfa_admin_2026' },
    });
    const url = new URL(req.url);
    const res = await handleRegisterStats(req, url);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.ok).toBe(true);
    expect(typeof data.unique_users).toBe('number');
    expect(typeof data.total_sessions).toBe('number');
    expect(data.unique_users).toBeGreaterThan(0);
    expect(data.funnel).toBeDefined();
    expect(typeof data.funnel.confirmed_visits).toBe('number');
    expect(typeof data.funnel.app_opens).toBe('number');
    expect(Array.isArray(data.top_stations)).toBe(true);
    expect(Array.isArray(data.top_brands)).toBe(true);
    expect(Array.isArray(data.fuel_distribution)).toBe(true);
    expect(Array.isArray(data.device_breakdown)).toBe(true);
    expect(Array.isArray(data.daily_traffic)).toBe(true);
  });
});
