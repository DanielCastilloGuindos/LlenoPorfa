<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  AlertTriangle,
  Info,
  Calendar,
  Fuel,
  Droplets,
  DollarSign,
  Scale,
} from 'lucide-vue-next';
import type { FuelId, DailyMarketPoint } from '../types';
import { useMarket } from '../composables/useMarket';
import { useStations } from '../composables/useStations';
import { useHaptics } from '../composables/useHaptics';
import gsap from 'gsap';

const { marketData, isBarometerOpen, closeBarometer, fetchMarketData } = useMarket();
const { stats: stationsStats, fuel: currentFuelFilter } = useStations();
const { light } = useHaptics();

const modalSheet = ref<HTMLElement | null>(null);
const selectedFuel = ref<'g95_e5' | 'diesel_a'>('g95_e5');
const activeTooltipIndex = ref<number | null>(null);

// Sync fuel with user's current fuel preference on mount
onMounted(() => {
  if (currentFuelFilter.value === 'diesel_a' || currentFuelFilter.value === 'diesel_premium') {
    selectedFuel.value = 'diesel_a';
  } else {
    selectedFuel.value = 'g95_e5';
  }

  // Refresh market data with client's average prices if available
  const avgG95 = stationsStats.value.avgPrice && (currentFuelFilter.value === 'g95_e5' || currentFuelFilter.value === 'g98_e5')
    ? stationsStats.value.avgPrice
    : undefined;
  const avgDiesel = stationsStats.value.avgPrice && (currentFuelFilter.value === 'diesel_a' || currentFuelFilter.value === 'diesel_premium')
    ? stationsStats.value.avgPrice
    : undefined;

  fetchMarketData(avgG95, avgDiesel);
});

const fuelDetails = computed(() => {
  if (!marketData.value) return null;
  return marketData.value.fuels[selectedFuel.value];
});

const historyPoints = computed<DailyMarketPoint[]>(() => {
  if (!marketData.value || !marketData.value.history) return [];
  return marketData.value.history;
});

// Touch swipe to dismiss on mobile
let startY = 0;
let currentY = 0;
let isDragging = false;

const onTouchStart = (e: TouchEvent) => {
  startY = e.touches[0].clientY;
  isDragging = true;
};

const onTouchMove = (e: TouchEvent) => {
  if (!isDragging || !modalSheet.value) return;
  currentY = e.touches[0].clientY;
  const deltaY = currentY - startY;
  if (deltaY > 0) {
    gsap.set(modalSheet.value, { y: deltaY, force3D: true });
  }
};

const onTouchEnd = () => {
  if (!isDragging || !modalSheet.value) return;
  isDragging = false;
  const deltaY = currentY - startY;
  if (deltaY > 90) {
    handleClose();
  } else {
    gsap.to(modalSheet.value, { y: 0, duration: 0.22, ease: 'power2.out', force3D: true });
  }
};

const handleClose = () => {
  light();
  if (modalSheet.value) {
    gsap.to(modalSheet.value, {
      y: 350,
      opacity: 0,
      duration: 0.22,
      ease: 'power2.in',
      force3D: true,
      onComplete: () => {
        closeBarometer();
        if (modalSheet.value) {
          gsap.set(modalSheet.value, { y: 0, opacity: 1 });
        }
      },
    });
  } else {
    closeBarometer();
  }
};

watch(isBarometerOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      if (modalSheet.value) {
        gsap.fromTo(
          modalSheet.value,
          { y: 80, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.28, ease: 'power3.out', force3D: true }
        );
      }
      animateChart();
    });
  }
});

const animateChart = () => {
  nextTick(() => {
    const path = document.querySelector('.chart-line-path');
    if (path) {
      const length = (path as SVGGeometryElement).getTotalLength?.() || 1000;
      gsap.fromTo(
        path,
        { strokeDasharray: length, strokeDashoffset: length },
        { strokeDashoffset: 0, duration: 1.1, ease: 'power2.out' }
      );
    }
    const area = document.querySelector('.chart-area-path');
    if (area) {
      gsap.fromTo(area, { opacity: 0 }, { opacity: 0.45, duration: 1.2, ease: 'power1.out' });
    }
  });
};

