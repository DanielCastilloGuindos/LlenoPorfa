<script setup lang="ts">
import { ref } from 'vue';
import { Search, ReceiptText, MapPin, Heart, Settings, Fuel } from 'lucide-vue-next';
import type { TabId } from '../types';
import { useHaptics } from '../composables/useHaptics';
import gsap from 'gsap';

const props = defineProps<{
  activeTab: TabId;
}>();

const emit = defineEmits<{
  (e: 'update:activeTab', tab: TabId): void;
}>();

const { light } = useHaptics();

const tabs = [
  { id: 'search' as TabId, label: 'Buscar', icon: Search },
  { id: 'refuel' as TabId, label: 'Registro', icon: ReceiptText },
  { id: 'map' as TabId, label: 'Mapa', icon: MapPin },
  { id: 'favorites' as TabId, label: 'Favoritos', icon: Heart },
  { id: 'settings' as TabId, label: 'Ajustes', icon: Settings },
];

const navContainer = ref<HTMLElement | null>(null);

const selectTab = (tabId: TabId, targetEl?: HTMLElement) => {
  light(); // Haptic feedback on bottom tab change
  emit('update:activeTab', tabId);

  // Microinteraction with GPU-accelerated GSAP
  if (targetEl) {
    const icon = targetEl.querySelector('.nav-icon');
    if (icon) {
      gsap.fromTo(
        icon,
        { scale: 0.8 },
        { scale: 1.15, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out', force3D: true }
      );
    }
  }
};
</script>

<template>
  <!-- Desktop Sidebar -->
  <aside class="desktop-sidebar">
    <div class="sidebar-brand">
      <div class="brand-icon">
        <img src="/icons/icon.svg" alt="llenoPorfa logo" class="brand-logo-img" />
      </div>
      <div class="brand-info">
        <h1 class="brand-title">llenoPorfa</h1>
        <span class="brand-tagline">Precios MITECO en vivo</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="nav-item"
        :class="{ active: activeTab === tab.id }"
        @click="selectTab(tab.id, $event.currentTarget as HTMLElement)"
      >
        <component :is="tab.icon" :size="20" class="nav-icon" />
        <span class="nav-label">{{ tab.label }}</span>
        <span v-if="activeTab === tab.id" class="active-indicator"></span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <span class="badge-source">API Oficial MITECO • PWA</span>
    </div>
  </aside>

  <!-- Mobile Bottom Navigation -->
  <nav ref="navContainer" class="bottom-nav">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="mobile-nav-item"
      :class="{ active: activeTab === tab.id }"
      @click="selectTab(tab.id, $event.currentTarget as HTMLElement)"
      :aria-label="tab.label"
    >
      <div class="icon-wrapper">
        <component :is="tab.icon" :size="22" class="nav-icon" />
        <span v-if="activeTab === tab.id" class="mobile-active-dot"></span>
      </div>
      <span class="mobile-nav-label">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

// Desktop Sidebar styles
.desktop-sidebar {
  display: none;

  @include desktop {
    display: flex;
    flex-direction: column;
    width: var(--sidebar-width);
    min-width: var(--sidebar-width);
    height: 100vh;
    height: 100dvh;
    background: var(--bg-surface);
    border-right: 1px solid var(--border-color);
    padding: 24px 16px;
    z-index: 40;
  }
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 8px 24px;
  border-bottom: 1px solid var(--border-color);

  .brand-icon {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-md);
    background: transparent;
    overflow: hidden;
    @include flex-center;
    flex-shrink: 0;

    .brand-logo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: var(--radius-md);
    }
  }

  .brand-title {
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text-main);
  }

  .brand-tagline {
    font-size: 0.725rem;
    color: var(--text-muted);
    font-weight: 500;
  }
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 24px;
  flex: 1;

  .nav-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 14px;
    border-radius: var(--radius-md);
    color: var(--text-muted);
    font-weight: 600;
    font-size: 0.9rem;
    min-height: 44px;
    transition: background-color var(--transition-fast), color var(--transition-fast);

    &:hover {
      background: var(--bg-surface-subtle);
      color: var(--text-main);
    }

    &.active {
      background: var(--bg-surface-subtle);
      color: var(--text-main);
      font-weight: 700;

      .active-indicator {
        position: absolute;
        right: 0;
        top: 25%;
        bottom: 25%;
        width: 3px;
        background: var(--color-primary);
        border-radius: 3px 0 0 3px;
      }
    }
  }
}

.sidebar-footer {
  padding: 12px 8px;
  border-top: 1px solid var(--border-color);

  .badge-source {
    font-size: 0.7rem;
    color: var(--text-muted);
    background: var(--bg-surface-subtle);
    padding: 4px 8px;
    border-radius: var(--radius-full);
    font-weight: 500;
  }
}

// Mobile Bottom Navigation styles
.bottom-nav {
  display: flex;

  @include desktop {
    display: none;
  }

  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(var(--bottom-nav-height) + var(--safe-bottom));
  padding-bottom: var(--safe-bottom);
  background: var(--bg-surface);
  border-top: 1px solid var(--border-color);
  z-index: 80;
  justify-content: space-around;
  align-items: center;

  .mobile-nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 6px 0;
    color: var(--text-muted);
    min-height: 52px;
    transition: color var(--transition-fast);

    .icon-wrapper {
      position: relative;
      @include flex-center;
      height: 26px;
    }

    .mobile-nav-label {
      font-size: 0.68rem;
      font-weight: 600;
      margin-top: 2px;
    }

    &.active {
      color: var(--text-main);

      .mobile-active-dot {
        position: absolute;
        bottom: -3px;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background-color: var(--color-primary);
      }
    }
  }
}
</style>
