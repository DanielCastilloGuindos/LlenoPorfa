import { handleGetFilters } from '../src/presentation/controllers/stationsController.js';

export default async function handler() {
  return await handleGetFilters();
}