// SVG Chart Geometry calculations
const chartWidth = 500;
const chartHeight = 160;
const paddingX = 25;
const paddingTop = 20;
const paddingBottom = 25;

const chartStats = computed(() => {
  const pts = historyPoints.value;
  if (pts.length === 0) return { min: 0.4, max: 0.6, range: 0.2 };
  const vals = pts.map((p) => p.crude_eur_liter);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 0.05;
  return { min, max, range };
});

const chartPoints = computed(() => {
  const pts = historyPoints.value;
  if (pts.length < 2) return [];

  const { min, range } = chartStats.value;
  const availableWidth = chartWidth - paddingX * 2;
  const availableHeight = chartHeight - paddingTop - paddingBottom;

  return pts.map((p, index) => {
    const x = paddingX + (index / (pts.length - 1)) * availableWidth;
    const normalizedY = (p.crude_eur_liter - min) / range;
    const y = chartHeight - paddingBottom - normalizedY * availableHeight;
    return { x, y, raw: p };
  });
});

const linePathD = computed(() => {
  const pts = chartPoints.value;
  if (pts.length < 2) return '';

  // Generate smooth cubic bezier SVG path
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
});

const areaPathD = computed(() => {
  const pts = chartPoints.value;
  if (pts.length < 2) return '';
  const line = linePathD.value;
  const bottomY = chartHeight - paddingBottom;
  const lastX = pts[pts.length - 1].x;
  const firstX = pts[0].x;
  return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
});

const activeTooltipPoint = computed(() => {
  if (activeTooltipIndex.value === null) return null;
  return chartPoints.value[activeTooltipIndex.value] || null;
});

const onChartHover = (index: number) => {
  activeTooltipIndex.value = index;
};

const onChartTouch = (e: TouchEvent) => {
  if (chartPoints.value.length === 0) return;
  const svg = e.currentTarget as SVGElement;
  const rect = svg.getBoundingClientRect();
  const touchX = e.touches[0].clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, touchX / rect.width));
  const idx = Math.round(ratio * (chartPoints.value.length - 1));
  activeTooltipIndex.value = idx;
};
</script>

