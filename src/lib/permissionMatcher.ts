/**
 * Utility for matching Azure RBAC permissions and finding suitable roles.
 * Handles wildcard matching, NotActions, and calculates least privilege scores.
 */

import type { AzureRoleDefinition, RoleMatchResult, RolePermission } from '@/types/rbac';

/**
 * Check if a permission pattern matches a specific permission
 * Handles wildcards (*) in the pattern
 *
 * Examples:
 *   - "Microsoft.Storage/*" matches "Microsoft.Storage/storageAccounts/read"
 *   - "Microsoft.Storage/storageAccounts/*" matches "Microsoft.Storage/storageAccounts/read"
 *   - "*" matches anything
 */
function permissionMatches(pattern: string, permission: string): boolean {
  // Exact match
  if (pattern === permission) {
    return true;
  }

  // Wildcard match
  if (pattern === '*') {
    return true;
  }

  // Pattern with wildcard at the end
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2); // Remove /*
    return permission.startsWith(prefix + '/');
  }

  // Pattern with wildcard in the middle (e.g., "Microsoft.*/read")
  if (pattern.includes('*')) {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '[^/]*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(permission);
  }

  return false;
}

/**
 * Check if a permission is granted by a role, considering actions and notActions
 */
function isPermissionGranted(
  permission: string,
  rolePermissions: RolePermission[],
  isDataAction: boolean = false
): boolean {
  for (const perm of rolePermissions) {
    const actions = isDataAction ? perm.dataActions : perm.actions;
    const notActions = isDataAction ? perm.notDataActions : perm.notActions;

    // Check if permission is granted by actions
    const isGranted = actions.some((action) => permissionMatches(action, permission));

    if (!isGranted) {
      continue;
    }

    // Check if permission is excluded by notActions
    const isExcluded = notActions.some((notAction) => permissionMatches(notAction, permission));

    if (!isExcluded) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a role has wildcard permissions (*)
 */
function hasWildcardPermission(role: AzureRoleDefinition): boolean {
  for (const perm of role.permissions) {
    if (perm.actions.includes('*') || perm.dataActions.includes('*')) {
      return true;
    }
  }
  return false;
}

/**
 * Get all permissions granted by a role (expanding wildcards where possible)
 * This is used to calculate excess permissions
 */
function getGrantedPermissions(
  role: AzureRoleDefinition,
  consideredPermissions: string[]
): string[] {
  const granted = new Set<string>();

  for (const perm of role.permissions) {
    const allActions = [...perm.actions, ...perm.dataActions];

    for (const action of allActions) {
      if (action === '*') {
        // For wildcard, we can only check against considered permissions
        for (const consideredPerm of consideredPermissions) {
          if (isPermissionGranted(consideredPerm, role.permissions)) {
            granted.add(consideredPerm);
          }
        }
      } else if (action.includes('*')) {
        // For partial wildcards, check which considered permissions match
        for (const consideredPerm of consideredPermissions) {
          if (permissionMatches(action, consideredPerm)) {
            granted.add(consideredPerm);
          }
        }
      } else {
        // Specific permission
        granted.add(action);
      }
    }
  }

  return Array.from(granted);
}

/**
 * Find roles that match the selected permissions and calculate match scores
 */
export function findMatchingRoles(
  selectedPermissions: string[],
  allRoles: AzureRoleDefinition[]
): RoleMatchResult[] {
  if (selectedPermissions.length === 0) {
    return [];
  }

  const results: RoleMatchResult[] = [];

  for (const role of allRoles) {
    const matchedPermissions: string[] = [];
    const missingPermissions: string[] = [];

    // Check which selected permissions are granted by this role
    for (const permission of selectedPermissions) {
      // Check both as regular action and data action
      const isGrantedAsAction = isPermissionGranted(permission, role.permissions, false);
      const isGrantedAsDataAction = isPermissionGranted(permission, role.permissions, true);

      if (isGrantedAsAction || isGrantedAsDataAction) {
        matchedPermissions.push(permission);
      } else {
        missingPermissions.push(permission);
      }
    }

    // Only include roles that match at least one permission
    if (matchedPermissions.length === 0) {
      continue;
    }

    // Calculate match percentage
    const matchPercentage = (matchedPermissions.length / selectedPermissions.length) * 100;

    // Get all permissions granted by this role
    const allGranted = getGrantedPermissions(role, selectedPermissions);

    // Calculate excess permissions (permissions granted but not requested)
    let excessPermissions = allGranted.filter((p) => !selectedPermissions.includes(p));

    // Special handling for wildcard roles - they grant EVERYTHING
    const isWildcardRole = hasWildcardPermission(role);
    let excessCount = excessPermissions.length;

    if (isWildcardRole) {
      // Wildcard roles grant all permissions, so excess count should be extremely high
      // We use the role's permissionCount (which is 999999 for wildcard roles)
      excessCount = role.permissionCount;
    }

    // Calculate score for ranking (lower is better)
    // Formula: prioritize roles that match all permissions, then minimize excess permissions and total permissions
    const completenessScore = missingPermissions.length * 10000; // Heavily penalize missing permissions
    const excessScore = excessCount * 10; // Penalize excess permissions
    const totalPermissionScore = role.permissionCount; // Significantly penalize roles with many total permissions
    const score = completenessScore + excessScore + totalPermissionScore;

    results.push({
      role,
      matchedPermissions,
      matchPercentage,
      excessPermissions,
      excessCount, // Use calculated excessCount (high for wildcard roles)
      missingPermissions,
      score,
    });
  }

  // Sort by score (lower is better - least privilege)
  results.sort((a, b) => {
    // First, prioritize perfect matches (100% match)
    if (a.matchPercentage === 100 && b.matchPercentage !== 100) return -1;
    if (a.matchPercentage !== 100 && b.matchPercentage === 100) return 1;

    // Then sort by score
    return a.score - b.score;
  });

  return results;
}

/**
 * Get suggested permissions based on common patterns
 */
export function getSuggestedPermissions(provider: string, resourceType: string): string[] {
  const suggestions: string[] = [];

  // Common action patterns
  const commonActions = ['read', 'write', 'delete', 'action'];

  for (const action of commonActions) {
    suggestions.push(`${provider}/${resourceType}/${action}`);
  }

  return suggestions;
}

/**
 * Parse a permission string into its components
 */
export function parsePermission(permission: string): {
  provider: string;
  resourceType?: string;
  action?: string;
} | null {
  const parts = permission.split('/');

  if (parts.length < 2) {
    return null;
  }

  const provider = parts[0];

  if (parts.length === 2) {
    return {
      provider,
      action: parts[1],
    };
  }

  const action = parts[parts.length - 1];
  const resourceType = parts.slice(1, -1).join('/');

  return {
    provider,
    resourceType,
    action,
  };
}

/**
 * Build a full permission string from components
 */
export function buildPermission(
  provider: string,
  resourceType: string,
  action: string
): string {
  return `${provider}/${resourceType}/${action}`;
}

/**
 * Validate if a permission string is well-formed
 */
export function isValidPermission(permission: string): boolean {
  if (!permission || typeof permission !== 'string') {
    return false;
  }

  // Must contain at least provider/action
  const parts = permission.split('/');
  if (parts.length < 2) {
    return false;
  }

  // Provider must start with a letter
  if (!/^[a-zA-Z]/.test(parts[0])) {
    return false;
  }

  // Each part must be non-empty (unless it's a wildcard)
  for (const part of parts) {
    if (part.length === 0) {
      return false;
    }
  }

  return true;
}
