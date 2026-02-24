import { createCrownIcon } from '../_crownIcon';

export const runtime = 'edge';

export function GET() {
  return createCrownIcon(512);
}
