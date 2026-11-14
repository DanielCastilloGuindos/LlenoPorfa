<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number | string;
  }>(),
  {
    size: 20,
  }
);
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    :width="size"
    :height="size"
    class="gps-logo-svg modern-apple"
    aria-label="Apple Maps"
  >
    <defs>
      <linearGradient id="appleBase" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#e2e8f0" />
      </linearGradient>
      <linearGradient id="applePinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0ea5e9" />
        <stop offset="100%" stop-color="#0284c7" />
      </linearGradient>
      <clipPath id="appleSquircle">
        <rect width="32" height="32" rx="7.5" />
      </clipPath>
    </defs>

    <g clip-path="url(#appleSquircle)">
      <!-- Map base -->
      <rect width="32" height="32" fill="url(#appleBase)" />

      <!-- Green park areas -->
      <path d="M0 0 L14 0 L10 12 L0 8 Z" fill="#bbf7d0" />
      <path d="M22 32 L32 24 L32 32 Z" fill="#bbf7d0" />

      <!-- Roads / Highway lines -->
      <path d="M-4 22 L36 10" stroke="#f1f5f9" stroke-width="7" />
      <path d="M-4 22 L36 10" stroke="#cbd5e1" stroke-width="5" />
      <path d="M8 -4 L24 36" stroke="#f8fafc" stroke-width="6" />
      <path d="M8 -4 L24 36" stroke="#cbd5e1" stroke-width="4" />

      <!-- Navigation GPS Route Line in Bright Amber/Orange -->
      <path
        d="M3 24 Q 14 18, 21 8"
        fill="none"
        stroke="#f59e0b"
        stroke-width="3"
        stroke-linecap="round"
      />

      <!-- Location Arrow Badge -->
      <circle cx="21" cy="8" r="5" fill="url(#applePinGrad)" />
      <path
        d="M21 5 L23.8 10.5 L21 9.2 L18.2 10.5 Z"
        fill="#ffffff"
      />
    </g>
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
