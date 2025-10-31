/**
 * Script to process role definitions and build a comprehensive permission index.
 * This creates lookup structures to make the UI fast and responsive.
 *
 * This script should be run after update-rbac-data.ts
 *
 * Usage: ts-node scripts/process-rbac-permissions.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AzureRoleDefinition, ResourceType } from '../src/types/rbac';

const DATA_DIR = path.join(__dirname, '../public/data/rbac');

interface PermissionStructure {
  provider: string;
  resourceTypes: Map<string, Set<string>>; // resourceType -> Set of actions
}

interface ActionIndex {
  [provider: string]: {
    [resourceType: string]: string[]; // List of actions
  };
}

function loadRoleDefinitions(): AzureRoleDefinition[] {
  const filePath = path.join(DATA_DIR, 'role-definitions.json');
  if (!fs.existsSync(filePath)) {
    throw new Error('role-definitions.json not found. Run update-rbac-data.ts first.');
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as AzureRoleDefinition[];
}

function extractPermissionStructure(roles: AzureRoleDefinition[]): Map<string, PermissionStructure> {
  console.log('Extracting permission structure from roles...');

  const providerMap = new Map<string, PermissionStructure>();
  // Track canonical casing for resource types (case-insensitive key -> canonical casing)
  const canonicalResourceTypes = new Map<string, string>();

  for (const role of roles) {
    for (const perm of role.permissions) {
      // Process both actions and dataActions
      const allPermissions = [
        ...perm.actions.map((a) => ({ permission: a, isDataAction: false })),
        ...perm.dataActions.map((a) => ({ permission: a, isDataAction: true })),
      ];

      for (const { permission } of allPermissions) {
        // Skip global wildcards - they'll be handled separately in the UI
        if (permission === '*') {
          continue;
        }

        const parts = permission.split('/');
        if (parts.length < 2) continue;

        const provider = parts[0];

        // Get or create provider entry
        if (!providerMap.has(provider)) {
          providerMap.set(provider, {
            provider,
            resourceTypes: new Map(),
          });
        }

        const providerData = providerMap.get(provider)!;

        // If permission is just "Provider/action", treat as provider-level
        if (parts.length === 2) {
          const action = parts[1];
          // Skip provider-level wildcards
          if (action === '*') continue;

          if (!providerData.resourceTypes.has('_provider')) {
            providerData.resourceTypes.set('_provider', new Set());
          }
          providerData.resourceTypes.get('_provider')!.add(action);
          continue;
        }

        // Simplified extraction: Use only the FIRST resource segment
        // Examples:
        //   Microsoft.Compute/virtualMachines/read -> resource: virtualMachines, action: read
        //   Microsoft.Compute/virtualMachines/poweroff/action -> resource: virtualMachines, action: poweroff/action
        //   Microsoft.Compute/virtualMachines/extensions/read -> resource: virtualMachines, action: extensions/read

        const originalResourceType = parts[1]; // Keep original casing
        const resourceTypeLower = originalResourceType.toLowerCase(); // For deduplication
        const action = parts.slice(2).join('/'); // Everything after resource is the action path

        // Skip empty actions but KEEP wildcards (they're important)
        if (!action || action.length === 0) continue;

        // Track canonical casing (first occurrence wins)
        const canonicalKey = `${provider}:${resourceTypeLower}`;
        if (!canonicalResourceTypes.has(canonicalKey)) {
          canonicalResourceTypes.set(canonicalKey, originalResourceType);
        }

        // Use canonical casing for storage
        const canonicalResourceType = canonicalResourceTypes.get(canonicalKey)!;

        if (!providerData.resourceTypes.has(canonicalResourceType)) {
          providerData.resourceTypes.set(canonicalResourceType, new Set());
        }

        providerData.resourceTypes.get(canonicalResourceType)!.add(action);
      }
    }
  }

  console.log(`✓ Extracted permissions for ${providerMap.size} providers`);
  return providerMap;
}

function buildActionIndex(permissionStructure: Map<string, PermissionStructure>): ActionIndex {
  console.log('Building action index...');

  const actionIndex: ActionIndex = {};

  for (const [provider, data] of Array.from(permissionStructure.entries())) {
    actionIndex[provider] = {};

    for (const [resourceType, actions] of Array.from(data.resourceTypes.entries())) {
      actionIndex[provider][resourceType] = Array.from(actions).sort();
    }
  }

  console.log('✓ Built action index');
  return actionIndex;
}

function buildResourceTypesList(permissionStructure: Map<string, PermissionStructure>): ResourceType[] {
  console.log('Building resource types list...');

  const resourceTypes: ResourceType[] = [];

  for (const [provider, data] of Array.from(permissionStructure.entries())) {
    for (const [resourceType, actions] of Array.from(data.resourceTypes.entries())) {
      // Skip provider-level actions
      if (resourceType === '_provider') continue;

      resourceTypes.push({
        name: resourceType,
        fullName: `${provider}/${resourceType}`,
        provider,
        actions: Array.from(actions).sort(),
      });
    }
  }

  // Sort by full name
  resourceTypes.sort((a, b) => a.fullName.localeCompare(b.fullName));

  console.log(`✓ Built ${resourceTypes.length} resource types`);
  return resourceTypes;
}

async function main() {
  try {
    console.log('🚀 Starting permission index processing...\n');

    // Load role definitions
    const roles = loadRoleDefinitions();
    console.log(`✓ Loaded ${roles.length} role definitions\n`);

    // Extract permission structure
    const permissionStructure = extractPermissionStructure(roles);

    // Build action index (provider -> resourceType -> actions)
    const actionIndex = buildActionIndex(permissionStructure);

    // Build resource types list
    const resourceTypes = buildResourceTypesList(permissionStructure);

    // Write output files
    console.log('\nWriting output files...');

    fs.writeFileSync(
      path.join(DATA_DIR, 'action-index.json'),
      JSON.stringify(actionIndex, null, 2)
    );
    console.log('✓ Wrote action-index.json');

    fs.writeFileSync(
      path.join(DATA_DIR, 'resource-types.json'),
      JSON.stringify(resourceTypes, null, 2)
    );
    console.log('✓ Wrote resource-types.json');

    console.log('\n✅ Permission index processing complete!');
    console.log(`   Resource Types: ${resourceTypes.length}`);
    console.log(`   Providers: ${permissionStructure.size}`);
  } catch (error) {
    console.error('❌ Error processing permissions:', error);
    process.exit(1);
  }
}

main();
