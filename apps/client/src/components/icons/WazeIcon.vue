<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="18"
    height="18"
    class="gps-logo-svg"
  >
    <!-- Cyan background pill -->
    <rect width="24" height="24" rx="6" fill="#33CCFF" />
    <!-- Wheels -->
    <circle cx="8" cy="18.5" r="2.2" fill="#23272A" />
    <circle cx="16" cy="18.5" r="2.2" fill="#23272A" />
    <!-- Body -->
    <path
      d="M17.5 7.5C16.8 5.4 14.6 4 12 4 8.7 4 6 6.7 6 10c0 1.2.4 2.3 1 3.2L6.2 15c-.3.4 0 1 .5 1h10.8c3 0 5.5-2.5 5.5-5.5 0-1.4-.5-2.7-1.4-3.7-.7.4-1.6.7-2.6.7h-1.5z"
      fill="#FFFFFF"
    />
    <!-- Eyes -->
    <circle cx="10" cy="10" r="1.3" fill="#23272A" />
    <circle cx="14.5" cy="10" r="1.3" fill="#23272A" />
    <!-- Smile -->
    <path
      d="M11 13c.4.6 1.1 1 1.8 1s1.4-.4 1.8-1"
      stroke="#23272A"
      stroke-width="1.2"
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
}
</style>