<template>
  <div v-if="isBarometerOpen" class="modal-backdrop" @click.self="handleClose">
    <div
      ref="modalSheet"
      class="barometer-sheet"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- Drag handle for mobile -->
      <div class="drag-handle-bar">
        <div class="handle"></div>
      </div>

      <!-- Header -->
      <div class="sheet-header">
        <div class="header-titles">
          <div class="title-badge-row">
            <span class="badge-icon">🛢️</span>
            <h2>Barómetro del Crudo e Impuestos</h2>
          </div>
          <p class="subtitle">
            Evolución del petróleo Brent puro en euros y desglose oficial de impuestos en España.
          </p>
        </div>

        <button class="close-btn" @click="handleClose" aria-label="Cerrar modal">
          <X :size="20" />
        </button>
      </div>

      <div v-if="marketData" class="sheet-content">
        <!-- 1. Real-Time Market Metric Hero Cards -->
        <div class="metric-hero-grid">
          <div class="metric-hero-card crude">
            <div class="metric-top">
              <span class="metric-label">Coste Litro Crudo Puro</span>
              <span class="metric-badge" :class="marketData.trend">
                <TrendingUp v-if="marketData.trend === 'rising'" :size="12" />
                <TrendingDown v-else-if="marketData.trend === 'falling'" :size="12" />
                <Minus v-else :size="12" />
                <span>{{ marketData.delta_7d_pct > 0 ? '+' : '' }}{{ marketData.delta_7d_pct }}% (7d)</span>
              </span>
            </div>
            <div class="metric-main">
              <strong class="metric-val">{{ marketData.crude_eur_liter.toFixed(3) }}</strong>
              <span class="metric-unit">€/L</span>
            </div>
            <div class="metric-sub">
              <span>Barril Brent: <strong>${{ marketData.brent_usd.toFixed(2) }}</strong></span>
              <span>•</span>
              <span>Cambio EUR/USD: <strong>{{ marketData.eur_usd.toFixed(4) }}</strong></span>
            </div>
          </div>

          <div class="metric-hero-card barrel">
            <div class="metric-top">
              <span class="metric-label">Barril en Euros (159 Litros)</span>
              <span class="metric-badge-neutral">
                {{ marketData.delta_24h_pct >= 0 ? '+' : '' }}{{ marketData.delta_24h_pct }}% hoy
              </span>
            </div>
            <div class="metric-main">
              <strong class="metric-val">{{ marketData.crude_eur_barrel.toFixed(2) }}</strong>
              <span class="metric-unit">€/barril</span>
            </div>
            <div class="metric-sub">
              <span>Actualizado diariamente con cierre de mercado</span>
            </div>
          </div>
        </div>

        <!-- 2. Recommendation & Alert Banner (Rocket/Feather Effect) -->
        <div class="recommendation-banner" :class="marketData.trend">
          <div class="banner-icon-wrap">
            <AlertTriangle v-if="marketData.trend === 'rising'" :size="20" />
            <Sparkles v-else-if="marketData.trend === 'falling'" :size="20" />
            <Info v-else :size="20" />
          </div>
          <div class="banner-text">
            <strong>
              {{
                marketData.trend === 'rising'
                  ? 'Alerta de Subida: Crudo al alza esta semana'
                  : marketData.trend === 'falling'
                  ? 'Oportunidad: Crudo a la baja'
                  : 'Mercado Internacional Estable'
              }}
            </strong>
            <p>{{ marketData.trend_message }}</p>
          </div>
        </div>

        <!-- 3. Fuel Selector Toggle -->
        <div class="fuel-selector-section">
          <div class="section-title-wrap">
            <h3>Desglose Oficial de 1 Litro en Surtidor</h3>
            <span class="section-hint">Seleccioná el carburante para ver impuestos aplicados</span>
          </div>

          <div class="segmented-control">
            <button
              class="segment-btn"
              :class="{ active: selectedFuel === 'g95_e5' }"
              @click="selectedFuel = 'g95_e5'; light()"
            >
              <span>Gasolina 95 E5</span>
            </button>
            <button
              class="segment-btn"
              :class="{ active: selectedFuel === 'diesel_a' }"
              @click="selectedFuel = 'diesel_a'; light()"
            >
              <span>Gasóleo A (Diésel)</span>
            </button>
          </div>
        </div>

        <!-- 4. Stacked Visual 1-Liter Bar (Animated) -->
        <div v-if="fuelDetails" class="stacked-bar-container">
          <div class="bar-total-row">
            <span class="total-label">PVP de referencia / media:</span>
            <strong class="total-price">{{ fuelDetails.pvp.toFixed(3) }} €/L</strong>
          </div>

          <!-- Horizontal Segmented Bar -->
          <div class="stacked-bar">
            <!-- Crude Brent -->
            <div
              class="segment segment-crude"
              :style="{ width: `${fuelDetails.breakdown.crude_pct}%` }"
              :title="`Crudo puro: ${fuelDetails.breakdown.crude_cost.toFixed(3)}€ (${fuelDetails.breakdown.crude_pct}%)`"
            >
              <span v-if="fuelDetails.breakdown.crude_pct > 12">{{ fuelDetails.breakdown.crude_pct }}%</span>
            </div>

            <!-- Refining & Margin -->
            <div
              class="segment segment-margin"
              :style="{ width: `${fuelDetails.breakdown.refining_margin_pct}%` }"
              :title="`Refino y margen: ${fuelDetails.breakdown.refining_margin.toFixed(3)}€ (${fuelDetails.breakdown.refining_margin_pct}%)`"
            >
              <span v-if="fuelDetails.breakdown.refining_margin_pct > 12">{{ fuelDetails.breakdown.refining_margin_pct }}%</span>
            </div>

            <!-- IEH -->
            <div
              class="segment segment-ieh"
              :style="{ width: `${fuelDetails.breakdown.ieh_pct}%` }"
              :title="`IEH: ${fuelDetails.breakdown.ieh.toFixed(3)}€ (${fuelDetails.breakdown.ieh_pct}%)`"
            >
              <span v-if="fuelDetails.breakdown.ieh_pct > 12">{{ fuelDetails.breakdown.ieh_pct }}%</span>
            </div>

            <!-- IVA 21% -->
            <div
              class="segment segment-iva"
              :style="{ width: `${fuelDetails.breakdown.iva_pct}%` }"
              :title="`IVA 21%: ${fuelDetails.breakdown.iva.toFixed(3)}€ (${fuelDetails.breakdown.iva_pct}%)`"
            >
              <span v-if="fuelDetails.breakdown.iva_pct > 12">{{ fuelDetails.breakdown.iva_pct }}%</span>
            </div>
          </div>

          <!-- Breakdown Cards Grid -->
          <div class="breakdown-grid">
            <div class="breakdown-card card-crude">
              <div class="card-indicator"></div>
              <div class="card-body">
                <span class="item-name">1. Petróleo Crudo</span>
                <span class="item-desc">Materia prima Brent sin refinar</span>
                <div class="item-nums">
                  <strong class="item-eur">{{ fuelDetails.breakdown.crude_cost.toFixed(3) }} €</strong>
                  <span class="item-pct">{{ fuelDetails.breakdown.crude_pct }}%</span>
                </div>
              </div>
            </div>

            <div class="breakdown-card card-margin">
              <div class="card-indicator"></div>
              <div class="card-body">
                <span class="item-name">2. Refino y Margen</span>
                <span class="item-desc">Transformación, transporte y estación</span>
                <div class="item-nums">
                  <strong class="item-eur">{{ fuelDetails.breakdown.refining_margin.toFixed(3) }} €</strong>
                  <span class="item-pct">{{ fuelDetails.breakdown.refining_margin_pct }}%</span>
                </div>
              </div>
            </div>

            <div class="breakdown-card card-ieh">
              <div class="card-indicator"></div>
              <div class="card-body">
                <span class="item-name">3. Impuesto IEH</span>
                <span class="item-desc">Impuesto Especial Hidrocarburos (fijo)</span>
                <div class="item-nums">
                  <strong class="item-eur">{{ fuelDetails.breakdown.ieh.toFixed(3) }} €</strong>
                  <span class="item-pct">{{ fuelDetails.breakdown.ieh_pct }}%</span>
                </div>
              </div>
            </div>

            <div class="breakdown-card card-iva">
              <div class="card-indicator"></div>
              <div class="card-body">
                <span class="item-name">4. IVA (21%)</span>
                <span class="item-desc">Impuesto sobre crudo, margen e IEH</span>
                <div class="item-nums">
                  <strong class="item-eur">{{ fuelDetails.breakdown.iva.toFixed(3) }} €</strong>
                  <span class="item-pct">{{ fuelDetails.breakdown.iva_pct }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tax burden summary pill -->
          <div class="tax-burden-summary">
            <Scale :size="16" class="text-primary" />
            <span>
              Carga total de impuestos (IEH + IVA):
              <strong>{{ (fuelDetails.breakdown.ieh + fuelDetails.breakdown.iva).toFixed(3) }} €/L</strong>
              ({{ (fuelDetails.breakdown.ieh_pct + fuelDetails.breakdown.iva_pct).toFixed(1) }}% del precio final)
            </span>
          </div>
        </div>

        <!-- 5. SVG 30-Day Evolution Chart with Interactive Tooltip -->
        <div class="chart-section">
          <div class="chart-header">
            <div class="chart-title">
              <Calendar :size="16" />
              <h4>Evolución del Litro de Crudo (Últimos 30 días)</h4>
            </div>
            <div class="chart-legend-stats">
              <span>Mín: <strong>{{ chartStats.min.toFixed(3) }} €</strong></span>
              <span>•</span>
              <span>Máx: <strong>{{ chartStats.max.toFixed(3) }} €</strong></span>
            </div>
          </div>

          <div
            class="svg-chart-wrapper"
            @mouseleave="activeTooltipIndex = null"
            @touchmove="onChartTouch"
          >
            <svg
              viewBox="0 0 500 160"
              class="evolution-svg"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="crudeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.45" />
                  <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.0" />
                </linearGradient>
              </defs>

              <!-- Grid reference lines -->
              <line x1="25" y1="20" x2="475" y2="20" stroke="var(--border-color)" stroke-dasharray="3,3" opacity="0.6" />
              <line x1="25" y1="87" x2="475" y2="87" stroke="var(--border-color)" stroke-dasharray="3,3" opacity="0.4" />
              <line x1="25" y1="135" x2="475" y2="135" stroke="var(--border-color)" stroke-dasharray="3,3" opacity="0.6" />

              <!-- Gradient Area fill -->
              <path :d="areaPathD" fill="url(#crudeGrad)" class="chart-area-path" />

              <!-- Smooth Curve Line -->
              <path
                :d="linePathD"
                fill="none"
                stroke="#f59e0b"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="chart-line-path"
              />

              <!-- Interactive points & scrubber -->
              <g
                v-for="(pt, idx) in chartPoints"
                :key="idx"
                class="chart-point-group"
                @mouseenter="onChartHover(idx)"
              >
                <!-- Invisible hit-area for easier tapping/hovering -->
                <circle
                  :cx="pt.x"
                  :cy="pt.y"
                  r="14"
                  fill="transparent"
                  class="hit-area"
                />

                <!-- Visible point dot -->
                <circle
                  :cx="pt.x"
                  :cy="pt.y"
                  :r="activeTooltipIndex === idx ? 6 : 3"
                  :fill="activeTooltipIndex === idx ? '#ffffff' : '#f59e0b'"
                  :stroke="activeTooltipIndex === idx ? '#f59e0b' : 'none'"
                  stroke-width="2"
                  class="point-dot"
                />
              </g>

              <!-- Scrubber vertical line -->
              <line
                v-if="activeTooltipPoint"
                :x1="activeTooltipPoint.x"
                y1="10"
                :x2="activeTooltipPoint.x"
                y2="145"
                stroke="rgba(245, 158, 11, 0.7)"
                stroke-width="1.5"
                stroke-dasharray="2,2"
              />
            </svg>

            <!-- Floating Tooltip Box -->
            <div
              v-if="activeTooltipPoint"
              class="chart-tooltip"
              :style="{
                left: `${(activeTooltipPoint.x / chartWidth) * 100}%`,
                transform: activeTooltipPoint.x > 320 ? 'translateX(-100%)' : activeTooltipPoint.x < 100 ? 'translateX(0%)' : 'translateX(-50%)'
              }"
            >
              <div class="tooltip-date">
                {{ new Date(activeTooltipPoint.raw.timestamp * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) }}
              </div>
              <div class="tooltip-price">
                <strong>{{ activeTooltipPoint.raw.crude_eur_liter.toFixed(3) }} €/L</strong>
              </div>
              <div class="tooltip-meta">
                <span>Brent: ${{ activeTooltipPoint.raw.brent_usd.toFixed(2) }}</span>
                <span>FX: {{ activeTooltipPoint.raw.eur_usd.toFixed(4) }}</span>
              </div>
            </div>
          </div>

          <div class="chart-dates-footer">
            <span>{{ historyPoints[0]?.date }}</span>
            <span>Hover o tocá cualquier día para ver el precio exacto</span>
            <span>{{ historyPoints[historyPoints.length - 1]?.date }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  z-index: 250;
  display: flex;
  align-items: flex-end;
  justify-content: center;

  @include desktop {
    align-items: center;
    padding: 24px;
  }
}

