/**
 * Script to fetch Azure RBAC role definitions from Azure Management API
 * and process them into static JSON files for the RBAC calculator.
 *
 * This script uses the Azure credentials from the app registration used for tenant lookup.
 *
 * Usage: ts-node scripts/update-rbac-data.ts
 */

// Load environment variables from .env.local (for local development)
// In production (e.g., Vercel), environment variables are already available via process.env
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envLocalPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

import { ClientSecretCredential } from '@azure/identity';
import type { AzureRoleDefinition, RBACMetadata, PermissionNode, ResourceProvider, ProviderCategory } from '../src/types/rbac';

const GRAPH_SCOPE = 'https://management.azure.com/.default';
const MANAGEMENT_API_URL = 'https://management.azure.com';
const API_VERSION = '2022-04-01';
const OUTPUT_DIR = path.join(__dirname, '../public/data/rbac');

interface AzureRoleDefinitionResponse {
  value: RoleDefinitionApiResponse[];
  nextLink?: string;
}

interface RoleDefinitionApiResponse {
  id: string;
  name: string;
  type: string;
  properties: {
    roleName: string;
    description: string;
    roleType: string;
    permissions: Array<{
      actions: string[];
      notActions: string[];
      dataActions: string[];
      notDataActions: string[];
      condition?: string | null;
      conditionVersion?: string | null;
    }>;
    assignableScopes: string[];
    createdOn?: string;
    updatedOn?: string;
    createdBy?: string;
    updatedBy?: string;
  };
}

// Provider categories mapping
const PROVIDER_CATEGORIES: Record<string, ProviderCategory> = {
  'Microsoft.Compute': 'Compute',
  'Microsoft.ContainerInstance': 'Compute',
  'Microsoft.ContainerRegistry': 'Compute',
  'Microsoft.ContainerService': 'Compute',
  'Microsoft.Kubernetes': 'Compute',
  'Microsoft.ServiceFabric': 'Compute',
  'Microsoft.Batch': 'Compute',
  'Microsoft.Storage': 'Storage',
  'Microsoft.DataLakeStore': 'Storage',
  'Microsoft.DataLakeAnalytics': 'Storage',
  'Microsoft.StorageCache': 'Storage',
  'Microsoft.Network': 'Networking',
  'Microsoft.Cdn': 'Networking',
  'Microsoft.Dns': 'Networking',
  'Microsoft.TrafficManager': 'Networking',
  'Microsoft.Sql': 'Database',
  'Microsoft.DBforMySQL': 'Database',
  'Microsoft.DBforPostgreSQL': 'Database',
  'Microsoft.DBforMariaDB': 'Database',
  'Microsoft.DocumentDB': 'Database',
  'Microsoft.Cache': 'Database',
  'Microsoft.Synapse': 'Database',
  'Microsoft.Authorization': 'Identity',
  'Microsoft.AAD': 'Identity',
  'Microsoft.AzureActiveDirectory': 'Identity',
  'Microsoft.ManagedIdentity': 'Identity',
  'Microsoft.Security': 'Security',
  'Microsoft.SecurityInsights': 'Security',
  'Microsoft.KeyVault': 'Security',
  'Microsoft.Monitor': 'Monitoring',
  'Microsoft.Insights': 'Monitoring',
  'Microsoft.OperationalInsights': 'Monitoring',
  'Microsoft.LogAnalytics': 'Monitoring',
  'Microsoft.CognitiveServices': 'AI & ML',
  'Microsoft.MachineLearningServices': 'AI & ML',
  'Microsoft.BotService': 'AI & ML',
  'Microsoft.EventGrid': 'Integration',
  'Microsoft.EventHub': 'Integration',
  'Microsoft.ServiceBus': 'Integration',
  'Microsoft.Logic': 'Integration',
  'Microsoft.ApiManagement': 'Integration',
  'Microsoft.Resources': 'Management',
  'Microsoft.Subscription': 'Management',
  'Microsoft.Management': 'Management',
  'Microsoft.Billing': 'Management',
  'Microsoft.Web': 'Web',
  'Microsoft.AppService': 'Web',
  'Microsoft.CertificateRegistration': 'Web',
  'Microsoft.DataFactory': 'Analytics',
  'Microsoft.DataBricks': 'Analytics',
  'Microsoft.StreamAnalytics': 'Analytics',
  'Microsoft.HDInsight': 'Analytics',
};

function getProviderCategory(provider: string): ProviderCategory {
  return PROVIDER_CATEGORIES[provider] || 'Other';
}

