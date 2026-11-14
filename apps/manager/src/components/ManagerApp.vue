<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import {
  Shield,
  KeyRound,
  TrendingUp,
  Users,
  Activity,
  Navigation,
  CheckCircle2,
  Calendar,
  LogOut,
  RefreshCw,
  Fuel,
  Smartphone,
  MapPin,
  Flame,
  ArrowRight,
  Database,
} from 'lucide-vue-next';
import gsap from 'gsap';

interface FunnelMetrics {
  app_opens: u64;
  searches: u64;
  details_viewed: u64;
  navigations_started: u64;
  confirmed_visits: u64;
  refuels_logged: u64;
  search_to_nav_rate: number;
  nav_to_visit_rate: number;
}

type u64 = number;

interface TopStationItem {
  station_id: string;
  brand: string;
  province: string;
  visits_count: number;
}

interface TopBrandItem {
  brand: string;
  visits_count: number;
  share_pct: number;
}

interface FuelStatItem {
  fuel_type: string;
  count: number;
  share_pct: number;
}

interface DeviceStatItem {
  device_mode: string;
  count: number;
  share_pct: number;
}

interface DailyTrafficItem {
  date: string;
  sessions: number;
  confirmed_visits: number;
}

interface StatsResponse {
  ok: boolean;
  timeframe_days: number;
  unique_users: number;
  total_sessions: number;
  pwa_percentage: number;
  funnel: FunnelMetrics;
  top_stations: TopStationItem[];
  top_brands: TopBrandItem[];
  fuel_distribution: FuelStatItem[];
  device_breakdown: DeviceStatItem[];
  daily_traffic: DailyTrafficItem[];
  storage_mode: string;
}

const STORAGE_TOKEN_KEY = 'llenoporfa_manager_token';

const token = ref<string>('');
const inputSecret = ref<string>('');
const timeframeDays = ref<number>(30);
const stats = ref<StatsResponse | null>(null);
const loading = ref<boolean>(false);
const authError = ref<string | null>(null);
const activeTooltipIndex = ref<number | null>(null);

const isAuthenticated = computed(() => !!token.value);

onMounted(() => {
  if (typeof window !== 'undefined') {
    const saved = sessionStorage.getItem(STORAGE_TOKEN_KEY);
    if (saved) {
      token.value = saved;
      fetchStats();
    }
  }
});

const handleLogin = async () => {
  if (!inputSecret.value.trim()) return;
  authError.value = null;
  loading.value = true;

  try {
    const candidate = inputSecret.value.trim();
    const res = await fetch(`/api/register/stats?days=${timeframeDays.value}`, {
      headers: {
        Authorization: `Bearer ${candidate}`,
      },
    });

    if (res.status === 401) {
      authError.value = 'Clave de acceso incorrecta. Verificá tu MANAGER_SECRET.';
      return;
    }

    if (!res.ok) {
      authError.value = `Error en el servidor: HTTP ${res.status}`;
      return;
    }

    const data: StatsResponse = await res.json();
    token.value = candidate;
    sessionStorage.setItem(STORAGE_TOKEN_KEY, candidate);
    stats.value = data;
    animateDashboard();
  } catch (err: any) {
    authError.value = 'No se pudo conectar con el servidor de telemetría.';
  } finally {
    loading.value = false;
  }
};

const handleLogout = () => {
  token.value = '';
  stats.value = null;
  inputSecret.value = '';
  sessionStorage.removeItem(STORAGE_TOKEN_KEY);
};

const fetchStats = async () => {
  if (!token.value) return;
  loading.value = true;

  try {
    const res = await fetch(`/api/register/stats?days=${timeframeDays.value}`, {
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    });

    if (res.status === 401) {
      handleLogout();
      authError.value = 'Tu sesión ha expirado o la clave cambió.';
      return;
    }

    if (res.ok) {
      stats.value = await res.json();
      animateDashboard();
    }
  } catch (e) {
    console.error('Error fetching manager stats', e);
  } finally {
    loading.value = false;
  }
};

watch(timeframeDays, () => {
  fetchStats();
});

