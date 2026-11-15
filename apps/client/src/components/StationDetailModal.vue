<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import {
  X,
  Heart,
  Clock,
  MapPin,
  Sparkles,
  Share2,
  ReceiptText,
  Cylinder,
} from 'lucide-vue-next';
import type { Station } from '../types';
import { useFavorites } from '../composables/useFavorites';
import { useStations } from '../composables/useStations';
import { useSettings } from '../composables/useSettings';
import { useGeolocation } from '../composables/useGeolocation';
import { useMarket, DEFAULT_MARKET_BASELINE } from '../composables/useMarket';
import { useVisitDetector } from '../composables/useVisitDetector';
import { useTelemetry } from '../composables/useTelemetry';
import { useHaptics } from '../composables/useHaptics';
import GoogleMapsIcon from './icons/GoogleMapsIcon.vue';
import WazeIcon from './icons/WazeIcon.vue';
import AppleMapsIcon from './icons/AppleMapsIcon.vue';
import StationDetailMiniMap from './StationDetailMiniMap.vue';
import gsap from 'gsap';

const props = defineProps<{
  station: Station | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'record-refuel', station: Station): void;
  (e: 'open-on-map', station: Station): void;
}>();

const modalSheet = ref<HTMLElement | null>(null);
const { isFavorite, toggleFavorite } = useFavorites();
const { calculateTankSavings, fuel } = useStations();
const { settings } = useSettings();
const { locationState } = useGeolocation();
const { marketData, openBarometer } = useMarket();
const { registerPendingVisit } = useVisitDetector();
const { trackEvent } = useTelemetry();
const { light, success, medium } = useHaptics();

const handleNavClick = (navApp: string) => {
  if (props.station) {
    registerPendingVisit(props.station, navApp, fuel.value);
  }
};

const isFav = computed(() => (props.station ? isFavorite(props.station.id) : false));
const savings = computed(() =>
  props.station ? calculateTankSavings(props.station.selected_fuel_price) : 0
);

// Contextual money breakdown for this station vs crude & official taxes
const stationBreakdown = computed(() => {
  if (!props.station || !props.station.selected_fuel_price) {
    return null;
  }
  const mData = marketData.value || DEFAULT_MARKET_BASELINE;
  const pvp = props.station.selected_fuel_price;
  const isDiesel = fuel.value === 'diesel_a' || fuel.value === 'diesel_premium';
  const ieh = isDiesel ? 0.37900 : 0.47269;
  const crudeCost = mData.crude_eur_liter;
  const baseSinIva = pvp / 1.21;
  const iva = pvp - baseSinIva;
  const margin = Math.max(0, baseSinIva - ieh - crudeCost);

  const crudePct = Math.round((crudeCost / pvp) * 1000) / 10;
  const marginPct = Math.round((margin / pvp) * 1000) / 10;
  const iehPct = Math.round((ieh / pvp) * 1000) / 10;
  const ivaPct = Math.round((iva / pvp) * 1000) / 10;

  const avgMargin = isDiesel
    ? mData.fuels.diesel_a.breakdown.refining_margin
    : mData.fuels.g95_e5.breakdown.refining_margin;
  const marginDiff = Math.round((margin - avgMargin) * 1000) / 1000;

  return {
    pvp,
    crudeCost,
    crudePct,
    margin,
    marginPct,
    marginDiff,
    ieh,
    iehPct,
    iva,
    ivaPct,
    fuelName: isDiesel ? 'Gasóleo A' : 'Gasolina 95 E5',
  };
});

// Map deep routing links
const googleMapsUrl = computed(() => {
  if (!props.station) return '';
  return `https://www.google.com/maps/dir/?api=1&destination=${props.station.latitude},${props.station.longitude}`;
});

const appleMapsUrl = computed(() => {
  if (!props.station) return '';
  return `https://maps.apple.com/?daddr=${props.station.latitude},${props.station.longitude}&dirflg=d`;
});

const wazeUrl = computed(() => {
  if (!props.station) return '';
  return `https://waze.com/ul?ll=${props.station.latitude},${props.station.longitude}&navigate=yes`;
});

