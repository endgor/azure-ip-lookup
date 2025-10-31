/**
 * Resource type selector component
 * Allows selecting one or more resource types for a provider
 */

import { memo, useState, useMemo } from 'react';

interface ResourceTypeSelectorProps {
  provider: string;
  resourceTypes: string[];
  selectedResourceTypes: string[];
  onToggleResourceType: (resourceType: string) => void;
  onContinue: () => void;
}

const ResourceTypeSelector = memo(function ResourceTypeSelector({
  provider,
  resourceTypes,
  selectedResourceTypes,
  onToggleResourceType,
  onContinue,
}: ResourceTypeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter resource types by search
  const filteredResourceTypes = useMemo(() => {
    if (!searchQuery.trim()) {
      return resourceTypes;
    }

    const query = searchQuery.toLowerCase();
    return resourceTypes.filter((rt) => rt.toLowerCase().includes(query));
  }, [resourceTypes, searchQuery]);

  // Get provider display name
  const providerDisplayName = provider.replace('Microsoft.', '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span>Provider:</span>
          <span className="font-semibold text-sky-600 dark:text-sky-300">{providerDisplayName}</span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Select one or more resource types you want to manage permissions for.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="search"
          placeholder="Search resource types..."
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

      {/* Selection summary */}
      {selectedResourceTypes.length > 0 && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-900/20">
          <p className="text-sm font-medium text-sky-900 dark:text-sky-100">
            {selectedResourceTypes.length} resource type{selectedResourceTypes.length !== 1 ? 's' : ''} selected
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedResourceTypes.map((rt) => (
              <span
                key={rt}
                className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-200"
              >
                {rt}
                <button
                  onClick={() => onToggleResourceType(rt)}
                  className="hover:text-sky-900 dark:hover:text-sky-100"
                  aria-label={`Remove ${rt}`}
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resource type list */}
      {filteredResourceTypes.length > 0 ? (
        <div className="max-h-96 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          {filteredResourceTypes.map((resourceType) => {
            const isSelected = selectedResourceTypes.includes(resourceType);

            return (
              <label
                key={resourceType}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-900/20'
                    : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-sky-700 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleResourceType(resourceType)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600"
                />
                <span className="flex-1 font-mono text-sm text-slate-900 dark:text-slate-100">
                  {resourceType}
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-400/40 dark:bg-amber-400/10">
          <p className="text-sm text-amber-700 dark:text-amber-200">
            No resource types found matching your search.
          </p>
        </div>
      )}

      {/* Continue button */}
      <div className="flex justify-end">
        <button
          onClick={onContinue}
          disabled={selectedResourceTypes.length === 0}
          className="rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-sky-600 dark:bg-sky-500 dark:hover:bg-sky-600 dark:disabled:hover:bg-sky-500"
        >
          Continue to Actions
        </button>
      </div>
    </div>
  );
});

export default ResourceTypeSelector;
