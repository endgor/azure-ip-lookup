/**
 * Provider selector component
 * Displays Azure resource providers grouped by category
 */

import { memo, useState, useMemo } from 'react';
import type { ResourceProvider, ProviderCategory } from '@/types/rbac';

interface ProviderSelectorProps {
  providers: ResourceProvider[];
  selectedProvider: string | null;
  onSelectProvider: (provider: string) => void;
}

// Category order and display names
const CATEGORY_ORDER: ProviderCategory[] = [
  'Compute',
  'Storage',
  'Networking',
  'Database',
  'Identity',
  'Security',
  'Web',
  'AI & ML',
  'Analytics',
  'Integration',
  'Monitoring',
  'Management',
  'Other',
];

const ProviderSelector = memo(function ProviderSelector({
  providers,
  selectedProvider,
  onSelectProvider,
}: ProviderSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProviderCategory | 'all'>('all');

  // Group providers by category
  const groupedProviders = useMemo(() => {
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
  }, [providers]);

  // Filter providers by search and category
  const filteredProviders = useMemo(() => {
    let filtered = providers;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.displayName.toLowerCase().includes(query) ||
          p.name.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Sort by display name
    filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return filtered;
  }, [providers, searchQuery, selectedCategory]);

  // Get available categories (that have providers)
  const availableCategories = useMemo(() => {
    return CATEGORY_ORDER.filter((category) => groupedProviders[category]?.length > 0);
  }, [groupedProviders]);

  return (
    <div className="space-y-6">
      {/* Search and filter */}
      <div className="space-y-4">
        <div className="relative">
          <input
            type="search"
            placeholder="Search providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <svg
            className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M21 21l-4.8-4.8m0 0A6 6 0 1010 16a6 6 0 006.2-4.6z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              selectedCategory === 'all'
                ? 'bg-sky-500 text-white dark:bg-sky-400 dark:text-slate-900'
                : 'border border-slate-300 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-600 dark:hover:bg-slate-800'
            }`}
          >
            All
          </button>
          {availableCategories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                selectedCategory === category
                  ? 'bg-sky-500 text-white dark:bg-sky-400 dark:text-slate-900'
                  : 'border border-slate-300 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-600 dark:hover:bg-slate-800'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Provider grid */}
      {filteredProviders.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProviders.map((provider) => (
            <button
              key={provider.name}
              onClick={() => onSelectProvider(provider.name)}
              className={`group flex flex-col gap-2 rounded-xl border p-4 text-left transition ${
                selectedProvider === provider.name
                  ? 'border-sky-500 bg-sky-50 shadow-md dark:border-sky-400 dark:bg-sky-900/20'
                  : 'border-slate-200 bg-white shadow-sm hover:border-sky-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {provider.displayName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {provider.name}
                  </p>
                </div>
                {selectedProvider === provider.name && (
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-sky-600 dark:text-sky-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {provider.category}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {provider.resourceTypes.length} resource{provider.resourceTypes.length !== 1 ? 's' : ''}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-400/40 dark:bg-amber-400/10">
          <p className="text-sm text-amber-700 dark:text-amber-200">
            No providers found matching your search.
          </p>
        </div>
      )}
    </div>
  );
});

export default ProviderSelector;
