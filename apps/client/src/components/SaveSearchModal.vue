<script setup lang="ts">
import { ref } from 'vue';
import { X, BookmarkPlus, Check } from 'lucide-vue-next';
import { useSavedSearches } from '../composables/useSavedSearches';
import { useStations } from '../composables/useStations';
import { useGeolocation } from '../composables/useGeolocation';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { addSavedSearch } = useSavedSearches();
const { fuel, radius, brand, open24h, sort } = useStations();
const { locationState } = useGeolocation();

const customTitle = ref(
  `Búsqueda en ${locationState.value.name || 'mi zona'} (${fuel.value.toUpperCase()})`
);

const handleSave = () => {
  if (!customTitle.value.trim()) return;

  addSavedSearch({
    title: customTitle.value.trim(),
    fuel: fuel.value,
    radius: radius.value,
    sort: sort.value,
    brand: brand.value === 'all' ? null : brand.value,
    open24h: open24h.value,
    locationName: locationState.value.name,
    lat: locationState.value.coords?.lat ?? null,
    lng: locationState.value.coords?.lng ?? null,
  });

  emit('close');
};
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <div class="title-with-icon">
          <BookmarkPlus :size="20" class="text-primary" />
          <h3>Guardar Búsqueda</h3>
        </div>
        <button class="close-btn" @click="emit('close')">
          <X :size="18" />
        </button>
      </div>

      <div class="modal-body">
        <label class="input-label">Nombre del preset:</label>
        <input
          v-model="customTitle"
          type="text"
          placeholder="Ej. Diésel barato camino al trabajo"
          class="name-input"
          autofocus
          @keyup.enter="handleSave"
        />

        <div class="summary-box">
          <p class="summary-title">Parámetros actuales:</p>
          <ul class="summary-list">
            <li><strong>Combustible:</strong> {{ fuel }}</li>
            <li><strong>Radio:</strong> {{ radius }} km</li>
            <li><strong>Ubicación:</strong> {{ locationState.name }}</li>
            <li><strong>Horario 24h:</strong> {{ open24h ? 'Sí' : 'No' }}</li>
          </ul>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="emit('close')">Cancelar</button>
        <button class="btn-save" @click="handleSave">
          <Check :size="16" />
          <span>Guardar preset</span>
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
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 200;
  @include flex-center;
  padding: 16px;
}

.modal-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 440px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-header {
  @include flex-between;

  .title-with-icon {
    display: flex;
    align-items: center;
    gap: 8px;

    .text-primary {
      color: var(--color-primary);
    }

    h3 {
      font-size: 1.1rem;
      font-weight: 700;
    }
  }

  .close-btn {
    color: var(--text-muted);
    &:hover {
      color: var(--text-main);
    }
  }
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .input-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .name-input {
    width: 100%;
    padding: 10px 12px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    color: var(--text-main);

    &:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-glow);
    }
  }

  .summary-box {
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 10px 12px;
    font-size: 0.775rem;

    .summary-title {
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .summary-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      color: var(--text-main);
    }
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;

  .btn-cancel {
    padding: 8px 14px;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-muted);
    &:hover {
      color: var(--text-main);
    }
  }

  .btn-save {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: var(--radius-md);
    background: var(--color-primary);
    color: #ffffff;
    font-weight: 700;
    font-size: 0.85rem;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--color-primary-dark);
    }
  }
}
</style>
