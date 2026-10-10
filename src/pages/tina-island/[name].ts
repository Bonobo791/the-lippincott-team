/**
 * Single dynamic endpoint that handles every island refetch the bridge
 * sends. The URL path (`/tina-island/page`, `/tina-island/global`, …)
 * selects an entry from the registry in `src/lib/islands.ts`; the route
 * itself comes from `@tinacms/astro/experimental`, so adding a new editable
 * region only ever touches the registry.
 */
import type { APIRoute } from 'astro';
import { experimental_createIslandRoute } from '@tinacms/astro/experimental';
import { withFreshConfig } from '../../lib/data';
import { islands } from '../../lib/islands';

export const prerender = false;
const renderIsland = experimental_createIslandRoute(islands);
// Scope the whole render so component-level config reads refresh too, without
// sharing an editor's overlay or resetting another concurrent request's cache.
export const ALL: APIRoute = (context) => withFreshConfig(() => renderIsland(context));
