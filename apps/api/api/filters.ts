import { handleGetFilters } from '../src/presentation/controllers/stationsController.js';

export default async function handler(_req: Request) {
  return await handleGetFilters();
}