function getEnvValue(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }
  return undefined;
}

function getCredential(): ClientSecretCredential {
  const tenantId = getEnvValue('AZURE_TENANT_ID', 'GRAPH_TENANT_ID');
  const clientId = getEnvValue('AZURE_CLIENT_ID', 'GRAPH_CLIENT_ID');
  const clientSecret = getEnvValue('AZURE_CLIENT_SECRET', 'GRAPH_CLIENT_SECRET');

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'Missing Azure AD app registration credentials. Set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID environment variables.'
    );
  }

  return new ClientSecretCredential(tenantId, clientId, clientSecret, {
    authorityHost: process.env.AZURE_AUTHORITY_HOST,
  });
}

async function fetchAllRoleDefinitions(credential: ClientSecretCredential): Promise<RoleDefinitionApiResponse[]> {
  const token = await credential.getToken(GRAPH_SCOPE);
  if (!token) {
    throw new Error('Failed to acquire Azure Management API access token.');
  }

  const allRoles: RoleDefinitionApiResponse[] = [];
  let nextLink: string | undefined = `${MANAGEMENT_API_URL}/providers/Microsoft.Authorization/roleDefinitions?api-version=${API_VERSION}`;

  console.log('Fetching role definitions from Azure Management API...');

  while (nextLink) {
    const response = await fetch(nextLink, {
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch role definitions: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as AzureRoleDefinitionResponse;
    allRoles.push(...data.value);
    nextLink = data.nextLink;

    console.log(`  Fetched ${allRoles.length} roles so far...`);
  }

  console.log(`✓ Fetched total of ${allRoles.length} role definitions`);
  return allRoles;
}

function countPermissions(permissions: AzureRoleDefinition['permissions']): {
  actionCount: number;
  dataActionCount: number;
  totalCount: number;
} {
  let actionCount = 0;
  let dataActionCount = 0;

  for (const perm of permissions) {
    // Check for wildcard permissions (*)
    // Wildcard grants access to ALL permissions, so assign a very high count
    const hasWildcardAction = perm.actions.some(action => action === '*');
    const hasWildcardDataAction = perm.dataActions.some(action => action === '*');

    if (hasWildcardAction) {
      actionCount = 999999; // Extremely high count to represent "all permissions"
    } else {
      actionCount += perm.actions.length;
    }

    if (hasWildcardDataAction) {
      dataActionCount = 999999; // Extremely high count to represent "all permissions"
    } else {
      dataActionCount += perm.dataActions.length;
    }
  }

  return {
    actionCount,
    dataActionCount,
    totalCount: actionCount + dataActionCount,
  };
}

function processRoleDefinitions(apiRoles: RoleDefinitionApiResponse[]): AzureRoleDefinition[] {
  console.log('Processing role definitions...');

  // Filter to only include built-in roles (assignableScopes includes "/")
  // Custom roles are subscription-specific and not universally available
  const builtInRoles = apiRoles.filter((role) =>
    role.properties.assignableScopes?.some((scope) => scope === '/')
  );

  console.log(`✓ Filtered to ${builtInRoles.length} built-in roles (excluded ${apiRoles.length - builtInRoles.length} custom roles)`);

  const processed = builtInRoles.map((role) => {
    const counts = countPermissions(role.properties.permissions);

    const processed: AzureRoleDefinition = {
      id: role.id,
      name: role.name,
      roleName: role.properties.roleName,
      roleType: 'BuiltInRole', // All roles at this point are built-in
      type: role.type,
      description: role.properties.description,
      permissions: role.properties.permissions,
      assignableScopes: role.properties.assignableScopes,
      createdOn: role.properties.createdOn,
      updatedOn: role.properties.updatedOn,
      createdBy: role.properties.createdBy,
      updatedBy: role.properties.updatedBy,
      permissionCount: counts.totalCount,
      actionCount: counts.actionCount,
      dataActionCount: counts.dataActionCount,
    };

    return processed;
  });

  console.log(`✓ Processed ${processed.length} built-in roles`);
  return processed;
}

function parsePermissionString(permission: string, isDataAction: boolean): PermissionNode | null {
  // Skip wildcards for now (will be handled separately)
  if (permission === '*') {
    return null;
  }

  const parts = permission.split('/');
  if (parts.length < 2) {
    return null;
  }

  const provider = parts[0];
  const action = parts[parts.length - 1];

  // Build resource type path (everything between provider and action)
  const resourcePath = parts.slice(1, -1);

  return {
    provider,
    resourceType: resourcePath.length > 0 ? resourcePath.join('/') : undefined,
    action,
    fullPath: permission,
    isDataAction,
  };
}

function extractResourceProviders(roles: AzureRoleDefinition[]): ResourceProvider[] {
  console.log('Extracting resource providers...');

  const providerMap = new Map<string, Set<string>>();
  const actionCountMap = new Map<string, number>();
  // Track canonical casing for resource types (case-insensitive key -> canonical casing)
  const canonicalResourceTypes = new Map<string, string>();

  // Collect all providers and their resource types
  for (const role of roles) {
    for (const perm of role.permissions) {
      const allPermissions = [...perm.actions, ...perm.dataActions];

      for (const permission of allPermissions) {
        if (permission === '*') continue;

        const parts = permission.split('/');
        if (parts.length < 2) continue;

        const provider = parts[0];

        if (!providerMap.has(provider)) {
          providerMap.set(provider, new Set());
          actionCountMap.set(provider, 0);
        }

        // Simplified: Only use the first segment after provider as the resource type
        // Microsoft.Compute/virtualMachines/read -> resourceType = "virtualMachines"
        // Microsoft.Compute/virtualMachines/deallocate/action -> resourceType = "virtualMachines"
        if (parts.length >= 3) {
          const originalResourceType = parts[1];
          const resourceTypeLower = originalResourceType.toLowerCase();

          // Track canonical casing (first occurrence wins)
          const canonicalKey = `${provider}:${resourceTypeLower}`;
          if (!canonicalResourceTypes.has(canonicalKey)) {
            canonicalResourceTypes.set(canonicalKey, originalResourceType);
          }

          const canonicalResourceType = canonicalResourceTypes.get(canonicalKey)!;
          providerMap.get(provider)!.add(canonicalResourceType);
        }

        actionCountMap.set(provider, (actionCountMap.get(provider) || 0) + 1);
      }
    }
  }

  // Convert to ResourceProvider array
  const providers: ResourceProvider[] = Array.from(providerMap.entries()).map(([name, resourceTypes]) => {
    const displayName = name.replace('Microsoft.', '').replace(/([A-Z])/g, ' $1').trim();

    return {
      name,
      displayName,
      category: getProviderCategory(name),
      resourceTypes: Array.from(resourceTypes).sort(),
      actionCount: actionCountMap.get(name) || 0,
    };
  });

  // Sort by name
  providers.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`✓ Extracted ${providers.length} resource providers`);
  return providers;
}

function generateMetadata(roles: AzureRoleDefinition[], providers: ResourceProvider[]): RBACMetadata {
  // All roles are built-in now (custom roles are filtered out)
  let totalActions = 0;
  let totalDataActions = 0;

  for (const role of roles) {
    totalActions += role.actionCount;
    totalDataActions += role.dataActionCount;
  }

  return {
    lastUpdated: new Date().toISOString(),
    roleCount: roles.length,
    builtInRoleCount: roles.length, // All are built-in
    customRoleCount: 0, // Custom roles are excluded
    totalActions,
    totalDataActions,
    providers: providers.map((p) => p.name),
    version: '1.5.0', // Bumped version for simplified resource extraction
  };
}

async function main() {
  try {
    console.log('🚀 Starting RBAC data update...\n');

    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log(`✓ Created output directory: ${OUTPUT_DIR}\n`);
    }

    // Get credentials and fetch data
    const credential = getCredential();
    const apiRoles = await fetchAllRoleDefinitions(credential);

    // Process role definitions
    const roles = processRoleDefinitions(apiRoles);

    // Extract resource providers
    const providers = extractResourceProviders(roles);

    // Generate metadata
    const metadata = generateMetadata(roles, providers);

    // Write files
    console.log('\nWriting output files...');

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'role-definitions.json'),
      JSON.stringify(roles, null, 2)
    );
    console.log('✓ Wrote role-definitions.json');

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'resource-providers.json'),
      JSON.stringify(providers, null, 2)
    );
    console.log('✓ Wrote resource-providers.json');

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    console.log('✓ Wrote metadata.json');

    console.log('\n✅ RBAC data update complete!');
    console.log(`   Roles: ${metadata.roleCount} (${metadata.builtInRoleCount} built-in, ${metadata.customRoleCount} custom)`);
    console.log(`   Providers: ${providers.length}`);
    console.log(`   Total Actions: ${metadata.totalActions}`);
    console.log(`   Total Data Actions: ${metadata.totalDataActions}`);
  } catch (error) {
    console.error('❌ Error updating RBAC data:', error);
    process.exit(1);
  }
}

main();