.barometer-sheet {
  background: var(--bg-surface);
  width: 100%;
  max-width: 640px;
  max-height: 92dvh;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @include desktop {
    border-radius: var(--radius-xl);
    max-height: 88dvh;
  }
}

.drag-handle-bar {
  width: 100%;
  padding: 10px 0 4px;
  display: flex;
  justify-content: center;

  @include desktop {
    display: none;
  }

  .handle {
    width: 40px;
    height: 4px;
    border-radius: var(--radius-full);
    background: var(--border-color);
  }
}

.sheet-header {
  padding: 14px 20px;
  @include flex-between;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;

  .header-titles {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .title-badge-row {
      display: flex;
      align-items: center;
      gap: 8px;

      .badge-icon {
        font-size: 1.25rem;
      }

      h2 {
        font-size: 1.15rem;
        font-weight: 800;
        color: var(--text-main);
      }
    }

    .subtitle {
      font-size: 0.775rem;
      color: var(--text-muted);
    }
  }

  .close-btn {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    @include flex-center;
    color: var(--text-muted);
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    transition: all var(--transition-fast);

    &:hover {
      color: var(--text-main);
      background: var(--bg-surface);
    }
  }
}

.sheet-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 16px 20px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

// 1. Metric Hero Cards
.metric-hero-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @include mobile {
    grid-template-columns: 1fr;
  }
}

