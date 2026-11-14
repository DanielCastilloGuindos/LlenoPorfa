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
} from 'lucide-vue-next';
import type { Station } from '../types';
import { useFavorites } from '../composables/useFavorites';
import { useStations } from '../composables/useStations';
import { useSettings } from '../composables/useSettings';
import { useGeolocation } from '../composables/useGeolocation';
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
}>();

const modalSheet = ref<HTMLElement | null>(null);
const { isFavorite, toggleFavorite } = useFavorites();
const { calculateTankSavings, fuel } = useStations();
const { settings } = useSettings();
const { locationState } = useGeolocation();
const { light, success, medium } = useHaptics();

const isFav = computed(() => (props.station ? isFavorite(props.station.id) : false));
const savings = computed(() =>
  props.station ? calculateTankSavings(props.station.selected_fuel_price) : 0
);

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
  const shareData = {
    title: `${props.station.brand} - llenoPorfa`,
    text: `Precios en ${props.station.brand} (${props.station.municipality}): ${props.station.address}`,
    url: window.location.href,
  };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(
        `${shareData.title}\n${shareData.text}\n${googleMapsUrl.value}`
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

      <!-- Relative position interactive mini-map -->
      <div class="minimap-container">
        <StationDetailMiniMap
          :station="station"
          :user-coords="locationState.coords"
        />
      </div>

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

      <!-- Navigation GPS Action Buttons with Modern Official Logos -->
      <div class="gps-navigation-section">
        <div class="section-title-row">
          <span class="section-heading">Abrir en navegador GPS</span>
          <span class="section-sub">Iniciar ruta directa</span>
        </div>
        <div class="directions-actions">
          <a
            :href="googleMapsUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="nav-app-card google"
            title="Iniciar ruta en Google Maps"
          >
            <div class="app-icon-badge">
              <GoogleMapsIcon :size="24" />
            </div>
            <div class="app-meta">
              <span class="app-name">Google Maps</span>
              <span class="app-action">Navegar</span>
            </div>
          </a>

          <a
            :href="wazeUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="nav-app-card waze"
            title="Iniciar ruta en Waze"
          >
            <div class="app-icon-badge">
              <WazeIcon :size="24" />
            </div>
            <div class="app-meta">
              <span class="app-name">Waze</span>
              <span class="app-action">Ruta y radares</span>
            </div>
          </a>

          <a
            :href="appleMapsUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="nav-app-card apple"
            title="Iniciar ruta en Apple Maps"
          >
            <div class="app-icon-badge">
              <AppleMapsIcon :size="24" />
            </div>
            <div class="app-meta">
              <span class="app-name">Apple Maps</span>
              <span class="app-action">Giro a giro</span>
            </div>
          </a>
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
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 200;
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
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  border-top: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 560px;
  max-height: 88vh;
  max-height: 88dvh;
  overflow-y: auto;
  padding: 14px 20px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  touch-action: pan-y;

  @include desktop {
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
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
  display: flex;
  flex-direction: column;
  gap: 10px;

  .section-title-row {
    @include flex-between;
    align-items: baseline;

    .section-heading {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
      letter-spacing: 0.05em;
    }

    .section-sub {
      font-size: 0.7rem;
      color: var(--text-muted);
      opacity: 0.8;
    }
  }

  .directions-actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;

    .nav-app-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 8px 12px;
      border-radius: var(--radius-lg);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      text-decoration: none;
      min-height: 84px;
      transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;

      .app-icon-badge {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        @include flex-center;
        background: var(--bg-surface);
        border: 1px solid var(--border-color);
        transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
      }

      .app-meta {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        width: 100%;

        .app-name {
          font-size: 0.775rem;
          font-weight: 700;
          color: var(--text-main);
          white-space: nowrap;
          letter-spacing: -0.01em;
        }

        .app-action {
          font-size: 0.65rem;
          font-weight: 500;
          color: var(--text-muted);
          white-space: nowrap;
        }
      }

      // Brand themes & hover effects
      &.google {
        &:hover {
          background: rgba(66, 133, 244, 0.05);
          border-color: rgba(66, 133, 244, 0.45);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -4px rgba(66, 133, 244, 0.2);

          .app-icon-badge {
            transform: scale(1.08);
            border-color: rgba(66, 133, 244, 0.3);
            box-shadow: 0 4px 12px rgba(66, 133, 244, 0.15);
          }
        }
      }

      &.waze {
        &:hover {
          background: rgba(5, 178, 230, 0.06);
          border-color: rgba(5, 178, 230, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -4px rgba(5, 178, 230, 0.22);

          .app-icon-badge {
            transform: scale(1.08);
            border-color: rgba(5, 178, 230, 0.35);
            box-shadow: 0 4px 12px rgba(5, 178, 230, 0.18);
          }
        }
      }

      &.apple {
        &:hover {
          background: rgba(14, 165, 233, 0.05);
          border-color: rgba(14, 165, 233, 0.45);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -4px rgba(14, 165, 233, 0.2);

          .app-icon-badge {
            transform: scale(1.08);
            border-color: rgba(14, 165, 233, 0.3);
            box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15);
          }
        }
      }

      &:active {
        transform: scale(0.96);
      }
    }
  }
}
</style>
