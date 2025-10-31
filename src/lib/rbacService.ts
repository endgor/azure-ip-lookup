/**
 * Client-side service for loading and caching RBAC role definitions and metadata.
 * Similar to clientIpService.ts, this implements 6-hour client-side caching.
 */

import type { AzureRoleDefinition, ResourceProvider, RBACMetadata, ResourceType } from '@/types/rbac';

const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const EXPECTED_DATA_VERSION = '1.5.0'; // Increment this to force cache clear

interface CachedData<T> {
  data: T;
  timestamp: number;
  version?: string;
}

// Cache keys
const CACHE_KEYS = {
  ROLE_DEFINITIONS: 'rbac_role_definitions',
  RESOURCE_PROVIDERS: 'rbac_resource_providers',
  RESOURCE_TYPES: 'rbac_resource_types',
  ACTION_INDEX: 'rbac_action_index',
  METADATA: 'rbac_metadata',
};

/**
 * Get data from cache if it exists and is not expired
 */
function getFromCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp, version }: CachedData<T> = JSON.parse(cached);
    const now = Date.now();

    // Check if version matches (if version is present)
    if (version && version !== EXPECTED_DATA_VERSION) {
      console.log(`Cache version mismatch for ${key}: ${version} !== ${EXPECTED_DATA_VERSION}. Clearing cache.`);
      localStorage.removeItem(key);
      return null;
    }

    // Check if expired
    if (now - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    console.warn(`Failed to read from cache: ${key}`, error);
    return null;
  }
}

/**
 * Store data in cache with timestamp and version
 */
function setCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;

  try {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      version: EXPECTED_DATA_VERSION,
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    console.warn(`Failed to write to cache: ${key}`, error);
  }
}

/**
 * Fetch data from file with caching
 */
async function fetchWithCache<T>(url: string, cacheKey: string): Promise<T> {
  // Check cache first
  const cached = getFromCache<T>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from server
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as T;

  // Store in cache
  setCache(cacheKey, data);

  return data;
}

/**
 * Check metadata version and clear all caches if version mismatch
 */
async function ensureCacheVersion(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Always fetch fresh metadata to check version
    const response = await fetch('/data/rbac/metadata.json');
    if (!response.ok) return;

    const metadata = await response.json() as RBACMetadata;
    const serverVersion = metadata.version || '1.0.0';

    // Check if we have cached metadata with different version
    const cachedMetadata = getFromCache<RBACMetadata>(CACHE_KEYS.METADATA);
    const cachedVersion = cachedMetadata?.version || '1.0.0';

    if (cachedVersion !== serverVersion) {
      console.log(`RBAC data version changed from ${cachedVersion} to ${serverVersion}. Clearing all caches.`);
      clearCache();
    }
  } catch (error) {
    console.warn('Failed to check RBAC data version:', error);
  }
}

/**
 * Load all role definitions
 */
export async function loadRoleDefinitions(): Promise<AzureRoleDefinition[]> {
  await ensureCacheVersion();
  return fetchWithCache<AzureRoleDefinition[]>(
    '/data/rbac/role-definitions.json',
    CACHE_KEYS.ROLE_DEFINITIONS
  );
}

/**
 * Load resource providers list
 */
export async function loadResourceProviders(): Promise<ResourceProvider[]> {
  await ensureCacheVersion();
  return fetchWithCache<ResourceProvider[]>(
    '/data/rbac/resource-providers.json',
    CACHE_KEYS.RESOURCE_PROVIDERS
  );
}

/**
 * Load resource types list (if exists)
 */
export async function loadResourceTypes(): Promise<ResourceType[]> {
  try {
    return await fetchWithCache<ResourceType[]>(
      '/data/rbac/resource-types.json',
      CACHE_KEYS.RESOURCE_TYPES
    );
  } catch (error) {
    // Resource types file is optional
    console.warn('Resource types file not found, using empty list');
    return [];
  }
}

/**
 * Load action index (provider -> resourceType -> actions)
 */
export async function loadActionIndex(): Promise<Record<string, Record<string, string[]>>> {
  try {
    return await fetchWithCache<Record<string, Record<string, string[]>>>(
      '/data/rbac/action-index.json',
      CACHE_KEYS.ACTION_INDEX
    );
  } catch (error) {
    // Action index file is optional
    console.warn('Action index file not found, using empty object');
    return {};
  }
}

/**
 * Load RBAC metadata
 */
export async function loadMetadata(): Promise<RBACMetadata | null> {
  try {
    return await fetchWithCache<RBACMetadata>(
      '/data/rbac/metadata.json',
      CACHE_KEYS.METADATA
    );
  } catch (error) {
    console.warn('Metadata file not found');
    return null;
  }
}

/**
 * Get list of resource providers, grouped by category
 */
export async function getResourceProvidersByCategory(): Promise<Record<string, ResourceProvider[]>> {
  const providers = await loadResourceProviders();

  const grouped: Record<string, ResourceProvider[]> = {};

  for (const provider of providers) {
    const category = provider.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(provider);
  }

  // Sort providers within each category
  for (const category in grouped) {
    grouped[category].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  return grouped;
}

/**
 * Get resource types for a specific provider
 */
export async function getResourceTypesForProvider(providerName: string): Promise<string[]> {
  const providers = await loadResourceProviders();
  const provider = providers.find((p) => p.name === providerName);
  return provider?.resourceTypes || [];
}

/**
 * Get available actions for a resource type
 */
export async function getActionsForResourceType(
  providerName: string,
  resourceType: string
): Promise<string[]> {
  const actionIndex = await loadActionIndex();
  return actionIndex[providerName]?.[resourceType] || [];
}

/**
 * Clear all RBAC caches (useful for development/testing)
 */
export function clearCache(): void {
  if (typeof window === 'undefined') return;

  Object.values(CACHE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}
