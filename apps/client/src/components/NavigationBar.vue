<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { Search, BookmarkCheck, MapPin, Heart, Settings, Fuel } from 'lucide-vue-next';
import type { TabId } from '../types';
import gsap from 'gsap';

const props = defineProps<{
  activeTab: TabId;
}>();

const emit = defineEmits<{
  (e: 'update:activeTab', tab: TabId): void;
}>();

const tabs = [
  { id: 'search' as TabId, label: 'Buscar', icon: Search },
  { id: 'saved' as TabId, label: 'Guardadas', icon: BookmarkCheck },
  { id: 'map' as TabId, label: 'Mapa', icon: MapPin },
  { id: 'favorites' as TabId, label: 'Favoritos', icon: Heart },
  { id: 'settings' as TabId, label: 'Ajustes', icon: Settings },
];

const navContainer = ref<HTMLElement | null>(null);

const selectTab = (tabId: TabId, targetEl?: HTMLElement) => {
  emit('update:activeTab', tabId);

  // Microinteraction with GSAP
  if (targetEl) {
    gsap.fromTo(
      targetEl.querySelector('.nav-icon'),
      { scale: 0.8 },
      { scale: 1.15, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' }
    );
  }
};
</script>

<template>
  <!-- Desktop Sidebar -->
  <aside class="desktop-sidebar">
    <div class="sidebar-brand">
      <div class="brand-icon">
        <Fuel :size="24" class="icon-fill" />
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
      <span class="badge-source">API Oficial MITECO</span>
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
    width: 42px;
    height: 42px;
    border-radius: var(--radius-md);
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
    color: #ffffff;
    @include flex-center;
    box-shadow: 0 4px 12px var(--color-primary-glow);
  }

  .brand-title {
    font-size: 1.25rem;
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
  gap: 6px;
  margin-top: 24px;
  flex: 1;

  .nav-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    border-radius: var(--radius-md);
    color: var(--text-muted);
    font-weight: 600;
    font-size: 0.925rem;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--bg-surface-subtle);
      color: var(--text-main);
    }

    &.active {
      background: var(--color-primary-light);
      color: var(--color-primary-dark);

      [data-theme="dark"] & {
        background: rgba(16, 185, 129, 0.15);
        color: var(--color-primary);
      }

      .active-indicator {
        position: absolute;
        right: 0;
        top: 20%;
        bottom: 20%;
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
    font-weight: 600;
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
  box-shadow: var(--shadow-nav);
  z-index: 50;
  justify-content: space-around;
  align-items: center;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);

  .mobile-nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 6px 0;
    color: var(--text-muted);
    transition: color var(--transition-fast);

    .icon-wrapper {
      position: relative;
      @include flex-center;
      height: 28px;
    }

    .mobile-nav-label {
      font-size: 0.68rem;
      font-weight: 600;
      margin-top: 2px;
    }

    &.active {
      color: var(--color-primary);

      .mobile-active-dot {
        position: absolute;
        bottom: -2px;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background-color: var(--color-primary);
      }
    }
  }
}
</style>
