import { ref, computed, watch } from 'vue';
import type {
  FuelId,
  SortMode,
  Station,
  StationsApiResponse,
  FiltersApiResponse,
} from '../types';
import { useGeolocation } from './useGeolocation';
import { useSettings } from './useSettings';

const fuel = ref<FuelId>('g95_e5');
const radius = ref<number>(10);
const brand = ref<string>('all');
const open24h = ref<boolean>(false);
const sort = ref<SortMode>('price');
const localFilterText = ref<string>('');

const stations = ref<Station[]>([]);
const loading = ref<boolean>(false);
const error = ref<string | null>(null);

const selectedStation = ref<Station | null>(null);
const hoveredStationId = ref<string | null>(null);

const stats = ref<{
  minPrice: number | null;
  maxPrice: number | null;
  avgPrice: number | null;
  count: number;
}>({
  minPrice: null,
  maxPrice: null,
  avgPrice: null,
  count: 0,
});

const filtersCatalog = ref<FiltersApiResponse>({
  fuels: [
    { id: 'g95_e5', label: 'Gasolina 95 E5', short_label: 'SP 95' },
    { id: 'diesel_a', label: 'Gasóleo A', short_label: 'Diésel' },
    { id: 'g98_e5', label: 'Gasolina 98 E5', short_label: 'SP 98' },
    { id: 'diesel_premium', label: 'Gasóleo Premium', short_label: 'Diésel+' },
    { id: 'glp', label: 'Gases licuados (GLP)', short_label: 'GLP' },
  ],
  popular_brands: [
    'Repsol',
    'Cepsa',
    'BP',
    'Shell',
    'Galp',
    'Plenoil',
    'Ballenoil',
    'Petroprix',
    'Carrefour',
    'Alcampo',
    'Eroski',
  ],
  radius_options: [2, 5, 10, 20, 35, 50],
  sort_options: [
    { id: 'price', label: 'Más barata primero' },
    { id: 'distance', label: 'Más cercana primero' },
    { id: 'smart', label: 'Smart (Precio + Distancia)' },
  ],
});

export function useStations() {
  const { locationState } = useGeolocation();
  const { settings } = useSettings();

  const fetchFilters = async () => {
    try {
      const res = await fetch('/api/filters');
      if (res.ok) {
        const data: FiltersApiResponse = await res.json();
        filtersCatalog.value = data;
      }
    } catch (e) {
      // Use fallback defaults already defined in filtersCatalog
    }
  };

  const fetchStations = async () => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      if (locationState.value.coords) {
        params.append('lat', locationState.value.coords.lat.toString());
        params.append('lng', locationState.value.coords.lng.toString());
      }
      params.append('radius', radius.value.toString());
      params.append('fuel', fuel.value);
      if (brand.value && brand.value !== 'all') {
        params.append('brand', brand.value);
      }
      if (open24h.value) {
        params.append('open24h', 'true');
      }
      params.append('sort', sort.value);

      const res = await fetch(`/api/stations?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data: StationsApiResponse = await res.json();
      stations.value = data.stations || [];
      stats.value = {
        minPrice: data.min_price,
        maxPrice: data.max_price,
        avgPrice: data.average_price,
        count: data.count,
      };

      // Keep selectedStation synced if still in results
      if (selectedStation.value) {
        const found = stations.value.find((s) => s.id === selectedStation.value?.id);
        if (found) {
          selectedStation.value = found;
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch stations:', err);
      error.value = 'No se pudieron cargar las gasolineras. Comprueba tu conexión o intenta con otro radio.';
    } finally {
      loading.value = false;
    }
  };

  // Local search filter for instant typing inside current results
  const filteredStations = computed(() => {
    if (!localFilterText.value.trim()) {
      return stations.value;
    }
    const q = localFilterText.value.toLowerCase().trim();
    return stations.value.filter(
      (s) =>
        s.brand.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.municipality.toLowerCase().includes(q)
    );
  });

  // Calculate real savings for a full tank (e.g. 50L) comparing station price vs average area price
  const calculateTankSavings = (stationPrice: number | null): number => {
    if (!stationPrice || !stats.value.avgPrice) return 0;
    const tankLiters = settings.value.tankCapacityLiters || 50;
    const diffPerLiter = stats.value.avgPrice - stationPrice;
    const savings = diffPerLiter * tankLiters;
    return Math.round(savings * 100) / 100;
  };

  const selectStation = (station: Station | null) => {
    selectedStation.value = station;
  };

  const setHoveredStation = (id: string | null) => {
    hoveredStationId.value = id;
  };

  return {
    fuel,
    radius,
    brand,
    open24h,
    sort,
    localFilterText,
    stations,
    filteredStations,
    loading,
    error,
    stats,
    filtersCatalog,
    selectedStation,
    hoveredStationId,
    fetchFilters,
    fetchStations,
    selectStation,
    setHoveredStation,
    calculateTankSavings,
  };
}
