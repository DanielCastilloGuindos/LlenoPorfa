import { ref, onMounted } from 'vue';

const deferredPrompt = ref<any>(null);
const canInstall = ref(false);
const isStandalone = ref(false);
const isIos = ref(false);
const dismissedBanner = ref(false);

const DISMISS_KEY = 'llenoporfa_pwa_dismissed_v1';

export function usePwaInstall() {
  const checkStandalone = () => {
    if (typeof window === 'undefined') return false;
    const isNavStandalone = (window.navigator as any).standalone === true;
    const isMediaStandalone = window.matchMedia('(display-mode: standalone)').matches;
    return isNavStandalone || isMediaStandalone;
  };

  const checkIos = () => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
  };

  onMounted(() => {
    isStandalone.value = checkStandalone();
    isIos.value = checkIos();

    try {
      if (localStorage.getItem(DISMISS_KEY)) {
        dismissedBanner.value = true;
      }
    } catch (e) {}

    // Listen for Android / Chrome / Edge PWA install prompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      deferredPrompt.value = e;
      canInstall.value = true;
    });

    window.addEventListener('appinstalled', () => {
      canInstall.value = false;
      deferredPrompt.value = null;
      isStandalone.value = true;
    });
  });

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt.value) return false;
    try {
      deferredPrompt.value.prompt();
      const choiceResult = await deferredPrompt.value.userChoice;
      if (choiceResult.outcome === 'accepted') {
        canInstall.value = false;
        deferredPrompt.value = null;
        return true;
      }
    } catch (err) {
      console.error('Install prompt error', err);
    }
    return false;
  };

  const dismissBanner = () => {
    dismissedBanner.value = true;
    try {
      localStorage.setItem(DISMISS_KEY, 'true');
    } catch (e) {}
  };

  return {
    canInstall,
    isStandalone,
    isIos,
    dismissedBanner,
    promptInstall,
    dismissBanner,
  };
}