.metric-hero-card {
  @include card-surface;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  &.crude {
    border-left: 4px solid #f59e0b;
  }
  &.barrel {
    border-left: 4px solid var(--color-primary);
  }

  .metric-top {
    @include flex-between;

    .metric-label {
      font-size: 0.725rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .metric-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 0.7rem;
      font-weight: 700;
      font-family: var(--font-mono);
      padding: 2px 6px;
      border-radius: var(--radius-full);

      &.rising {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
      }
      &.falling {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
      }
      &.stable {
        background: var(--bg-surface-subtle);
        color: var(--text-muted);
      }
    }

    .metric-badge-neutral {
      font-size: 0.7rem;
      font-weight: 700;
      font-family: var(--font-mono);
      color: var(--text-muted);
      background: var(--bg-surface-subtle);
      padding: 2px 6px;
      border-radius: var(--radius-full);
    }
  }

  .metric-main {
    display: flex;
    align-items: baseline;
    gap: 4px;

    .metric-val {
      font-size: 1.65rem;
      font-weight: 900;
      font-family: var(--font-mono);
      color: var(--text-main);
      line-height: 1.1;
    }

    .metric-unit {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
    }
  }

  .metric-sub {
    font-size: 0.725rem;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 6px;

    strong {
      color: var(--text-main);
    }
  }
}