const animateDashboard = () => {
  nextTick(() => {
    const bars = document.querySelectorAll('.funnel-bar-fill');
    if (bars.length > 0) {
      gsap.fromTo(
        bars,
        { scaleX: 0, transformOrigin: 'left' },
        { scaleX: 1, duration: 0.8, stagger: 0.08, ease: 'power2.out' }
      );
    }
    const cards = document.querySelectorAll('.kpi-card');
    if (cards.length > 0) {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' }
      );
    }
  });
};

// SVG Chart Geometry
const chartWidth = 600;
const chartHeight = 180;
const chartPadX = 30;
const chartPadTop = 20;
const chartPadBottom = 30;

const dailyMax = computed(() => {
  if (!stats.value || stats.value.daily_traffic.length === 0) return 300;
  const vals = stats.value.daily_traffic.map((d) => d.sessions);
  return Math.max(...vals, 100);
});

const chartPoints = computed(() => {
  if (!stats.value || stats.value.daily_traffic.length < 2) return [];
  const list = stats.value.daily_traffic;
  const max = dailyMax.value;
  const availW = chartWidth - chartPadX * 2;
  const availH = chartHeight - chartPadTop - chartPadBottom;

  return list.map((item, idx) => {
    const x = chartPadX + (idx / (list.length - 1)) * availW;
    const ySession = chartHeight - chartPadBottom - (item.sessions / max) * availH;
    const yVisits = chartHeight - chartPadBottom - (item.confirmed_visits / max) * availH;
    return { x, ySession, yVisits, item };
  });
});

const sessionsPathD = computed(() => {
  const pts = chartPoints.value;
  if (pts.length < 2) return '';
  return pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.ySession.toFixed(1)}`, '');
});

const visitsPathD = computed(() => {
  const pts = chartPoints.value;
  if (pts.length < 2) return '';
  return pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.yVisits.toFixed(1)}`, '');
});

const activeChartTooltip = computed(() => {
  if (activeTooltipIndex.value === null) return null;
  return chartPoints.value[activeTooltipIndex.value] || null;
});
</script>

