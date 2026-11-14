<script setup lang="ts">
import { useId } from 'vue';

withDefaults(
  defineProps<{
    size?: number | string;
  }>(),
  {
    size: 20,
  }
);

const rawId = useId();
const wazeGradId = `wazeGrad_${rawId.replace(/:/g, '')}`;
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    :width="size"
    :height="size"
    class="gps-logo-svg modern-waze"
    aria-label="Waze"
  >
    <defs>
      <linearGradient :id="wazeGradId" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38d4fc" />
        <stop offset="100%" stop-color="#05b2e6" />
      </linearGradient>
    </defs>
    <!-- Modern rounded Waze body -->
    <path
      d="M24 7 C21.5 3.5 17 2 12 2.5 C6.5 3 2 7.5 2 13 C2 17.5 4.8 21.2 8.8 22.8 L8.2 25.5 C8 26.5 8.8 27.5 9.8 27.5 L19.5 27.5 C24.5 27.5 28.5 23.5 28.5 18.5 C28.5 14.8 26.5 11.5 23.5 9.8 C24.2 8.8 24.5 7.8 24 7 Z"
      :fill="`url(#${wazeGradId})`"
    />
    <!-- Back & Front Wheels with rims -->
    <circle cx="10" cy="27.5" r="2.8" fill="#1e293b" />
    <circle cx="10" cy="27.5" r="1.1" fill="#ffffff" />
    <circle cx="21" cy="27.5" r="2.8" fill="#1e293b" />
    <circle cx="21" cy="27.5" r="1.1" fill="#ffffff" />

    <!-- Cute Eyes -->
    <circle cx="12" cy="13" r="1.8" fill="#1e293b" />
    <circle cx="18" cy="13" r="1.8" fill="#1e293b" />

    <!-- Friendly Smile -->
    <path
      d="M13.2 17.5 C14.2 19 15.8 19 16.8 17.5"
      stroke="#1e293b"
      stroke-width="1.6"
      stroke-linecap="round"
      fill="none"
    />
  </svg>
</template>

<style scoped>
.gps-logo-svg {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>
