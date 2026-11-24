<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { AlertTriangle, MapPin, X, Check } from 'lucide-vue-next';
import type { TabId, Station } from '../types';
import NavigationBar from './NavigationBar.vue';
import SearchHeader from './SearchHeader.vue';
import FilterBar from './FilterBar.vue';
import StationList from './StationList.vue';
import InteractiveMap from './InteractiveMap.vue';
import StationDetailModal from './StationDetailModal.vue';
import SaveSearchModal from './SaveSearchModal.vue';
import MarketBarometerModal from './MarketBarometerModal.vue';
import RefuelHistoryView from './RefuelHistoryView.vue';
import FavoritesView from './FavoritesView.vue';
import SettingsView from './SettingsView.vue';
import InstallPromptBanner from './InstallPromptBanner.vue';

import { useStations } from '../composables/useStations';
import { useGeolocation } from '../composables/useGeolocation';
import { useSettings } from '../composables/useSettings';
import { useRefuelLogs } from '../composables/useRefuelLogs';
import { useMarket } from '../composables/useMarket';
import { useTelemetry } from '../composables/useTelemetry';
import { useVisitDetector } from '../composables/useVisitDetector';
import { useNativeRadar } from '../composables/useNativeRadar';
import { useMaintenance } from '../composables/useMaintenance';
import gsap from 'gsap';

const activeTab = ref<TabId>('search');
const showSaveModal = ref(false);
const showCityModalFromBanner = ref(false);
const tabContentEl = ref<HTMLElement | null>(null);
const interactiveMapRef = ref<any>(null);

const detailModalStation = ref<Station | null>(null);
const mapPreviewStation = ref<Station | null>(null);

const {
  stations,
  filteredStations,
  stats,
  loading,
  error,
  selectedStation,
  hoveredStationId,
  fuel,
  fetchFilters,
  fetchStations,
  selectStation,
} = useStations();

const { locationState, requestCurrentLocation, dismissError, popularLocations, setManualLocation } =
  useGeolocation();
const { settings } = useSettings();
const { setPrefillFromStation } = useRefuelLogs();
const { fetchMarketData } = useMarket();
const { trackEvent } = useTelemetry();
const { arrivalPrompt, dismissArrivalPrompt, initVisitDetector } = useVisitDetector();
useNativeRadar();
const { activeAlerts, completeRule } = useMaintenance();

const openMaintenanceSettings = () => {
  activeTab.value = 'settings';
};

if (typeof window !== 'undefined') {
  window.addEventListener('llenoporfa:navigate-tab', (e: any) => {
    if (e.detail && ['search', 'refuel', 'map', 'favorites', 'settings'].includes(e.detail)) {
      activeTab.value = e.detail;
    }
  });
}

const handleArrivalRefuel = () => {
  if (!arrivalPrompt.value) return;
  const p = arrivalPrompt.value;
  setPrefillFromStation(
    {
      id: p.stationId,
      brand: p.stationName,
      address: p.address,
      selected_fuel_price: p.price ?? null,
    } as any,
    p.fuel || fuel.value,
    stats.value.avgPrice ?? undefined
  );
  dismissArrivalPrompt();
  activeTab.value = 'refuel';
};

// Check URL query parameters for PWA shortcuts (e.g. ?tab=map or ?tab=refuel&new=1)
const handleUrlShortcuts = () => {
  if (typeof window === 'undefined') return;
  const urlParams = new URLSearchParams(window.location.search);
  const targetTab = urlParams.get('tab') as TabId | null;
  if (targetTab && ['search', 'refuel', 'map', 'favorites', 'settings'].includes(targetTab)) {
    activeTab.value = targetTab;
  }
};

const checkUrlStation = () => {
  if (typeof window === 'undefined') return;
  const urlParams = new URLSearchParams(window.location.search);
  const stationId = urlParams.get('station');
  if (stationId) {
    const found = stations.value.find((s) => s.id === stationId);
    if (found) {
      detailModalStation.value = found;
    }
  }
};

// Tab Transition and Map Invalidation
watch(activeTab, (newTab) => {
  nextTick(() => {
    if (tabContentEl.value) {
      gsap.fromTo(
        tabContentEl.value,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out', force3D: true }
      );
    }
    if (newTab === 'map' || newTab === 'search') {
      interactiveMapRef.value?.invalidateSize();
    }
  });
});

