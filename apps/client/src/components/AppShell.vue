<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import type { TabId, Station } from '../types';
import NavigationBar from './NavigationBar.vue';
import SearchHeader from './SearchHeader.vue';
import FilterBar from './FilterBar.vue';
import StationList from './StationList.vue';
import InteractiveMap from './InteractiveMap.vue';
import StationDetailModal from './StationDetailModal.vue';
import SaveSearchModal from './SaveSearchModal.vue';
import SavedSearchesView from './SavedSearchesView.vue';
import FavoritesView from './FavoritesView.vue';
import SettingsView from './SettingsView.vue';

import { useStations } from '../composables/useStations';
import { useGeolocation } from '../composables/useGeolocation';
import { useSettings } from '../composables/useSettings';
import gsap from 'gsap';

const activeTab = ref<TabId>('search');
const showSaveModal = ref(false);
const tabContentEl = ref<HTMLElement | null>(null);

const {
  filteredStations,
  loading,
  error,
  selectedStation,
  hoveredStationId,
  fetchFilters,
  fetchStations,
  selectStation,
} = useStations();

const { locationState, requestCurrentLocation } = useGeolocation();
const { settings } = useSettings();

// GSAP Transition when switching tabs
watch(activeTab, () => {
  nextTick(() => {
    if (tabContentEl.value) {
      gsap.fromTo(
        tabContentEl.value,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }
      );
    }
  });
});

const handleStationSelect = (station: Station) => {
  selectStation(station);
};

const handleModalClose = () => {
  selectStation(null);
};

onMounted(async () => {
  await fetchFilters();
  // Try GPS location silently first, otherwise Madrid fallback is already set
  try {
    await requestCurrentLocation();
  } catch (e) {
    // Falls back gracefully to default Madrid center
  }
  await fetchStations();
});
</script>

<template>
  <div class="app-root">
    <!-- Navigation: Sidebar on Desktop, Bottom bar on Mobile -->
    <NavigationBar :active-tab="activeTab" @update:active-tab="activeTab = $event" />

    <!-- Main Viewport -->
    <main class="main-viewport">
      <!-- Search View / Map View Desktop Split or Mobile Views -->
      <template v-if="activeTab === 'search' || activeTab === 'map'">
        <div class="split-layout">
          <!-- Left Panel: Search Header + Filters + List (Hidden on Mobile Map tab) -->
          <div
            class="split-sidebar"
            :class="{ 'mobile-hidden': activeTab === 'map' }"
          >
            <SearchHeader @open-save-modal="showSaveModal = true" />
            <FilterBar />
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
            <!-- Floating Filter Bar on Mobile Map tab -->
            <div v-if="activeTab === 'map'" class="floating-map-filters">
              <FilterBar />
            </div>

            <InteractiveMap
              :stations="filteredStations"
              :selected-station="selectedStation"
              :hovered-station-id="hoveredStationId"
              :center="locationState.coords"
              @select-station="handleStationSelect"
            />
          </div>
        </div>
      </template>

      <!-- Saved Searches Tab -->
      <div
        v-else-if="activeTab === 'saved'"
        ref="tabContentEl"
        class="tab-view-container"
      >
        <SavedSearchesView @applied="activeTab = 'search'" />
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

    <!-- Station Detail Sliding Sheet / Modal -->
    <StationDetailModal
      :station="selectedStation"
      @close="handleModalClose"
    />

    <!-- Save Search Preset Modal -->
    <SaveSearchModal
      v-if="showSaveModal"
      @close="showSaveModal = false"
    />
  </div>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

.split-layout {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;

  @include mobile {
    position: relative;

    .mobile-hidden {
      display: none !important;
    }

    .split-sidebar, .split-map-container {
      width: 100%;
      height: 100%;
    }
  }

  @include desktop {
    flex-direction: row;

    .split-sidebar {
      width: 440px;
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
    }
  }
}

.list-scroll-area {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.floating-map-filters {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  z-index: 500;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-lg);

  @include desktop {
    display: none;
  }
}

.tab-view-container {
  flex: 1;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
</style>
