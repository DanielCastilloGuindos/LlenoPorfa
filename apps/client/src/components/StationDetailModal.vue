<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import {
  X,
  Heart,
  Clock,
  MapPin,
  Share2,
  Cylinder,
  Zap,
  Fuel,
  Plus,
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
  // Exclude non-petroleum fuels (electricity and hydrogen have no relation to Brent crude oil)
  if (fuel.value === 'electric_kwh' || fuel.value === 'hydrogen_kg') {
    return null;
  }
  const mData = marketData.value || DEFAULT_MARKET_BASELINE;
  const pvp = props.station.selected_fuel_price;

  // Taxes and fuel mapping in Spain
  let ieh = 0.47269;
  let fuelName = 'Gasolina 95 E5';
  let isDiesel = false;

  if (fuel.value === 'diesel_a') {
    ieh = 0.37900;
    fuelName = 'Gasóleo A';
    isDiesel = true;
  } else if (fuel.value === 'diesel_premium') {
    ieh = 0.37900;
    fuelName = 'Gasóleo Premium';
    isDiesel = true;
  } else if (fuel.value === 'g98_e5') {
    ieh = 0.47269;
    fuelName = 'Gasolina 98 E5';
  } else if (fuel.value === 'glp') {
    ieh = 0.03100;
    fuelName = 'GLP';
  } else if (fuel.value === 'gnc') {
    ieh = 0.04100;
    fuelName = 'GNC';
  }

  const crudeCost = mData.crude_eur_liter;
  const baseSinIva = pvp / 1.21;
  const iva = pvp - baseSinIva;
  const margin = Math.max(0, baseSinIva - ieh - crudeCost);

  const crudePct = Math.round((crudeCost / pvp) * 1000) / 10;
  const marginPct = Math.round((margin / pvp) * 1000) / 10;
  const iehPct = Math.round((ieh / pvp) * 1000) / 10;
  const ivaPct = Math.round((iva / pvp) * 1000) / 10;

  const avgMargin = isDiesel
    ? (mData.fuels?.diesel_a?.breakdown?.refining_margin ?? 0.398)
    : (mData.fuels?.g95_e5?.breakdown?.refining_margin ?? 0.395);
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
    fuelName,
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
      <div class="bottom-sheet-handle"></div>

      <!-- Pinned Header: Title, address and action buttons stay visible when scrolling -->
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
            :aria-label="isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'"
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

      <!-- Scrollable Sheet Content -->
      <div class="sheet-content">
        <!-- Tank savings highlight box -->
        <div v-if="savings > 0.5" class="savings-banner">
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

            <div class="fuel-price-card" :class="{ empty: !station.prices.gnc }">
              <span class="fuel-name">GNC</span>
              <strong class="fuel-value">
                {{ station.prices.gnc ? station.prices.gnc.toFixed(3) + ' €' : 'No disp.' }}
              </strong>
            </div>

            <div class="fuel-price-card" :class="{ empty: !station.prices.electric_kwh }">
              <span class="fuel-name">Electricidad</span>
              <strong class="fuel-value">
                {{ station.prices.electric_kwh ? station.prices.electric_kwh.toFixed(3) + ' €/kWh' : 'No disp.' }}
              </strong>
            </div>

            <div class="fuel-price-card" :class="{ empty: !station.prices.hydrogen_kg }">
              <span class="fuel-name">Hidrógeno</span>
              <strong class="fuel-value">
                {{ station.prices.hydrogen_kg ? station.prices.hydrogen_kg.toFixed(2) + ' €/kg' : 'No disp.' }}
              </strong>
            </div>
          </div>
        </div>

        <!-- EV Charging Connectors -->
        <div v-if="station.metadata?.connectors && station.metadata.connectors.length > 0" class="connectors-section">
          <h4 class="section-heading">Puntos de recarga eléctrica</h4>
          <div class="connectors-grid">
            <div v-for="(conn, idx) in station.metadata.connectors" :key="idx" class="connector-badge">
              <Zap :size="16" class="connector-icon" />
              <div class="connector-details">
                <span class="conn-standard">{{ conn.standard }}</span>
                <span class="conn-power">{{ conn.powerKw }} kW &bull; {{ conn.count }} {{ conn.count === 1 ? 'punto' : 'puntos' }}</span>
              </div>
            </div>
          </div>
        </div>

      <!-- Hydrogen Dispensers -->
      <div v-if="station.metadata?.dispensers && station.metadata.dispensers.length > 0" class="connectors-section">
        <h4 class="section-heading">Surtidores de Hidrógeno (H2)</h4>
        <div class="connectors-grid">
          <div v-for="(disp, idx) in station.metadata.dispensers" :key="idx" class="connector-badge">
            <Fuel :size="16" class="connector-icon" />
            <div class="connector-details">
              <span class="conn-standard">Presión: {{ disp.pressureBar }} bar</span>
              <span class="conn-power">{{ disp.status === 'available' ? 'Disponible' : 'Consultar' }}</span>
            </div>
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
            <Cylinder :size="18" class="breakdown-icon" />
            <div class="breakdown-titles">
              <span class="section-heading">¿A dónde va tu dinero?</span>
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

        <div class="breakdown-grid">
          <div class="breakdown-item">
            <div class="item-head">
              <span class="pill-dot crude"></span>
              <span class="item-label">Crudo</span>
            </div>
            <strong class="item-val tabular-nums">{{ stationBreakdown.crudeCost.toFixed(3) }} €</strong>
            <span class="item-pct tabular-nums">{{ stationBreakdown.crudePct }}%</span>
          </div>

          <div class="breakdown-item">
            <div class="item-head">
              <span class="pill-dot margin"></span>
              <span class="item-label">Margen / Distribución</span>
            </div>
            <strong class="item-val tabular-nums">{{ stationBreakdown.margin.toFixed(3) }} €</strong>
            <span class="item-pct tabular-nums">{{ stationBreakdown.marginPct }}%</span>
          </div>

          <div class="breakdown-item">
            <div class="item-head">
              <span class="pill-dot ieh"></span>
              <span class="item-label">Imp. Hidrocarburos</span>
            </div>
            <strong class="item-val tabular-nums">{{ stationBreakdown.ieh.toFixed(3) }} €</strong>
            <span class="item-pct tabular-nums">{{ stationBreakdown.iehPct }}%</span>
          </div>

          <div class="breakdown-item">
            <div class="item-head">
              <span class="pill-dot iva"></span>
              <span class="item-label">IVA (21%)</span>
            </div>
            <strong class="item-val tabular-nums">{{ stationBreakdown.iva.toFixed(3) }} €</strong>
            <span class="item-pct tabular-nums">{{ stationBreakdown.ivaPct }}%</span>
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

      <!-- Persistent action: remains visible while detail content scrolls -->
      <button
        class="record-refuel-btn"
        @click="handleRecordRefuel"
        aria-label="Registrar repostaje en esta estación"
      >
        <Plus :size="19" />
        <span>Registrar repostaje aquí</span>
      </button>
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
  z-index: 600;
  display: flex;
  align-items: flex-end;
  justify-content: center;

  @include desktop {
    align-items: center;
    padding: 24px;
  }
}