// 2. Recommendation Banner
.recommendation-banner {
  padding: 12px 16px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border: 1px solid transparent;

  &.rising {
    background: rgba(245, 158, 11, 0.1);
    border-color: rgba(245, 158, 11, 0.35);
    .banner-icon-wrap {
      color: #f59e0b;
    }
  }

  &.falling {
    background: rgba(16, 185, 129, 0.1);
    border-color: rgba(16, 185, 129, 0.35);
    .banner-icon-wrap {
      color: #10b981;
    }
  }

  &.stable {
    background: rgba(59, 130, 246, 0.08);
    border-color: rgba(59, 130, 246, 0.25);
    .banner-icon-wrap {
      color: #3b82f6;
    }
  }

  .banner-icon-wrap {
    margin-top: 1px;
    flex-shrink: 0;
  }

  .banner-text {
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-main);
    }

    p {
      font-size: 0.775rem;
      color: var(--text-muted);
      line-height: 1.4;
    }
  }
}

// 3. Fuel Selector
.fuel-selector-section {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .section-title-wrap {
    h3 {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .section-hint {
      font-size: 0.725rem;
      color: var(--text-muted);
    }
  }

  .segmented-control {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    padding: 4px;
    border-radius: var(--radius-lg);

    .segment-btn {
      padding: 8px 12px;
      border-radius: var(--radius-md);
      font-size: 0.825rem;
      font-weight: 700;
      color: var(--text-muted);
      background: transparent;
      border: none;
      cursor: pointer;
      transition: all var(--transition-fast);

      &.active {
        background: var(--bg-surface);
        color: var(--text-main);
        box-shadow: var(--shadow-sm);
      }
    }
  }
}

// 4. Stacked Bar & Breakdown
.stacked-bar-container {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .bar-total-row {
    @include flex-between;
    align-items: baseline;

    .total-label {
      font-size: 0.775rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .total-price {
      font-size: 1.25rem;
      font-weight: 900;
      font-family: var(--font-mono);
      color: var(--color-primary);
    }
  }

  .stacked-bar {
    width: 100%;
    height: 32px;
    border-radius: var(--radius-md);
    overflow: hidden;
    display: flex;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);

    .segment {
      height: 100%;
      @include flex-center;
      color: #ffffff;
      font-size: 0.725rem;
      font-weight: 800;
      font-family: var(--font-mono);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
      transition: width 0.35s ease;

      &.segment-crude {
        background: #f59e0b;
      }
      &.segment-margin {
        background: #0284c7;
      }
      &.segment-ieh {
        background: #8b5cf6;
      }
      &.segment-iva {
        background: #10b981;
      }
    }
  }

  .breakdown-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;

    @include mobile {
      grid-template-columns: 1fr;
    }

    .breakdown-card {
      @include card-surface;
      padding: 10px 12px;
      display: flex;
      align-items: flex-start;
      gap: 10px;

      .card-indicator {
        width: 10px;
        height: 10px;
        border-radius: 3px;
        margin-top: 3px;
        flex-shrink: 0;
      }

      &.card-crude .card-indicator { background: #f59e0b; }
      &.card-margin .card-indicator { background: #0284c7; }
      &.card-ieh .card-indicator { background: #8b5cf6; }
      &.card-iva .card-indicator { background: #10b981; }

      .card-body {
        display: flex;
        flex-direction: column;
        flex: 1;

        .item-name {
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--text-main);
        }

        .item-desc {
          font-size: 0.675rem;
          color: var(--text-muted);
          line-height: 1.2;
          margin-bottom: 4px;
        }

        .item-nums {
          @include flex-between;
          align-items: baseline;

          .item-eur {
            font-size: 0.95rem;
            font-weight: 800;
            font-family: var(--font-mono);
            color: var(--text-main);
          }

          .item-pct {
            font-size: 0.75rem;
            font-weight: 700;
            font-family: var(--font-mono);
            color: var(--text-muted);
          }
        }
      }
    }
  }

  .tax-burden-summary {
    padding: 8px 12px;
    background: var(--bg-surface-subtle);
    border: 1px dashed var(--border-color);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.775rem;
    color: var(--text-muted);

    strong {
      color: var(--color-primary);
    }
  }
}

// 5. SVG 30-Day Evolution Chart
.chart-section {
  @include card-surface;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .chart-header {
    @include flex-between;
    align-items: center;

    .chart-title {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-main);

      h4 {
        font-size: 0.85rem;
        font-weight: 800;
      }
    }

    .chart-legend-stats {
      font-size: 0.7rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 5px;

      strong {
        color: #f59e0b;
      }
    }
  }

  .svg-chart-wrapper {
    position: relative;
    width: 100%;
    height: 160px;
    cursor: crosshair;

    .evolution-svg {
      width: 100%;
      height: 100%;
      overflow: visible;

      .point-dot {
        transition: r 0.2s ease, fill 0.2s ease;
      }
    }

    .chart-tooltip {
      position: absolute;
      top: -10px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(245, 158, 11, 0.5);
      backdrop-filter: blur(8px);
      padding: 6px 10px;
      border-radius: var(--radius-md);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
      pointer-events: none;
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 110px;

      .tooltip-date {
        font-size: 0.675rem;
        color: var(--text-muted);
        text-transform: uppercase;
      }

      .tooltip-price {
        strong {
          color: #f59e0b;
          font-family: var(--font-mono);
          font-size: 0.95rem;
        }
      }

      .tooltip-meta {
        font-size: 0.65rem;
        color: rgba(255, 255, 255, 0.75);
        display: flex;
        flex-direction: column;
        line-height: 1.2;
      }
    }
  }

  .chart-dates-footer {
    @include flex-between;
    font-size: 0.675rem;
    color: var(--text-muted);
  }
}
</style>