const handleShare = async () => {
  if (!props.station) return;
  light();
  const shareUrl = `${window.location.origin}/?station=${props.station.id}`;
  const shareData = {
    title: `${props.station.brand} - llenoPorfa`,
    text: `Precios en ${props.station.brand} (${props.station.municipality}): ${props.station.address}`,
    url: shareUrl,
  };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(
        `${shareData.title}\n${shareData.text}\n${shareUrl}`
      );
      alert('¡Enlace copiado al portapapeles!');
    }
  } catch (err) {}
};

const handleFavoriteClick = () => {
  if (props.station) {
    success();
    toggleFavorite(props.station);
  }
};

const handleRecordRefuel = () => {
  if (props.station) {
    medium();
    emit('record-refuel', props.station);
  }
};

// Touch drag to dismiss on mobile
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
    // Dismiss
    closeSheet();
  } else {
    // Snap back
    gsap.to(modalSheet.value, { y: 0, duration: 0.22, ease: 'power2.out', force3D: true });
  }
};

const closeSheet = () => {
  light();
  if (modalSheet.value) {
    gsap.to(modalSheet.value, {
      y: 350,
      opacity: 0,
      duration: 0.22,
      ease: 'power2.in',
      force3D: true,
      onComplete: () => {
        emit('close');
        if (modalSheet.value) {
          gsap.set(modalSheet.value, { y: 0, opacity: 1 });
        }
      },
    });
  } else {
    emit('close');
  }
};

watch(
  () => props.station,
  (newStation) => {
    if (newStation) {
      trackEvent('station_detail_viewed', {
        stationId: newStation.id,
        stationBrand: newStation.brand,
        fuelType: fuel.value,
        province: newStation.province,
      });

      nextTick(() => {
        if (modalSheet.value) {
          gsap.fromTo(
            modalSheet.value,
            { y: 80, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.28, ease: 'power3.out', force3D: true }
          );
        }
      });
    }
  }
);
</script>