const handleStationSelect = (station: Station | null) => {
  selectStation(station);
  detailModalStation.value = station;
};

const handleMapStationSelect = (station: Station | null) => {
  mapPreviewStation.value = station;
};

const handleMapOpenDetail = (station: Station) => {
  mapPreviewStation.value = null;
  detailModalStation.value = station;
  selectStation(station);
};

const handleOpenOnMap = (station: Station) => {
  detailModalStation.value = null;
  activeTab.value = 'map';
  mapPreviewStation.value = station;
  nextTick(() => {
    interactiveMapRef.value?.panToStation(station);
  });
};

const handleModalClose = () => {
  detailModalStation.value = null;
  selectStation(null);
};

// Quick action from station detail: "Registrar repostaje aquí"
const handleRecordRefuel = (station: Station) => {
  setPrefillFromStation(station, fuel.value, stats.value.avgPrice ?? undefined);
  detailModalStation.value = null;
  selectStation(null);
  activeTab.value = 'refuel';
};

const handleSelectManualCity = (name: string, coords: { lat: number; lng: number }) => {
  setManualLocation(name, coords);
  showCityModalFromBanner.value = false;
  fetchStations();
};

watch(stations, () => {
  if (!detailModalStation.value) {
    checkUrlStation();
  }
});

onMounted(async () => {
  handleUrlShortcuts();
  // Fetch market data immediately without blocking geolocation or filters
  fetchMarketData().catch(() => {});

  await fetchFilters();

  trackEvent('app_open', { province: locationState.name });
  initVisitDetector();

  // Automatic geolocation prompt on startup
  try {
    await requestCurrentLocation();
  } catch (err) {
    // Madrid fallback is active
  } finally {
    await fetchStations();
    checkUrlStation();
    const isDiesel = fuel.value === 'diesel_a' || fuel.value === 'diesel_premium';
    const currentAvg = stats.value.avgPrice ?? undefined;
    fetchMarketData(isDiesel ? undefined : currentAvg, isDiesel ? currentAvg : undefined).catch(() => {});
  }
});
</script>

