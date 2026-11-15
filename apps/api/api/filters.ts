import { handleGetFilters } from '../src/presentation/controllers/stationsController';

export default async function handler() {
  return await handleGetFilters();
}
