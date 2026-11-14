<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="18"
    height="18"
    class="gps-logo-svg"
  >
    <!-- Rounded squircle base -->
    <rect width="24" height="24" rx="5.5" fill="#E5E5EA" />
    <clipPath id="apple-maps-clip">
      <rect width="24" height="24" rx="5.5" />
    </clipPath>
    <g clip-path="url(#apple-maps-clip)">
      <!-- Map grid road lines -->
      <path d="M-2 16 L26 8" stroke="#FFFFFF" stroke-width="4.5" />
      <path d="M6 -2 L18 26" stroke="#FFFFFF" stroke-width="4" />
      <!-- Route path in orange/yellow -->
      <path
        d="M2 17.5 L11 14.5 L16 5"
        stroke="#FF9500"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
      />
      <!-- Navigation arrow icon badge -->
      <circle cx="16.5" cy="5.5" r="4" fill="#007AFF" />
      <path
        d="M16.5 3.2 L18.8 7.5 L16.5 6.4 L14.2 7.5 Z"
        fill="#FFFFFF"
      />
    </g>
  </svg>
</template>

<style scoped>
.gps-logo-svg {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