<template>
  <div class="manager-root">
    <!-- 1. LOGIN SCREEN -->
    <div v-if="!isAuthenticated" class="login-view">
      <div class="login-card">
        <div class="login-header">
          <div class="shield-badge">
            <Shield :size="28" />
          </div>
          <h1>llenoPorfa Manager</h1>
          <p>Panel Ejecutivo de Telemetría, Visitas y Conversión</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label>Clave de Administrador (MANAGER_SECRET)</label>
            <div class="input-wrap">
              <KeyRound :size="18" class="input-icon" />
              <input
                v-model="inputSecret"
                type="password"
                required
                placeholder="Ingresá la clave de acceso..."
                class="login-input"
                autofocus
              />
            </div>
          </div>

          <div v-if="authError" class="auth-error-banner">
            {{ authError }}
          </div>

          <button type="submit" class="login-submit-btn" :disabled="loading">
            <span v-if="loading">Autenticando...</span>
            <span v-else>Acceder al Panel</span>
            <ArrowRight :size="16" />
          </button>
        </form>

        <p class="login-hint">
          Por defecto en desarrollo: <code>llenoporfa_admin_2026</code> o el valor de <code>MANAGER_SECRET</code> en Vercel.
        </p>
      </div>
    </div>

    <!-- 2. DASHBOARD VIEW -->
    <div v-else-if="stats" class="dashboard-view">
      <!-- Top Navigation Bar -->
      <header class="manager-nav">
        <div class="brand-block">
          <div class="brand-title">
            <Flame :size="20" class="text-primary" />
            <h2>llenoPorfa Analytics</h2>
          </div>
          <span class="storage-badge" :class="stats.storage_mode">
            <Database :size="12" />
            <span>{{ stats.storage_mode === 'turso_database' ? 'Turso libSQL' : 'Modo Registro Seguro' }}</span>
          </span>
        </div>

        <div class="nav-controls">
          <!-- Timeframe selector -->
          <div class="timeframe-toggle">
            <button
              :class="{ active: timeframeDays === 7 }"
              @click="timeframeDays = 7"
            >
              7 Días
            </button>
            <button
              :class="{ active: timeframeDays === 30 }"
              @click="timeframeDays = 30"
            >
              30 Días
            </button>
            <button
              :class="{ active: timeframeDays === 90 }"
              @click="timeframeDays = 90"
            >
              90 Días
            </button>
          </div>

          <button class="nav-action-btn" @click="fetchStats" title="Recargar métricas">
            <RefreshCw :size="16" :class="{ spin: loading }" />
          </button>

          <button class="nav-action-btn logout" @click="handleLogout" title="Cerrar sesión">
            <LogOut :size="16" />
          </button>
        </div>
      </header>

      <!-- Main Dashboard Content -->
      <main class="dashboard-content">
        <!-- KPI Cards Grid -->
        <section class="kpi-grid">
          <div class="kpi-card users">
            <div class="kpi-icon-wrap">
              <Users :size="20" />
            </div>
            <div class="kpi-body">
              <span class="kpi-title">Usuarios Activos</span>
              <strong class="kpi-num">{{ stats.unique_users.toLocaleString() }}</strong>
              <span class="kpi-sub">Dispositivos únicos verificados</span>
            </div>
          </div>

          <div class="kpi-card sessions">
            <div class="kpi-icon-wrap">
              <Activity :size="20" />
            </div>
            <div class="kpi-body">
              <span class="kpi-title">Sesiones Totales</span>
              <strong class="kpi-num">{{ stats.total_sessions.toLocaleString() }}</strong>
              <span class="kpi-sub highlight-pwa">📱 {{ stats.pwa_percentage }}% en PWA instalada</span>
            </div>
          </div>

          <div class="kpi-card nav-rate">
            <div class="kpi-icon-wrap">
              <Navigation :size="20" />
            </div>
            <div class="kpi-body">
              <span class="kpi-title">Intención de Ruta</span>
              <strong class="kpi-num">{{ stats.funnel.search_to_nav_rate }}%</strong>
              <span class="kpi-sub">De búsquedas a abrir Maps/Waze</span>
            </div>
          </div>

          <div class="kpi-card visits">
            <div class="kpi-icon-wrap">
              <CheckCircle2 :size="20" />
            </div>
            <div class="kpi-body">
              <span class="kpi-title">Visitas Físicas Confirmadas</span>
              <strong class="kpi-num text-primary">{{ stats.funnel.confirmed_visits.toLocaleString() }}</strong>
              <span class="kpi-sub">Llegada a surtidor (Haversine &lt;= 120m)</span>
            </div>
          </div>
        </section>

        <!-- Conversion Funnel Section -->
        <section class="dashboard-section funnel-section">
          <div class="section-heading">
            <div class="heading-title">
              <TrendingUp :size="18" class="text-primary" />
              <h3>Embudo de Conversión de Usuario</h3>
            </div>
            <span class="heading-sub">Desde la apertura de la app hasta el repostaje guardado</span>
          </div>

          <div class="funnel-steps">
            <div class="funnel-step">
              <div class="step-meta">
                <span class="step-label">1. Aperturas de App</span>
                <strong>{{ stats.funnel.app_opens.toLocaleString() }}</strong>
              </div>
              <div class="funnel-bar-track">
                <div class="funnel-bar-fill f1" style="width: 100%;"></div>
              </div>
              <span class="step-pct">100%</span>
            </div>

            <div class="funnel-step">
              <div class="step-meta">
                <span class="step-label">2. Búsquedas y Filtros</span>
                <strong>{{ stats.funnel.searches.toLocaleString() }}</strong>
              </div>
              <div class="funnel-bar-track">
                <div
                  class="funnel-bar-fill f2"
                  :style="{ width: `${(stats.funnel.searches / stats.funnel.app_opens) * 100}%` }"
                ></div>
              </div>
              <span class="step-pct">{{ ((stats.funnel.searches / stats.funnel.app_opens) * 100).toFixed(1) }}%</span>
            </div>

            <div class="funnel-step">
              <div class="step-meta">
                <span class="step-label">3. Ficha de Gasolinera Abierta</span>
                <strong>{{ stats.funnel.details_viewed.toLocaleString() }}</strong>
              </div>
              <div class="funnel-bar-track">
                <div
                  class="funnel-bar-fill f3"
                  :style="{ width: `${(stats.funnel.details_viewed / stats.funnel.app_opens) * 100}%` }"
                ></div>
              </div>
              <span class="step-pct">{{ ((stats.funnel.details_viewed / stats.funnel.app_opens) * 100).toFixed(1) }}%</span>
            </div>

            <div class="funnel-step">
              <div class="step-meta">
                <span class="step-label">4. Clic en "Cómo llegar" (GPS)</span>
                <strong>{{ stats.funnel.navigations_started.toLocaleString() }}</strong>
              </div>
              <div class="funnel-bar-track">
                <div
                  class="funnel-bar-fill f4"
                  :style="{ width: `${(stats.funnel.navigations_started / stats.funnel.app_opens) * 100}%` }"
                ></div>
              </div>
              <span class="step-pct">{{ ((stats.funnel.navigations_started / stats.funnel.app_opens) * 100).toFixed(1) }}%</span>
            </div>

            <div class="funnel-step highlight">
              <div class="step-meta">
                <span class="step-label">5. Llegada Física al Surtidor</span>
                <strong class="text-primary">{{ stats.funnel.confirmed_visits.toLocaleString() }}</strong>
              </div>
              <div class="funnel-bar-track">
                <div
                  class="funnel-bar-fill f5"
                  :style="{ width: `${(stats.funnel.confirmed_visits / stats.funnel.app_opens) * 100}%` }"
                ></div>
              </div>
              <span class="step-pct">{{ ((stats.funnel.confirmed_visits / stats.funnel.app_opens) * 100).toFixed(1) }}%</span>
            </div>

            <div class="funnel-step">
              <div class="step-meta">
                <span class="step-label">6. Repostaje Registrado</span>
                <strong>{{ stats.funnel.refuels_logged.toLocaleString() }}</strong>
              </div>
              <div class="funnel-bar-track">
                <div
                  class="funnel-bar-fill f6"
                  :style="{ width: `${(stats.funnel.refuels_logged / stats.funnel.app_opens) * 100}%` }"
                ></div>
              </div>
              <span class="step-pct">{{ ((stats.funnel.refuels_logged / stats.funnel.app_opens) * 100).toFixed(1) }}%</span>
            </div>
          </div>
        </section>

        <!-- Daily Traffic & Physical Visits SVG Chart -->
        <section class="dashboard-section chart-section">
          <div class="section-heading">
            <div class="heading-title">
              <Calendar :size="18" class="text-primary" />
              <h3>Evolución de Tráfico y Visitas Físicas</h3>
            </div>
            <div class="chart-legend">
              <div class="legend-item">
                <span class="dot-session"></span>
                <span>Sesiones de Usuario</span>
              </div>
              <div class="legend-item">
                <span class="dot-visit"></span>
                <span>Visitas al Surtidor</span>
              </div>
            </div>
          </div>

          <div
            class="svg-container"
            @mouseleave="activeTooltipIndex = null"
          >
            <svg
              viewBox="0 0 600 180"
              class="traffic-svg"
              preserveAspectRatio="none"
            >
              <!-- Grid lines -->
              <line x1="30" y1="20" x2="570" y2="20" stroke="var(--border-color)" stroke-dasharray="3,3" />
              <line x1="30" y1="85" x2="570" y2="85" stroke="var(--border-color)" stroke-dasharray="3,3" />
              <line x1="30" y1="150" x2="570" y2="150" stroke="var(--border-color)" stroke-dasharray="3,3" />

              <!-- Sessions line (Blue) -->
              <path
                :d="sessionsPathD"
                fill="none"
                stroke="#3b82f6"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />

              <!-- Confirmed visits line (Emerald) -->
              <path
                :d="visitsPathD"
                fill="none"
                stroke="#10b981"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />

              <!-- Interactive points -->
              <g
                v-for="(pt, idx) in chartPoints"
                :key="idx"
                @mouseenter="activeTooltipIndex = idx"
              >
                <circle :cx="pt.x" :cy="pt.ySession" r="4" fill="#3b82f6" />
                <circle :cx="pt.x" :cy="pt.yVisits" r="4" fill="#10b981" />
                <circle :cx="pt.x" :cy="pt.ySession" r="14" fill="transparent" />
              </g>

              <!-- Scrubber line -->
              <line
                v-if="activeChartTooltip"
                :x1="activeChartTooltip.x"
                y1="10"
                :x2="activeChartTooltip.x"
                y2="160"
                stroke="rgba(255, 255, 255, 0.4)"
                stroke-width="1.5"
                stroke-dasharray="2,2"
              />
            </svg>

            <!-- Tooltip -->
            <div
              v-if="activeChartTooltip"
              class="chart-tooltip"
              :style="{ left: `${(activeChartTooltip.x / chartWidth) * 100}%` }"
            >
              <div class="tooltip-date">{{ activeChartTooltip.item.date }}</div>
              <div class="tooltip-row blue">
                <span>Sesiones:</span>
                <strong>{{ activeChartTooltip.item.sessions }}</strong>
              </div>
              <div class="tooltip-row green">
                <span>Visitas surtidor:</span>
                <strong>{{ activeChartTooltip.item.confirmed_visits }}</strong>
              </div>
            </div>
          </div>
        </section>

        <!-- Two Columns Data Tables Grid -->
        <div class="tables-grid">
          <!-- Top Visited Stations -->
          <div class="dashboard-section table-card">
            <div class="section-heading">
              <div class="heading-title">
                <MapPin :size="18" class="text-primary" />
                <h3>Top Gasolineras Más Concurridas</h3>
              </div>
            </div>

            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Estación / Rótulo</th>
                    <th>Provincia</th>
                    <th class="text-right">Visitas Físicas</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(st, idx) in stats.top_stations" :key="st.station_id">
                    <td class="brand-cell">
                      <span class="rank-num">#{{ idx + 1 }}</span>
                      <strong>{{ st.brand }}</strong>
                    </td>
                    <td>{{ st.province }}</td>
                    <td class="text-right font-mono font-bold text-primary">
                      {{ st.visits_count.toLocaleString() }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Top Brands Share -->
          <div class="dashboard-section table-card">
            <div class="section-heading">
              <div class="heading-title">
                <Flame :size="18" class="text-primary" />
                <h3>Cuota de Visitas por Marca</h3>
              </div>
            </div>

            <div class="brands-list">
              <div v-for="b in stats.top_brands" :key="b.brand" class="brand-item">
                <div class="brand-meta">
                  <span class="brand-name">{{ b.brand }}</span>
                  <span class="brand-val">{{ b.visits_count }} visitas ({{ b.share_pct }}%)</span>
                </div>
                <div class="brand-track">
                  <div class="brand-fill" :style="{ width: `${b.share_pct}%` }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Fuel Search Distribution -->
          <div class="dashboard-section table-card">
            <div class="section-heading">
              <div class="heading-title">
                <Fuel :size="18" class="text-primary" />
                <h3>Carburantes Más Demandados</h3>
              </div>
            </div>

            <div class="fuels-list">
              <div v-for="f in stats.fuel_distribution" :key="f.fuel_type" class="fuel-item">
                <div class="fuel-meta">
                  <span class="fuel-name">{{ f.fuel_type }}</span>
                  <strong class="fuel-val">{{ f.share_pct }}%</strong>
                </div>
                <div class="fuel-track">
                  <div class="fuel-fill" :style="{ width: `${f.share_pct}%` }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Device & PWA Breakdown -->
          <div class="dashboard-section table-card">
            <div class="section-heading">
              <div class="heading-title">
                <Smartphone :size="18" class="text-primary" />
                <h3>Dispositivos y Plataformas</h3>
              </div>
            </div>

            <div class="devices-list">
              <div v-for="d in stats.device_breakdown" :key="d.device_mode" class="device-item">
                <div class="device-meta">
                  <span class="device-name">{{ d.device_mode }}</span>
                  <strong class="device-val">{{ d.share_pct }}%</strong>
                </div>
                <div class="device-track">
                  <div class="device-fill" :style="{ width: `${d.share_pct}%` }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

.manager-root {
  min-height: 100vh;
  background-color: var(--bg-page);
  color: var(--text-main);
}

// 1. Login View
.login-view {
  min-height: 100vh;
  @include flex-center;
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 440px;
  @include card-surface;
  padding: 36px 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow: var(--shadow-lg);

  .login-header {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;

    .shield-badge {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-xl);
      background: var(--color-primary-light);
      color: var(--color-primary);
      @include flex-center;
      margin-bottom: 6px;
    }

    h1 {
      font-size: 1.45rem;
      font-weight: 800;
      color: var(--text-main);
    }

    p {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 16px;

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        font-size: 0.775rem;
        font-weight: 700;
        color: var(--text-muted);
      }

      .input-wrap {
        position: relative;
        display: flex;
        align-items: center;

        .input-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
        }

        .login-input {
          width: 100%;
          padding: 11px 12px 11px 40px;
          background: var(--bg-surface-subtle);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-main);
          font-size: 0.9rem;
          transition: border-color var(--transition-fast);

          &:focus {
            outline: none;
            border-color: var(--color-primary);
            box-shadow: 0 0 0 2px var(--color-primary-glow);
          }
        }
      }
    }

    .auth-error-banner {
      padding: 10px 12px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: var(--radius-md);
      color: #ef4444;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .login-submit-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 20px;
      background: var(--color-primary);
      color: #ffffff;
      border-radius: var(--radius-md);
      font-weight: 700;
      font-size: 0.925rem;
      box-shadow: 0 4px 14px var(--color-primary-glow);
      transition: all var(--transition-fast);

      &:hover:not(:disabled) {
        background: var(--color-primary-dark);
        transform: translateY(-1px);
      }
    }
  }

  .login-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-align: center;
    line-height: 1.4;

    code {
      background: var(--bg-surface-subtle);
      padding: 2px 5px;
      border-radius: var(--radius-sm);
      color: var(--color-primary);
    }
  }
}

