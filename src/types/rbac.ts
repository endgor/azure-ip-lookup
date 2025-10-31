/**
 * Azure RBAC role and permission type definitions
 */

export interface AzureRoleDefinition {
  id: string;
  name: string; // GUID
  roleName: string; // Display name
  roleType: 'BuiltInRole' | 'CustomRole';
  type: string; // Microsoft.Authorization/roleDefinitions
  description: string;
  permissions: RolePermission[];
  assignableScopes: string[];
  createdOn?: string;
  updatedOn?: string;
  createdBy?: string;
  updatedBy?: string;
  // Computed fields for UI
  permissionCount: number; // Total count of actions + dataActions
  actionCount: number; // Count of actions
  dataActionCount: number; // Count of dataActions
}

export interface RolePermission {
  actions: string[];
  notActions: string[];
  dataActions: string[];
  notDataActions: string[];
  condition?: string | null;
  conditionVersion?: string | null;
}

export interface PermissionNode {
  provider: string; // Microsoft.Storage
  resourceType?: string; // storageAccounts
  subResource?: string; // containers
  action?: string; // read, write, delete
  fullPath: string; // Microsoft.Storage/storageAccounts/read
  isDataAction: boolean; // true for dataActions, false for actions
}

export interface PermissionIndex {
  [provider: string]: {
    [resourceType: string]: {
      [action: string]: RoleMatch[];
    };
  };
}

export interface RoleMatch {
  roleName: string;
  roleId: string;
  isDataAction: boolean;
  isDirect: boolean; // true if exact match, false if from wildcard
}

export interface ResourceProvider {
  name: string; // Microsoft.Storage
  displayName: string; // Storage
  category: ProviderCategory;
  resourceTypes: string[]; // List of resource types
  actionCount: number; // Total number of actions
}

export type ProviderCategory =
  | 'Compute'
  | 'Storage'
  | 'Networking'
  | 'Database'
  | 'Identity'
  | 'Security'
  | 'Monitoring'
  | 'AI & ML'
  | 'Integration'
  | 'Management'
  | 'Web'
  | 'Analytics'
  | 'Other';

export interface ResourceType {
  name: string; // storageAccounts
  fullName: string; // Microsoft.Storage/storageAccounts
  provider: string; // Microsoft.Storage
  actions: string[]; // List of available actions
}

export interface SelectedPermissions {
  provider: string;
  resourceTypes: ResourceTypeSelection[];
}

export interface ResourceTypeSelection {
  resourceType: string;
  actions: string[];
}

export interface RoleMatchResult {
  role: AzureRoleDefinition;
  matchedPermissions: string[]; // Permissions that match user's selection
  matchPercentage: number; // Percentage of selected permissions matched (0-100)
  excessPermissions: string[]; // Extra permissions beyond what user selected
  excessCount: number; // Count of excess permissions
  missingPermissions: string[]; // Selected permissions not granted by this role
  score: number; // Computed score for ranking (lower is better/least privilege)
}

export interface RBACMetadata {
  lastUpdated: string;
  roleCount: number;
  builtInRoleCount: number;
  customRoleCount: number;
  totalActions: number;
  totalDataActions: number;
  providers: string[];
  version?: string; // Optional for backwards compatibility
}