.detail-sheet {
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
  position: relative;
  touch-action: pan-y;

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
  flex-shrink: 0;

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
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  background: var(--bg-surface);
  gap: 12px;

  .header-main {
    flex: 1;
    min-width: 0;

    .brand-row {
      display: flex;
      align-items: center;
      gap: 8px;

      .station-brand {
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--text-main);
        @include truncate;
      }

      .tag-24h {
        font-size: 0.675rem;
        font-weight: 700;
        background: var(--tier-low-bg);
        color: var(--tier-low);
        padding: 2px 6px;
        border-radius: var(--radius-sm);
        white-space: nowrap;
      }
    }

    .station-address {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 4px;
      @include truncate;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    .action-btn {
      width: 36px;
      height: 36px;
      min-width: 36px;
      min-height: 36px;
      border-radius: var(--radius-full);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      @include flex-center;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--text-main);
        background: var(--bg-surface);
      }

      &.fav-btn.active {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.3);
      }
    }
  }
}

.sheet-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 16px 20px 96px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.record-refuel-btn {
  position: absolute;
  right: 16px;
  bottom: calc(16px + var(--safe-bottom));
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: auto;
  padding: 12px 16px;
  background: var(--btn-cta-bg);
  color: var(--btn-cta-text);
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: -0.01em;
  min-height: 48px;
  box-shadow: var(--shadow-md);
  transition: opacity var(--transition-fast);

  &:hover {
    opacity: 0.9;
  }

  &:active {
    transform: scale(0.99);
  }
}