// 2. Dashboard View
.dashboard-view {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.manager-nav {
  padding: 14px 24px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  @include flex-between;
  flex-wrap: wrap;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 50;

  .brand-block {
    display: flex;
    align-items: center;
    gap: 14px;

    .brand-title {
      display: flex;
      align-items: center;
      gap: 8px;

      h2 {
        font-size: 1.15rem;
        font-weight: 800;
        color: var(--text-main);
      }
    }

    .storage-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: var(--radius-full);
      font-size: 0.7rem;
      font-weight: 700;

      &.turso_database {
        background: rgba(16, 185, 129, 0.15);
        color: var(--color-primary);
        border: 1px solid rgba(16, 185, 129, 0.3);
      }
      &.degraded_logging {
        background: rgba(59, 130, 246, 0.15);
        color: #3b82f6;
        border: 1px solid rgba(59, 130, 246, 0.3);
      }
    }
  }

  .nav-controls {
    display: flex;
    align-items: center;
    gap: 10px;

    .timeframe-toggle {
      display: flex;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-full);
      padding: 3px;

      button {
        padding: 5px 12px;
        border-radius: var(--radius-full);
        font-size: 0.775rem;
        font-weight: 700;
        color: var(--text-muted);
        transition: all var(--transition-fast);

        &.active {
          background: var(--color-primary);
          color: #ffffff;
        }
      }
    }

    .nav-action-btn {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      @include flex-center;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--text-main);
        background: var(--border-color);
      }

      &.logout:hover {
        color: #ef4444;
      }
    }
  }
}

