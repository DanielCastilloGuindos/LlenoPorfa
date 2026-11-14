<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    width="18"
    height="18"
    class="gps-logo-svg modern-gmaps"
    aria-label="Google Maps"
  >
    <!-- Modern 4-color Google Pin with precise geometry -->
    <g transform="translate(4, 2)">
      <!-- Red Top Arch -->
      <path
        d="M12 0 C6.48 0 2 4.48 2 10 C2 12.38 2.84 14.57 4.24 16.29 L12 28 L19.76 16.29 C21.16 14.57 22 12.38 22 10 C22 4.48 17.52 0 12 0 Z"
        fill="#EA4335"
      />
      <!-- Blue Top Right Cut -->
      <path
        d="M12 0 C14.34 0 16.5 0.81 18.2 2.16 L12 10 L12 0 Z"
        fill="#4285F4"
      />
      <!-- Yellow / Orange Left Section -->
      <path
        d="M2 10 C2 12.38 2.84 14.57 4.24 16.29 L12 10 L4.24 3.71 C2.84 5.43 2 7.62 2 10 Z"
        fill="#FBBC04"
      />
      <!-- Green Bottom Tip -->
      <path
        d="M4.24 16.29 L12 28 L19.76 16.29 L12 10 Z"
        fill="#34A853"
      />
      <!-- Inner White Hole cutout -->
      <circle cx="12" cy="10" r="4.2" fill="#FFFFFF" />
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
