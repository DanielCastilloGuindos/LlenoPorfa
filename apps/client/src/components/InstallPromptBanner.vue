<script setup lang="ts">
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-vue-next';
import { usePwaInstall } from '../composables/usePwaInstall';
import { useHaptics } from '../composables/useHaptics';

const { canInstall, isIos, isStandalone, dismissedBanner, promptInstall, dismissBanner } =
  usePwaInstall();
const { light, success } = useHaptics();

const handleInstall = async () => {
  light();
  const accepted = await promptInstall();
  if (accepted) {
    success();
  }
};
</script>

<template>
  <div
    v-if="!isStandalone && !dismissedBanner && (canInstall || isIos)"
    class="pwa-install-banner"
  >
    <div class="banner-content">
      <div class="banner-icon">
        <Smartphone :size="20" class="text-primary" />
      </div>

      <div class="banner-text">
        <strong class="title">Instalá llenoPorfa en tu móvil</strong>
        <p v-if="canInstall" class="desc">
          Accedé al instante a precios en tiempo real incluso sin cobertura.
        </p>
        <div v-else-if="isIos" class="ios-instructions">
          <span>Pulsá <strong>Compartir</strong> <Share :size="13" class="inline-icon" /> y luego <strong>Añadir a pantalla de inicio</strong> <PlusSquare :size="13" class="inline-icon" /></span>
        </div>
      </div>
    </div>

    <div class="banner-actions">
      <button v-if="canInstall" class="btn-install" @click="handleInstall">
        <Download :size="15" />
        <span>Instalar</span>
      </button>

      <button class="btn-dismiss" @click="dismissBanner" aria-label="Cerrar aviso">
        <X :size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

.pwa-install-banner {
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  padding: 10px 14px;
  @include flex-between;
  gap: 12px;
  position: relative;
  z-index: 55;
  animation: fadeIn 0.3s ease-out;

  .banner-content {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;

    .banner-icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: var(--color-primary-light);
      @include flex-center;
      flex-shrink: 0;

      [data-theme="dark"] & {
        background: rgba(16, 185, 129, 0.2);
      }

      .text-primary {
        color: var(--color-primary);
      }
    }

    .banner-text {
      display: flex;
      flex-direction: column;
      gap: 1px;

      .title {
        font-size: 0.85rem;
        font-weight: 800;
        color: var(--text-main);
      }

      .desc {
        font-size: 0.725rem;
        color: var(--text-muted);
      }

      .ios-instructions {
        font-size: 0.725rem;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;

        strong {
          color: var(--text-main);
        }

        .inline-icon {
          display: inline-block;
          vertical-align: middle;
          color: var(--color-primary);
        }
      }
    }
  }

  .banner-actions {
    display: flex;
    align-items: center;
    gap: 8px;

    .btn-install {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: var(--color-primary);
      color: #ffffff;
      font-size: 0.775rem;
      font-weight: 700;
      border-radius: var(--radius-md);
      min-height: 34px;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-primary-dark);
      }
    }

    .btn-dismiss {
      color: var(--text-muted);
      padding: 6px;
      border-radius: var(--radius-full);
      min-height: 34px;
      min-width: 34px;

      &:hover {
        color: var(--text-main);
      }
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
