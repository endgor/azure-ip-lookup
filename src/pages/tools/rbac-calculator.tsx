/**
 * RBAC Least Privilege Calculator
 * Helps users find Azure roles with least privilege permissions
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import Layout from '@/components/Layout';
import StepIndicator, { type Step } from '@/components/rbac/StepIndicator';
import ProviderSelector from '@/components/rbac/ProviderSelector';
import ResourceTypeSelector from '@/components/rbac/ResourceTypeSelector';
import ActionSelector from '@/components/rbac/ActionSelector';
import RoleResults from '@/components/rbac/RoleResults';
import {
  loadRoleDefinitions,
  loadResourceProviders,
  loadActionIndex,
} from '@/lib/rbacService';
import { findMatchingRoles, buildPermission } from '@/lib/permissionMatcher';
import type { ResourceProvider, AzureRoleDefinition, RoleMatchResult } from '@/types/rbac';

export default function RBACCalculatorPage() {
  // Data loading state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<ResourceProvider[]>([]);
  const [roles, setRoles] = useState<AzureRoleDefinition[]>([]);
  const [actionIndex, setActionIndex] = useState<Record<string, Record<string, string[]>>>({});

  // Wizard state
  const [currentStep, setCurrentStep] = useState<Step>('provider');
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());

  // Selection state
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<Record<string, string[]>>({});

  // Results
  const [matchResults, setMatchResults] = useState<RoleMatchResult[]>([]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [loadedProviders, loadedRoles, loadedActionIndex] = await Promise.all([
          loadResourceProviders(),
          loadRoleDefinitions(),
          loadActionIndex(),
        ]);

        setProviders(loadedProviders);
        setRoles(loadedRoles);
        setActionIndex(loadedActionIndex);
      } catch (err) {
        console.error('Error loading RBAC data:', err);
        setError(
          'Failed to load RBAC data. Make sure you have run "npm run update-rbac-data" to fetch the latest role definitions.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Get selected permissions as full permission strings
  const selectedPermissions = useMemo(() => {
    if (!selectedProvider) return [];

    const permissions: string[] = [];

    for (const [resourceType, actions] of Object.entries(selectedActions)) {
      for (const action of actions) {
        permissions.push(buildPermission(selectedProvider, resourceType, action));
      }
    }

    return permissions;
  }, [selectedProvider, selectedActions]);

  // Handler: Select provider
  const handleSelectProvider = useCallback((provider: string) => {
    setSelectedProvider(provider);
    setSelectedResourceTypes([]);
    setSelectedActions({});
    setMatchResults([]);

    // Mark provider step as completed and move to resource step
    setCompletedSteps(new Set<Step>(['provider']));
    setCurrentStep('resource');
  }, []);

  // Handler: Toggle resource type selection
  const handleToggleResourceType = useCallback((resourceType: string) => {
    setSelectedResourceTypes((prev) => {
      if (prev.includes(resourceType)) {
        // Remove from selection
        return prev.filter((rt) => rt !== resourceType);
      } else {
        // Add to selection
        return [...prev, resourceType];
      }
    });

    // Remove actions for deselected resource types
    setSelectedActions((prev) => {
      const newActions = { ...prev };
      if (!selectedResourceTypes.includes(resourceType)) {
        delete newActions[resourceType];
      }
      return newActions;
    });
  }, [selectedResourceTypes]);

  // Handler: Continue to actions step
  const handleContinueToActions = useCallback(() => {
    setCompletedSteps(new Set<Step>(['provider', 'resource']));
    setCurrentStep('actions');
  }, []);

  // Handler: Toggle action selection
  const handleToggleAction = useCallback((resourceType: string, action: string) => {
    setSelectedActions((prev) => {
      const newActions = { ...prev };
      const resourceActions = newActions[resourceType] || [];

      if (resourceActions.includes(action)) {
        // Remove action
        newActions[resourceType] = resourceActions.filter((a) => a !== action);
        if (newActions[resourceType].length === 0) {
          delete newActions[resourceType];
        }
      } else {
        // Add action
        newActions[resourceType] = [...resourceActions, action];
      }

      return newActions;
    });
  }, []);

  // Handler: Select all actions for a resource type
  const handleSelectAllActions = useCallback(
    (resourceType: string) => {
      if (!selectedProvider) return;

      const availableActions = actionIndex[selectedProvider]?.[resourceType] || [];

      setSelectedActions((prev) => ({
        ...prev,
        [resourceType]: availableActions,
      }));
    },
    [selectedProvider, actionIndex]
  );

  // Handler: Find matching roles
  const handleFindRoles = useCallback(() => {
    if (selectedPermissions.length === 0) return;

    const results = findMatchingRoles(selectedPermissions, roles);
    setMatchResults(results);

    setCompletedSteps(new Set<Step>(['provider', 'resource', 'actions']));
    setCurrentStep('results');
  }, [selectedPermissions, roles]);

  // Handler: Reset wizard
  const handleReset = useCallback(() => {
    setSelectedProvider(null);
    setSelectedResourceTypes([]);
    setSelectedActions({});
    setMatchResults([]);
    setCompletedSteps(new Set());
    setCurrentStep('provider');
  }, []);

  // Handler: Navigate to a previous step
  const handleStepClick = useCallback((step: Step) => {
    setCurrentStep(step);
  }, []);

  // Get resource types for selected provider
  const resourceTypesForProvider = useMemo(() => {
    if (!selectedProvider) return [];

    const provider = providers.find((p) => p.name === selectedProvider);
    return provider?.resourceTypes || [];
  }, [selectedProvider, providers]);

  return (
    <Layout
      title="RBAC Least Privilege Calculator"
      description="Find Azure RBAC roles with the least privilege required for your specific permissions. Discover built-in roles that match your needs without excessive permissions."
    >
      <section className="space-y-10">
        {/* Header */}
        <div className="space-y-2 md:space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600/80 dark:text-sky-300 md:tracking-[0.3em]">
            Identity & Access
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 md:text-3xl lg:text-4xl">
            RBAC Least Privilege Calculator
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 md:text-base">
            Find Azure RBAC roles with the minimum permissions required for your use case. Select the specific
            permissions you need, and discover roles that match without granting excessive access.
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-500/70 border-t-transparent" />
            <p className="text-slate-600 dark:text-slate-300">Loading RBAC data...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Wizard */}
        {!isLoading && !error && (
          <div className="space-y-8">
            {/* Step indicator */}
            <StepIndicator
              currentStep={currentStep}
              completedSteps={completedSteps}
              onStepClick={handleStepClick}
            />

            {/* Content */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-8">
              {currentStep === 'provider' && (
                <ProviderSelector
                  providers={providers}
                  selectedProvider={selectedProvider}
                  onSelectProvider={handleSelectProvider}
                />
              )}

              {currentStep === 'resource' && selectedProvider && (
                <ResourceTypeSelector
                  provider={selectedProvider}
                  resourceTypes={resourceTypesForProvider}
                  selectedResourceTypes={selectedResourceTypes}
                  onToggleResourceType={handleToggleResourceType}
                  onContinue={handleContinueToActions}
                />
              )}

              {currentStep === 'actions' && selectedProvider && (
                <ActionSelector
                  provider={selectedProvider}
                  resourceTypes={selectedResourceTypes}
                  actionIndex={actionIndex}
                  selectedActions={selectedActions}
                  onToggleAction={handleToggleAction}
                  onSelectAllActions={handleSelectAllActions}
                  onFindRoles={handleFindRoles}
                />
              )}

              {currentStep === 'results' && (
                <RoleResults
                  results={matchResults}
                  selectedPermissions={selectedPermissions}
                  onReset={handleReset}
                />
              )}
            </div>
          </div>
        )}

        {/* Info section */}
        {!isLoading && !error && currentStep === 'provider' && (
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                How it works
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Follow the guided wizard to find Azure RBAC roles that match your permission requirements.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {WORKFLOW_STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="flex flex-col space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
                      {index + 1}
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {step.title}
                    </p>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </Layout>
  );
}

const WORKFLOW_STEPS = [
  {
    title: 'Select Provider',
    description: 'Choose the Azure resource provider you need permissions for (e.g., Storage, Compute)',
  },
  {
    title: 'Pick Resources',
    description: 'Select one or more resource types you want to manage (e.g., storageAccounts)',
  },
  {
    title: 'Choose Actions',
    description: 'Select the specific actions you need (e.g., read, write, delete)',
  },
  {
    title: 'Get Roles',
    description: 'View matching roles sorted by least privilege with detailed permission analysis',
  },
] as const;