<template>
  <div class="app-root">
    <!-- Navigation: Sidebar on Desktop, Bottom bar on Mobile -->
    <NavigationBar :active-tab="activeTab" @update:active-tab="activeTab = $event" />

    <!-- Main Viewport -->
    <main class="main-viewport">
      <!-- PWA Install Prompt Banner -->
      <InstallPromptBanner />

      <!-- Discreet Geolocation Warning Banner if Permission was Denied -->
      <div
        v-if="locationState.permissionDenied && locationState.error"
        class="geo-warning-banner"
      >
        <div class="banner-text">
          <AlertTriangle :size="16" class="warn-icon" />
          <span>{{ locationState.error }}</span>
        </div>
        <div class="banner-actions">
          <button class="banner-action-btn" @click="showCityModalFromBanner = true">
            <MapPin :size="14" />
            <span>Elegir ciudad</span>
          </button>
          <button class="banner-close" @click="dismissError" aria-label="Cerrar aviso">
            <X :size="14" />
          </button>
        </div>
      </div>

      <div v-if="activeAlerts.length" class="maintenance-alert-banner" role="status">
        <div><strong>{{ activeAlerts.length }} aviso{{ activeAlerts.length === 1 ? '' : 's' }} de mantenimiento</strong><span>{{ activeAlerts[0].title }} · {{ activeAlerts[0].reason === 'km' ? 'por kilometraje' : activeAlerts[0].reason === 'date' ? 'por fecha' : 'por fecha o kilometraje' }}</span></div>
        <div class="maintenance-alert-actions"><button @click="openMaintenanceSettings">Ver en Ajustes</button><button @click="completeRule(activeAlerts[0].rule)" aria-label="Marcar realizada"><Check :size="14" /></button></div>
      </div>

      <!-- Search View / Map View Desktop Split or Mobile Views -->
      <template v-if="activeTab === 'search' || activeTab === 'map'">
        <div class="split-layout">
          <!-- Left Panel: Search Header + Filters (ALWAYS FIXED/STICKY) + Scrollable List -->
          <div
            class="split-sidebar"
            :class="{ 'mobile-hidden': activeTab === 'map' }"
          >
            <!-- STICKY HEADER BLOCK: Ubicación, Buscador, Filtros y Mínimo/Medio -->
            <div class="sticky-search-controls">
              <SearchHeader @open-save-modal="showSaveModal = true" />
              <FilterBar />
            </div>

            <!-- SCROLLABLE LIST OF STATIONS -->
            <div class="list-scroll-area">
              <StationList
                :stations="filteredStations"
                :loading="loading"
                :error="error"
                :selected-station-id="selectedStation?.id"
                @select="handleStationSelect"
              />
            </div>
          </div>

          <!-- Right Panel: Interactive Map (Hidden on Mobile Search tab) -->
          <div
            class="split-map-container"
            :class="{ 'mobile-hidden': activeTab === 'search' }"
          >
            <!-- Search and filter controls on the mobile map tab -->
            <div class="map-mobile-search-controls">
              <SearchHeader :only-search="true" />
              <div class="map-mobile-filter-controls">
                <FilterBar />
              </div>
            </div>

            <div class="map-view-body">
              <InteractiveMap
                ref="interactiveMapRef"
                :stations="filteredStations"
                :selected-station="mapPreviewStation"
                :hovered-station-id="hoveredStationId"
                :center="locationState.coords"
                :is-active="activeTab === 'map'"
                @select-station="handleMapStationSelect"
                @open-detail="handleMapOpenDetail"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- Refuel History Tab -->
      <div
        v-else-if="activeTab === 'refuel'"
        ref="tabContentEl"
        class="tab-view-container"
      >
        <RefuelHistoryView />
      </div>

      <!-- Favorites Tab -->
      <div
        v-else-if="activeTab === 'favorites'"
        ref="tabContentEl"
        class="tab-view-container"
      >
        <FavoritesView @select="handleStationSelect" />
      </div>

      <!-- Settings Tab -->
      <div
        v-else-if="activeTab === 'settings'"
        ref="tabContentEl"
        class="tab-view-container"
      >
        <SettingsView />
      </div>
    </main>

    <!-- Station Detail Sliding Sheet / Modal with MiniMap & Official GPS Logos -->
    <StationDetailModal
      :station="detailModalStation"
      @close="handleModalClose"
      @record-refuel="handleRecordRefuel"
      @open-on-map="handleOpenOnMap"
    />

    <!-- Proximity Arrival Prompt Toast -->
    <transition name="toast-pop">
      <div v-if="arrivalPrompt" class="arrival-station-toast" role="alert">
        <div class="toast-content">
          <div class="toast-icon">⛽</div>
          <div class="toast-text">
            <strong>¿Estás en {{ arrivalPrompt.stationName }}?</strong>
            <span>{{ arrivalPrompt.address }}</span>
          </div>
        </div>
        <div class="toast-actions">
          <button class="toast-confirm-btn" @click="handleArrivalRefuel">
            Registrar repostaje
          </button>
          <button class="toast-dismiss-btn" @click="dismissArrivalPrompt" aria-label="Cerrar">
            <X :size="16" />
          </button>
        </div>
      </div>
    </transition>

    <!-- Save Search Preset Modal -->
    <SaveSearchModal
      v-if="showSaveModal"
      @close="showSaveModal = false"
    />

    <!-- Crude & Taxes Barometer Modal / Bottom Sheet -->
    <MarketBarometerModal />

    <!-- City Selection Modal from Banner -->
    <div
      v-if="showCityModalFromBanner"
      class="city-modal-backdrop"
      @click.self="showCityModalFromBanner = false"
    >
      <div class="city-modal-card">
        <div class="city-modal-header">
          <h3>Seleccionar Ciudad Manualmente</h3>
          <button class="close-btn" @click="showCityModalFromBanner = false">
            <X :size="18" />
          </button>
        </div>
        <div class="city-grid">
          <button
            v-for="city in popularLocations"
            :key="city.name"
            class="city-btn"
            @click="handleSelectManualCity(city.name, city.coords)"
          >
            <span>{{ city.name }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

.geo-warning-banner {
  background: rgba(245, 158, 11, 0.12);
  border-bottom: 1px solid rgba(245, 158, 11, 0.3);
  color: #d97706;
  padding: 8px 14px;
  font-size: 0.775rem;
  font-weight: 600;
  @include flex-between;
  gap: 10px;
  z-index: 60;

  [data-theme="dark"] & {
    color: #fbbf24;
    background: rgba(245, 158, 11, 0.18);
  }

  .banner-text {
    display: flex;
    align-items: center;
    gap: 8px;
    .warn-icon {
      flex-shrink: 0;
    }
  }

  .banner-actions {
    display: flex;
    align-items: center;
    gap: 8px;

    .banner-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      background: #f59e0b;
      color: #ffffff;
      border-radius: var(--radius-sm);
      font-size: 0.725rem;
      font-weight: 700;
      white-space: nowrap;
      min-height: 32px;
    }

    .banner-close {
      color: inherit;
      padding: 2px;
      opacity: 0.8;
      min-width: 32px;
      min-height: 32px;
      &:hover {
        opacity: 1;
      }
    }
  }
}