.minimap-container {
  width: 100%;
}

.savings-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--savings-bg);
  border: 1px solid var(--savings-border);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  color: var(--savings-green);

  .savings-text {
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong {
      font-size: 0.875rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
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
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;

    .fuel-price-card {
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 3px;

      .fuel-name {
        font-size: 0.725rem;
        color: var(--text-muted);
        font-weight: 600;
      }

      .fuel-value {
        font-size: 1.15rem;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        color: var(--text-main);
      }

      &.empty {
        opacity: 0.45;
        .fuel-value {
          font-size: 0.825rem;
          font-weight: 500;
        }
      }
    }
  }
}

.connectors-section {
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

  .connectors-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 8px;
  }

  .connector-badge {
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 10px;
    display: flex;
    align-items: center;
    gap: 10px;

    .connector-icon {
      color: #10b981;
      flex-shrink: 0;
    }

    .connector-details {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .conn-standard {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--text-main);
      }

      .conn-power {
        font-size: 0.75rem;
        color: var(--text-muted);
      }
    }
  }
}

.station-money-breakdown {
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .breakdown-header {
    @include flex-between;
    align-items: center;
    cursor: pointer;

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;

      .breakdown-icon {
        color: #f59e0b;
        flex-shrink: 0;
      }

      .breakdown-titles {
        display: flex;
        flex-direction: column;
        gap: 1px;

        .section-heading {
          font-size: 0.825rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .section-sub {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
      }
    }

    .open-barometer-link {
      font-size: 0.725rem;
      font-weight: 600;
      color: var(--text-muted);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-full);
      padding: 3px 9px;
      white-space: nowrap;
      transition: all var(--transition-fast);

      &:hover {
        color: #f59e0b;
        border-color: #f59e0b;
      }
    }
  }

  .mini-stacked-bar {
    width: 100%;
    height: 10px;
    border-radius: var(--radius-full);
    overflow: hidden;
    display: flex;
    background: var(--border-color);

    .seg {
      height: 100%;
      transition: width 0.3s ease;

      &.seg-crude { background: #f59e0b; }
      &.seg-margin { background: #3b82f6; }
      &.seg-ieh { background: #8b5cf6; }
      &.seg-iva { background: #ef4444; }
    }
  }

  .breakdown-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;

    @include desktop {
      grid-template-columns: repeat(4, 1fr);
    }

    .breakdown-item {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 3px;

      .item-head {
        display: flex;
        align-items: center;
        gap: 6px;

        .pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;

          &.crude { background: #f59e0b; }
          &.margin { background: #3b82f6; }
          &.ieh { background: #8b5cf6; }
          &.iva { background: #ef4444; }
        }

        .item-label {
          font-size: 0.675rem;
          color: var(--text-muted);
          font-weight: 500;
          @include truncate;
        }
      }

      .item-val {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--text-main);
      }

      .item-pct {
        font-size: 0.675rem;
        color: var(--text-muted);
      }
    }
  }

  .margin-compare-badge {
    padding: 8px 12px;
    border-radius: var(--radius-md);
    font-size: 0.75rem;
    line-height: 1.35;

    &.cheaper {
      background: rgba(22, 163, 74, 0.08);
      color: var(--savings-green);
      border: 1px solid rgba(22, 163, 74, 0.2);

      strong {
        color: var(--savings-green);
      }
    }

    &.expensive {
      background: rgba(245, 158, 11, 0.08);
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