<template>
  <div v-if="station" class="modal-backdrop" @click.self="closeSheet">
    <div
      ref="modalSheet"
      class="detail-sheet"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- Drag handle for mobile -->
      <div class="drag-handle-bar">
        <div class="handle"></div>
      </div>

      <div class="sheet-header">
        <div class="header-main">
          <div class="brand-row">
            <h2 class="station-brand">{{ station.brand }}</h2>
            <span v-if="station.is_open_24h" class="tag-24h">24 Horas</span>
          </div>
          <p class="station-address selectable-text">
            <MapPin :size="13" class="inline-icon" />
            <span>{{ station.address }}, {{ station.municipality }} ({{ station.province }})</span>
          </p>
        </div>

        <div class="header-actions">
          <button
            class="action-btn fav-btn"
            :class="{ active: isFav }"
            @click="handleFavoriteClick"
            aria-label="Guardar en favoritos"
          >
            <Heart :size="20" :fill="isFav ? 'currentColor' : 'none'" />
          </button>
          <button class="action-btn" @click="handleShare" aria-label="Compartir">
            <Share2 :size="20" />
          </button>
          <button class="action-btn close-btn" @click="closeSheet" aria-label="Cerrar">
            <X :size="20" />
          </button>
        </div>
      </div>

      <!-- Quick Action: Registrar repostaje aquí -->
      <button class="record-refuel-btn" @click="handleRecordRefuel">
        <ReceiptText :size="18" />
        <span>Registrar repostaje aquí</span>
      </button>

      <!-- Tank savings highlight box -->
      <div v-if="savings > 0.5" class="savings-banner">
        <Sparkles :size="18" class="sparkle-icon" />
        <div class="savings-text">
          <strong>Ahorro estimado: ~{{ savings.toFixed(2) }} €</strong>
          <span>Llenando depósito de {{ settings.tankCapacityLiters }}L frente a la media de la zona</span>
        </div>
      </div>

      <!-- All fuel prices catalog -->
      <div class="prices-section">
        <h4 class="section-heading">Precios actuales</h4>
        <div class="prices-grid">
          <div class="fuel-price-card" :class="{ empty: !station.prices.g95_e5 }">
            <span class="fuel-name">Gasolina 95 E5</span>
            <strong class="fuel-value">
              {{ station.prices.g95_e5 ? station.prices.g95_e5.toFixed(3) + ' €' : 'No disp.' }}
            </strong>
          </div>

          <div class="fuel-price-card" :class="{ empty: !station.prices.diesel_a }">
            <span class="fuel-name">Gasóleo A</span>
            <strong class="fuel-value">
              {{ station.prices.diesel_a ? station.prices.diesel_a.toFixed(3) + ' €' : 'No disp.' }}
            </strong>
          </div>

          <div class="fuel-price-card" :class="{ empty: !station.prices.g98_e5 }">
            <span class="fuel-name">Gasolina 98 E5</span>
            <strong class="fuel-value">
              {{ station.prices.g98_e5 ? station.prices.g98_e5.toFixed(3) + ' €' : 'No disp.' }}
            </strong>
          </div>

          <div class="fuel-price-card" :class="{ empty: !station.prices.diesel_premium }">
            <span class="fuel-name">Gasóleo Premium</span>
            <strong class="fuel-value">
              {{ station.prices.diesel_premium ? station.prices.diesel_premium.toFixed(3) + ' €' : 'No disp.' }}
            </strong>
          </div>

          <div class="fuel-price-card" :class="{ empty: !station.prices.glp }">
            <span class="fuel-name">GLP</span>
            <strong class="fuel-value">
              {{ station.prices.glp ? station.prices.glp.toFixed(3) + ' €' : 'No disp.' }}
            </strong>
          </div>
        </div>
      </div>

      <!-- Schedule & Distance -->
      <div class="meta-section">
        <div class="meta-box">
          <Clock :size="16" class="meta-icon" />
          <div class="meta-info">
            <span class="meta-label">Horario:</span>
            <span class="meta-val">{{ station.schedule || 'Consultar en estación' }}</span>
          </div>
        </div>
      </div>

      <!-- Direct GPS Navigation Logos (Big) -->
      <div class="gps-navigation-section">
        <span class="section-heading">Abrir en navegador GPS</span>
        <div class="gps-direct-logos">
          <a
            :href="googleMapsUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="gps-logo-item"
            title="Abrir en Google Maps"
            aria-label="Google Maps"
            @click="handleNavClick('google_maps')"
          >
            <GoogleMapsIcon :size="36" />
          </a>

          <a
            :href="wazeUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="gps-logo-item"
            title="Abrir en Waze"
            aria-label="Waze"
            @click="handleNavClick('waze')"
          >
            <WazeIcon :size="36" />
          </a>

          <a
            :href="appleMapsUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="gps-logo-item"
            title="Abrir en Apple Maps"
            aria-label="Apple Maps"
            @click="handleNavClick('apple_maps')"
          >
            <AppleMapsIcon :size="36" />
          </a>
        </div>
      </div>

      <!-- Relative position interactive mini-map (moved below GPS navigation) -->
      <div class="minimap-container">
        <StationDetailMiniMap
          :station="station"
          :user-coords="locationState.coords"
          @open-on-map="emit('open-on-map', $event)"
        />
      </div>

      <!-- Where does your money go in this station? Contextual Breakdown (moved below the map) -->
      <div v-if="stationBreakdown" class="station-money-breakdown">
        <div
          class="breakdown-header"
          role="button"
          tabindex="0"
          title="Ver Barómetro del Crudo completo"
          @click="openBarometer(); light()"
          @keydown.enter.prevent="openBarometer(); light()"
        >
          <div class="header-left">
            <Cylinder :size="16" class="breakdown-icon" style="color: #f59e0b;" />
            <div class="breakdown-titles">
              <span class="section-heading">¿A dónde va tu dinero en esta estación?</span>
              <span class="section-sub">Desglose de 1L de {{ stationBreakdown.fuelName }} ({{ stationBreakdown.pvp.toFixed(3) }} €)</span>
            </div>
          </div>
          <span class="open-barometer-link">Barómetro ↗</span>
        </div>

        <!-- Mini Stacked Bar -->
        <div class="mini-stacked-bar">
          <div
            class="seg seg-crude"
            :style="{ width: `${stationBreakdown.crudePct}%` }"
            :title="`Crudo puro: ${stationBreakdown.crudeCost.toFixed(3)}€ (${stationBreakdown.crudePct}%)`"
          ></div>
          <div
            class="seg seg-margin"
            :style="{ width: `${stationBreakdown.marginPct}%` }"
            :title="`Margen y refino: ${stationBreakdown.margin.toFixed(3)}€ (${stationBreakdown.marginPct}%)`"
          ></div>
          <div
            class="seg seg-ieh"
            :style="{ width: `${stationBreakdown.iehPct}%` }"
            :title="`IEH: ${stationBreakdown.ieh.toFixed(3)}€ (${stationBreakdown.iehPct}%)`"
          ></div>
          <div
            class="seg seg-iva"
            :style="{ width: `${stationBreakdown.ivaPct}%` }"
            :title="`IVA 21%: ${stationBreakdown.iva.toFixed(3)}€ (${stationBreakdown.ivaPct}%)`"
          ></div>
        </div>

        <div class="breakdown-pill-row">
          <div class="breakdown-pill">
            <span class="pill-dot crude"></span>
            <span class="pill-label">Crudo:</span>
            <strong>{{ stationBreakdown.crudeCost.toFixed(2) }}€</strong>
            <small>{{ stationBreakdown.crudePct }}%</small>
          </div>

          <div class="breakdown-pill">
            <span class="pill-dot margin"></span>
            <span class="pill-label">Margen:</span>
            <strong>{{ stationBreakdown.margin.toFixed(2) }}€</strong>
            <small>{{ stationBreakdown.marginPct }}%</small>
          </div>

          <div class="breakdown-pill">
            <span class="pill-dot taxes"></span>
            <span class="pill-label">Impuestos:</span>
            <strong>{{ (stationBreakdown.ieh + stationBreakdown.iva).toFixed(2) }}€</strong>
            <small>{{ (stationBreakdown.iehPct + stationBreakdown.ivaPct).toFixed(1) }}%</small>
          </div>
        </div>

        <!-- Comparison with national/zone average margin -->
        <div class="margin-compare-badge" :class="stationBreakdown.marginDiff < 0 ? 'cheaper' : 'expensive'">
          <span v-if="stationBreakdown.marginDiff < -0.01">
            Margen de esta estación: <strong>{{ Math.abs(stationBreakdown.marginDiff).toFixed(3) }} €/L más ajustado</strong> que la media.
          </span>
          <span v-else-if="stationBreakdown.marginDiff > 0.01">
            Margen de esta estación: <strong>+{{ stationBreakdown.marginDiff.toFixed(3) }} €/L superior</strong> a la media.
          </span>
          <span v-else>
            Margen de esta estación: <strong>en línea con la media</strong>.
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: calc(var(--bottom-nav-height) + var(--safe-bottom));
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  z-index: 600;
  display: flex;
  align-items: flex-end;
  justify-content: center;

  @include desktop {
    bottom: 0;
    align-items: center;
    padding: 24px;
  }
}

