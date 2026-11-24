import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleGetFilters } from '../src/presentation/controllers/stationsController.js';
import { writeWebResponse } from '../src/presentation/http/vercel.js';

export default async function handler(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  await writeWebResponse(res, await handleGetFilters());
}