.dashboard-content {
  flex: 1;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

// KPI Grid
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;

  @include mobile {
    grid-template-columns: repeat(2, 1fr);
  }
}

.kpi-card {
  @include card-surface;
  padding: 16px 18px;
  display: flex;
  align-items: flex-start;
  gap: 14px;

  .kpi-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-lg);
    @include flex-center;
    flex-shrink: 0;
  }

  &.users .kpi-icon-wrap { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
  &.sessions .kpi-icon-wrap { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
  &.nav-rate .kpi-icon-wrap { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
  &.visits .kpi-icon-wrap { background: rgba(16, 185, 129, 0.15); color: #10b981; }

  .kpi-body {
    display: flex;
    flex-direction: column;

    .kpi-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .kpi-num {
      font-size: 1.65rem;
      font-weight: 900;
      font-family: var(--font-mono);
      color: var(--text-main);
      line-height: 1.2;
    }

    .kpi-sub {
      font-size: 0.725rem;
      color: var(--text-muted);
      margin-top: 2px;

      &.highlight-pwa {
        color: var(--color-primary);
        font-weight: 600;
      }
    }
  }
}

// Common Dashboard Section
.dashboard-section {
  @include card-surface;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .section-heading {
    @include flex-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;

    .heading-title {
      display: flex;
      align-items: center;
      gap: 8px;

      h3 {
        font-size: 1.05rem;
        font-weight: 800;
        color: var(--text-main);
      }
    }

    .heading-sub {
      font-size: 0.775rem;
      color: var(--text-muted);
    }
  }
}

// Funnel Section
.funnel-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .funnel-step {
    display: flex;
    align-items: center;
    gap: 14px;

    &.highlight {
      .step-meta strong {
        color: var(--color-primary);
      }
      .funnel-bar-fill {
        box-shadow: 0 0 12px var(--color-primary-glow);
      }
    }

    .step-meta {
      width: 240px;
      display: flex;
      justify-content: space-between;
      font-size: 0.825rem;
      flex-shrink: 0;

      .step-label {
        color: var(--text-muted);
      }

      strong {
        font-family: var(--font-mono);
        color: var(--text-main);
      }
    }

    .funnel-bar-track {
      flex: 1;
      height: 18px;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-sm);
      overflow: hidden;

      .funnel-bar-fill {
        height: 100%;
        border-radius: var(--radius-sm);
        transition: width 0.6s ease;

        &.f1 { background: #3b82f6; }
        &.f2 { background: #6366f1; }
        &.f3 { background: #8b5cf6; }
        &.f4 { background: #d97706; }
        &.f5 { background: #10b981; }
        &.f6 { background: #059669; }
      }
    }

    .step-pct {
      width: 55px;
      text-align: right;
      font-size: 0.775rem;
      font-family: var(--font-mono);
      font-weight: 700;
      color: var(--text-muted);
      flex-shrink: 0;
    }
  }
}

// SVG Chart Section
.chart-section {
  .chart-legend {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 0.75rem;
    font-weight: 600;

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;

      span.dot-session {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #3b82f6;
      }
      span.dot-visit {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #10b981;
      }
    }
  }

  .svg-container {
    position: relative;
    width: 100%;
    height: 180px;

    .traffic-svg {
      width: 100%;
      height: 100%;
    }

    .chart-tooltip {
      position: absolute;
      top: -10px;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid var(--border-color);
      backdrop-filter: blur(8px);
      padding: 8px 12px;
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);
      pointer-events: none;
      z-index: 10;
      min-width: 120px;

      .tooltip-date {
        font-size: 0.7rem;
        color: var(--text-muted);
        margin-bottom: 4px;
        font-weight: 700;
      }

      .tooltip-row {
        @include flex-between;
        font-size: 0.75rem;
        gap: 8px;

        &.blue strong { color: #3b82f6; font-family: var(--font-mono); }
        &.green strong { color: #10b981; font-family: var(--font-mono); }
      }
    }
  }
}

// Tables Grid
.tables-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @include mobile {
    grid-template-columns: 1fr;
  }
}

.table-wrap {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.825rem;

  th {
    text-align: left;
    padding: 8px 10px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-muted);
    font-size: 0.725rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  td {
    padding: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    color: var(--text-main);
  }

  .brand-cell {
    display: flex;
    align-items: center;
    gap: 8px;

    .rank-num {
      font-size: 0.7rem;
      font-weight: 800;
      color: var(--text-muted);
      width: 20px;
    }
  }

  .text-right {
    text-align: right;
  }
}

.brands-list, .fuels-list, .devices-list {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .brand-item, .fuel-item, .device-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .brand-meta, .fuel-meta, .device-meta {
      @include flex-between;
      font-size: 0.8rem;

      .brand-name, .fuel-name, .device-name {
        font-weight: 600;
      }

      .brand-val, .fuel-val, .device-val {
        color: var(--text-muted);
        font-family: var(--font-mono);
      }
    }

    .brand-track, .fuel-track, .device-track {
      width: 100%;
      height: 6px;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-full);
      overflow: hidden;

      .brand-fill, .fuel-fill, .device-fill {
        height: 100%;
        background: var(--color-primary);
        border-radius: var(--radius-full);
      }
    }
  }
}
</style>