.detail-sheet {
  background: var(--bg-surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  border-top: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 560px;
  max-height: calc(100dvh - var(--bottom-nav-height) - var(--safe-bottom) - 30px);
  overflow-y: auto;
  padding: 14px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  touch-action: pan-y;

  @include desktop {
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    max-height: 88dvh;
  }
}

.drag-handle-bar {
  display: flex;
  justify-content: center;
  padding-bottom: 4px;

  @include desktop {
    display: none;
  }

  .handle {
    width: 40px;
    height: 5px;
    border-radius: 5px;
    background: var(--border-color);
  }
}

.sheet-header {
  @include flex-between;
  align-items: flex-start;
  gap: 12px;

  .header-main {
    flex: 1;

    .brand-row {
      display: flex;
      align-items: center;
      gap: 8px;

      .station-brand {
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--text-main);
      }

      .tag-24h {
        font-size: 0.675rem;
        font-weight: 700;
        background: var(--tier-low-bg);
        color: var(--tier-low);
        padding: 2px 6px;
        border-radius: var(--radius-sm);
      }
    }

    .station-address {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 4px;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 6px;

    .action-btn {
      width: 44px; // 44x44px minimum touch area
      height: 44px;
      min-width: 44px;
      min-height: 44px;
      border-radius: var(--radius-full);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      @include flex-center;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--text-main);
        background: var(--border-color);
      }

      &.fav-btn.active {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.3);
      }
    }
  }
}

.record-refuel-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 13px 18px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: #ffffff;
  border-radius: var(--radius-lg);
  font-weight: 700;
  font-size: 0.925rem;
  letter-spacing: -0.01em;
  min-height: 48px;
  box-shadow: 0 4px 16px var(--color-primary-glow), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all var(--transition-fast);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px var(--color-primary-glow);
  }

  &:active {
    transform: scale(0.98);
  }
}