.maintenance-alert-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  font-size: 0.8rem;
  z-index: 55;
  div:first-child { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  span { color: var(--text-muted); }
  .maintenance-alert-actions { display: flex; gap: 6px; flex-shrink: 0; }
  button { min-height: 32px; padding: 5px 9px; border-radius: var(--radius-sm); background: var(--btn-cta-bg); color: var(--btn-cta-text); font-size: 0.75rem; font-weight: 700; }
}

.split-layout {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;

  @include mobile {
    position: relative;
    height: 100%;

    .mobile-hidden {
      display: none !important;
    }

    .split-sidebar {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .split-map-container {
      width: 100%;
      height: 100%;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .map-mobile-search-controls {
      position: absolute;
      top: calc(var(--safe-top) + 12px);
      left: 12px;
      right: 64px;
      z-index: 500;
      pointer-events: auto;
      background: transparent;
      border: none;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .map-mobile-filter-controls {
      width: 100%;
    }

    .map-view-body {
      flex: 1;
      width: 100%;
      min-height: 0;
      height: auto;
      position: relative;
      overflow: hidden;
    }
  }

  @include desktop {
    flex-direction: row;

    .split-sidebar {
      width: 450px;
      min-width: 420px;
      max-width: 480px;
      height: 100%;
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      background: var(--bg-surface);
      z-index: 10;
    }

    .split-map-container {
      flex: 1;
      height: 100%;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    .map-mobile-search-controls {
      display: none;
    }

    .map-view-body {
      flex: 1;
      height: 100%;
      position: relative;
    }
  }
}

// Fixed/Sticky Header Block
.sticky-search-controls {
  position: sticky;
  top: 0;
  z-index: 30;
  background: var(--bg-surface);
  flex-shrink: 0;
}

.list-scroll-area {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.tab-view-container {
  flex: 1;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

// City selection modal from banner
.city-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 300;
  @include flex-center;
  padding: 16px;
}

.city-modal-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 420px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .city-modal-header {
    @include flex-between;
    h3 {
      font-size: 1.1rem;
      font-weight: 800;
    }
    .close-btn {
      color: var(--text-muted);
    }
  }

  .city-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;

    .city-btn {
      padding: 10px 14px;
      border-radius: var(--radius-md);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-color);
      font-size: 0.875rem;
      font-weight: 600;
      text-align: left;
      min-height: 44px;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-primary-light);
        color: var(--color-primary-dark);
        border-color: var(--color-primary);
      }
    }
  }
}

.arrival-station-toast {
  position: fixed;
  bottom: 84px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 480px;
  background: var(--bg-surface);
  border: 1px solid var(--color-primary);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 0 15px rgba(16, 185, 129, 0.2);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  z-index: 250;
  backdrop-filter: blur(12px);

  @media (min-width: 768px) {
    bottom: 24px;
  }

  .toast-content {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;

    .toast-icon {
      font-size: 1.4rem;
      flex-shrink: 0;
    }

    .toast-text {
      display: flex;
      flex-direction: column;
      min-width: 0;

      strong {
        font-size: 0.85rem;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      span {
        font-size: 0.75rem;
        color: var(--text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }

  .toast-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    .toast-confirm-btn {
      padding: 6px 12px;
      font-size: 0.775rem;
      font-weight: 700;
      background: var(--color-primary);
      color: #ffffff;
      border-radius: var(--radius-md);
      transition: opacity 0.15s ease;

      &:hover {
        opacity: 0.9;
      }
    }

    .toast-dismiss-btn {
      padding: 6px;
      color: var(--text-muted);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;

      &:hover {
        color: var(--text-primary);
        background: var(--bg-surface-subtle);
      }
    }
  }
}

.toast-pop-enter-active,
.toast-pop-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-pop-enter-from,
.toast-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, 15px) scale(0.96);
}
</style>
