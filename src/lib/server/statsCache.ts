import { query } from './mysql';

interface GlobalStatsCache {
  totalCount: number;
  totalCost: number;
  avgDurationMs: number;
  avgTokens: number;
  lastUpdated: number;
}

const cacheKey = '__statsCache';

function getGlobalCache(): GlobalStatsCache | null {
  return (globalThis as any)[cacheKey] || null;
}

function setGlobalCache(cache: GlobalStatsCache) {
  (globalThis as any)[cacheKey] = cache;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 Hour

export async function getLifetimeStats() {
  const cache = getGlobalCache();
  const now = Date.now();

  if (cache && (now - cache.lastUpdated < CACHE_TTL_MS)) {
    console.log('[statsCache] Serving lifetime stats from memory cache');
    return cache;
  }

  console.log('[statsCache] Cache miss or expired. Fetching lifetime stats from database...');
  try {
    const results = await query<any[]>(`
      SELECT 
        COUNT(id) as totalCount,
        SUM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(performance_meta, '$.totalCost')), 0)) as totalCost,
        AVG(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(performance_meta, '$.totalDurationMs')), 0)) as avgDurationMs,
        AVG(
          COALESCE(JSON_UNQUOTE(JSON_EXTRACT(performance_meta, '$.textTokens.prompt')), 0) +
          COALESCE(JSON_UNQUOTE(JSON_EXTRACT(performance_meta, '$.textTokens.candidates')), 0) +
          COALESCE(JSON_UNQUOTE(JSON_EXTRACT(performance_meta, '$.imageTokens.prompt')), 0) +
          COALESCE(JSON_UNQUOTE(JSON_EXTRACT(performance_meta, '$.imageTokens.candidates')), 0)
        ) as avgTokens
      FROM generations
      WHERE performance_meta IS NOT NULL
    `);

    const stats = results[0];
    const newCache: GlobalStatsCache = {
      totalCount: Number(stats.totalCount || 0),
      totalCost: Number(stats.totalCost || 0.0),
      avgDurationMs: Number(stats.avgDurationMs || 0.0),
      avgTokens: Number(stats.avgTokens || 0.0),
      lastUpdated: now,
    };

    setGlobalCache(newCache);
    return newCache;
  } catch (error) {
    console.error('[statsCache] Failed to load lifetime stats from DB:', error);
    if (cache) return cache;
    throw error;
  }
}

export function updateStatsCache(cost: number, durationMs: number, tokens: number) {
  const cache = getGlobalCache();
  if (!cache) {
    console.log('[statsCache] Cache not initialized, skipping delta update.');
    return;
  }

  const oldCount = cache.totalCount;
  const nextCount = oldCount + 1;

  cache.totalCount = nextCount;
  cache.totalCost += cost;

  cache.avgDurationMs = ((cache.avgDurationMs * oldCount) + durationMs) / nextCount;
  cache.avgTokens = ((cache.avgTokens * oldCount) + tokens) / nextCount;
  cache.lastUpdated = Date.now();

  setGlobalCache(cache);
  console.log('[statsCache] Real-time cache updated:', {
    totalCount: cache.totalCount,
    totalCost: cache.totalCost,
    avgDurationMs: cache.avgDurationMs,
    avgTokens: cache.avgTokens,
  });

  // Invalidate the demographic overview cache
  invalidateOverviewCache();
}

interface DemographicStat {
  name: string;
  count: number;
}

export interface OverviewDemographicStats {
  ageRanges: DemographicStat[];
  genders: DemographicStat[];
  divisions: DemographicStat[];
  bikes: DemographicStat[];
  lastUpdated: number;
}

const overviewCacheKey = '__overviewStatsCache';

function getOverviewCache(): OverviewDemographicStats | null {
  return (globalThis as any)[overviewCacheKey] || null;
}

function setOverviewCache(cache: OverviewDemographicStats) {
  (globalThis as any)[overviewCacheKey] = cache;
}

export function invalidateOverviewCache() {
  (globalThis as any)[overviewCacheKey] = null;
  console.log('[statsCache] Overview demographic cache invalidated');
}

export async function getOverviewStats(): Promise<OverviewDemographicStats> {
  const cache = getOverviewCache();
  const now = Date.now();

  if (cache && (now - cache.lastUpdated < CACHE_TTL_MS)) {
    console.log('[statsCache] Serving overview demographic stats from memory cache');
    return cache;
  }

  console.log('[statsCache] Cache miss or expired. Fetching overview stats from database...');
  try {
    const [ageRanges, genders, divisions, bikes] = await Promise.all([
      query<any[]>(`
        SELECT COALESCE(NULLIF(TRIM(u.dob), ''), 'Unknown') AS name, COUNT(g.id) AS count 
        FROM generations g 
        JOIN users u ON g.user_id = u.id 
        GROUP BY u.dob 
        ORDER BY count DESC
      `),
      query<any[]>(`
        SELECT COALESCE(NULLIF(TRIM(u.gender), ''), 'Unknown') AS name, COUNT(g.id) AS count 
        FROM generations g 
        JOIN users u ON g.user_id = u.id 
        GROUP BY u.gender 
        ORDER BY count DESC
      `),
      query<any[]>(`
        SELECT COALESCE(NULLIF(TRIM(u.division), ''), 'Unknown') AS name, COUNT(g.id) AS count 
        FROM generations g 
        JOIN users u ON g.user_id = u.id 
        GROUP BY u.division 
        ORDER BY count DESC
      `),
      query<any[]>(`
        SELECT COALESCE(NULLIF(TRIM(b.model_name), ''), 'Unknown') AS name, COUNT(g.id) AS count 
        FROM generations g 
        JOIN bikes b ON g.bike_id = b.id 
        GROUP BY b.id, b.model_name 
        ORDER BY count DESC
      `),
    ]);

    const newCache: OverviewDemographicStats = {
      ageRanges: ageRanges.map(r => ({ name: r.name, count: Number(r.count) })),
      genders: genders.map(r => ({ name: r.name, count: Number(r.count) })),
      divisions: divisions.map(r => ({ name: r.name, count: Number(r.count) })),
      bikes: bikes.map(r => ({ name: r.name, count: Number(r.count) })),
      lastUpdated: now,
    };

    setOverviewCache(newCache);
    return newCache;
  } catch (error) {
    console.error('[statsCache] Failed to load overview stats from DB:', error);
    if (cache) return cache;
    throw error;
  }
}