.minimap-container {
  width: 100%;
}

.savings-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--tier-low-bg);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  color: var(--tier-low);

  .sparkle-icon {
    flex-shrink: 0;
  }

  .savings-text {
    display: flex;
    flex-direction: column;

    strong {
      font-size: 0.9rem;
      font-weight: 800;
    }

    span {
      font-size: 0.725rem;
      opacity: 0.9;
    }
  }
}

.prices-section {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .section-heading {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-muted);
    letter-spacing: 0.05em;
  }

  .prices-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 8px;

    .fuel-price-card {
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;

      .fuel-name {
        font-size: 0.7rem;
        color: var(--text-muted);
        font-weight: 600;
      }

      .fuel-value {
        font-size: 1.1rem;
        font-weight: 800;
        font-family: var(--font-mono);
        color: var(--text-main);
      }

      &.empty {
        opacity: 0.5;
        .fuel-value {
          font-size: 0.85rem;
          font-weight: 500;
        }
      }
    }
  }
}

.station-money-breakdown {
  @include card-surface;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-left: 3px solid #f59e0b;

  .breakdown-header {
    @include flex-between;
    align-items: center;
    cursor: pointer;

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;

      .breakdown-icon {
        font-size: 1.15rem;
      }

      .breakdown-titles {
        display: flex;
        flex-direction: column;

        .section-heading {
          font-size: 0.775rem;
          font-weight: 800;
          color: var(--text-main);
        }

        .section-sub {
          font-size: 0.675rem;
          color: var(--text-muted);
        }
      }
    }

    .open-barometer-link {
      font-size: 0.725rem;
      font-weight: 700;
      color: #f59e0b;
      white-space: nowrap;
      transition: transform var(--transition-fast);

      &:hover {
        transform: translateX(2px);
      }
    }
  }

  .mini-stacked-bar {
    width: 100%;
    height: 14px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    display: flex;
    background: var(--bg-surface-subtle);

    .seg {
      height: 100%;
      transition: width 0.3s ease;

      &.seg-crude { background: #f59e0b; }
      &.seg-margin { background: #0284c7; }
      &.seg-ieh { background: #8b5cf6; }
      &.seg-iva { background: #10b981; }
    }
  }

  .breakdown-pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

    .breakdown-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.725rem;
      color: var(--text-muted);

      .pill-dot {
        width: 8px;
        height: 8px;
        border-radius: 2px;
        flex-shrink: 0;

        &.crude { background: #f59e0b; }
        &.margin { background: #0284c7; }
        &.taxes { background: #8b5cf6; }
      }

      strong {
        color: var(--text-main);
        font-family: var(--font-mono);
      }

      small {
        color: var(--text-muted);
      }
    }
  }

  .margin-compare-badge {
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    font-size: 0.725rem;
    line-height: 1.3;

    &.cheaper {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.2);

      strong {
        color: #10b981;
      }
    }

    &.expensive {
      background: rgba(245, 158, 11, 0.1);
      color: #d97706;
      border: 1px solid rgba(245, 158, 11, 0.25);

      [data-theme="dark"] & {
        color: #f59e0b;
      }

      strong {
        color: #f59e0b;
      }
    }
  }
}

.meta-section {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .meta-box {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--bg-surface-subtle);
    border-radius: var(--radius-md);
    font-size: 0.8rem;

    .meta-icon {
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .meta-info {
      display: flex;
      gap: 6px;
      @include truncate;

      .meta-label {
        color: var(--text-muted);
      }

      .meta-val {
        color: var(--text-main);
      }
    }
  }
}

.gps-navigation-section {
  @include flex-between;
  align-items: center;
  padding: 12px 18px;
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);

  .section-heading {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-muted);
  }

  .gps-direct-logos {
    display: flex;
    align-items: center;
    gap: 20px;

    .gps-logo-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      box-shadow: none;
      padding: 3px;
      line-height: 1;
      opacity: 0.95;
      transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 0.2s ease,
                  filter 0.2s ease;

      &:hover {
        opacity: 1;
        transform: scale(1.18) translateY(-2px);
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
      }

      &:active {
        transform: scale(0.92);
      }
    }
  }
}
</style>
