/**
 * Action selector component
 * Allows selecting specific actions for each resource type
 */

import { memo, useState, useMemo } from 'react';
import { buildPermission } from '@/lib/permissionMatcher';

interface ActionSelectorProps {
  provider: string;
  resourceTypes: string[];
  actionIndex: Record<string, Record<string, string[]>>;
  selectedActions: Record<string, string[]>; // resourceType -> actions[]
  onToggleAction: (resourceType: string, action: string) => void;
  onSelectAllActions: (resourceType: string) => void;
  onFindRoles: () => void;
}

const ActionSelector = memo(function ActionSelector({
  provider,
  resourceTypes,
  actionIndex,
  selectedActions,
  onToggleAction,
  onSelectAllActions,
  onFindRoles,
}: ActionSelectorProps) {
  const [expandedResourceType, setExpandedResourceType] = useState<string | null>(
    resourceTypes.length === 1 ? resourceTypes[0] : null
  );

  // Get total selected permissions count
  const totalSelectedCount = useMemo(() => {
    return Object.values(selectedActions).reduce((sum, actions) => sum + actions.length, 0);
  }, [selectedActions]);

  // Get actions for a resource type
  const getActionsForResourceType = (resourceType: string): string[] => {
    return actionIndex[provider]?.[resourceType] || [];
  };

  // Get provider display name
  const providerDisplayName = provider.replace('Microsoft.', '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span>Provider:</span>
          <span className="font-semibold text-sky-600 dark:text-sky-300">{providerDisplayName}</span>
          <span>•</span>
          <span>
            {resourceTypes.length} resource type{resourceTypes.length !== 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Select the specific actions you need for each resource type.
        </p>
      </div>

      {/* Selection summary */}
      {totalSelectedCount > 0 && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-900/20">
          <p className="text-sm font-medium text-sky-900 dark:text-sky-100">
            {totalSelectedCount} permission{totalSelectedCount !== 1 ? 's' : ''} selected
          </p>
          <div className="mt-3 space-y-2">
            {Object.entries(selectedActions).map(([resourceType, actions]) => {
              if (actions.length === 0) return null;

              return (
                <div key={resourceType} className="space-y-1">
                  <p className="text-xs font-semibold text-sky-800 dark:text-sky-200">
                    {resourceType}:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {actions.map((action) => (
                      <span
                        key={action}
                        className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-0.5 font-mono text-xs text-sky-700 dark:bg-sky-900/40 dark:text-sky-200"
                      >
                        {action}
                        <button
                          onClick={() => onToggleAction(resourceType, action)}
                          className="hover:text-sky-900 dark:hover:text-sky-100"
                          aria-label={`Remove ${action}`}
                        >
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resource types with actions */}
      <div className="space-y-3">
        {resourceTypes.map((resourceType) => {
          const actions = getActionsForResourceType(resourceType);
          const selectedCount = selectedActions[resourceType]?.length || 0;
          const isExpanded = expandedResourceType === resourceType;

          return (
            <div
              key={resourceType}
              className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
            >
              {/* Resource type header */}
              <button
                onClick={() => setExpandedResourceType(isExpanded ? null : resourceType)}
                className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="flex-1">
                  <h3 className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {resourceType}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {actions.length} action{actions.length !== 1 ? 's' : ''} available
                    {selectedCount > 0 && ` • ${selectedCount} selected`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {actions.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAllActions(resourceType);
                      }}
                      className="rounded-md px-2 py-1 text-xs font-medium text-sky-600 transition hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-900/20"
                    >
                      Select All
                    </button>
                  )}
                  <svg
                    className={`h-5 w-5 text-slate-400 transition ${isExpanded ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </button>

              {/* Actions list */}
              {isExpanded && (
                <div className="border-t border-slate-200 p-4 dark:border-slate-700">
                  {actions.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {actions.map((action) => {
                        const isSelected = selectedActions[resourceType]?.includes(action) || false;

                        return (
                          <label
                            key={action}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 transition ${
                              isSelected
                                ? 'border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-900/20'
                                : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-sky-700 dark:hover:bg-slate-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onToggleAction(resourceType, action)}
                              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600"
                            />
                            <span className="flex-1 break-all font-mono text-sm text-slate-900 dark:text-slate-100">
                              {action}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No actions available for this resource type.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Find roles button */}
      <div className="flex justify-end">
        <button
          onClick={onFindRoles}
          disabled={totalSelectedCount === 0}
          className="rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-sky-600 dark:bg-sky-500 dark:hover:bg-sky-600 dark:disabled:hover:bg-sky-500"
        >
          Find Matching Roles
        </button>
      </div>
    </div>
  );
});

export default ActionSelector;
