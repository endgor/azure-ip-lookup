// This script runs during build to ensure data files are available
const fs = require('fs');
const path = require('path');

console.log('Running build script for Azure data validation...');

// Define paths
const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.join(PROJECT_ROOT, 'public', 'data');
const RBAC_DIR = path.join(DATA_DIR, 'rbac');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  console.log('Public/data directory not found! Creating empty one.');
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// List all files in the data directory
try {
  const files = fs.readdirSync(DATA_DIR);
  const jsonFiles = files.filter(file => file.endsWith('.json'));

  console.log(`Found ${jsonFiles.length} JSON files in data directory`);

  // Check if we have required IP data files
  const requiredFiles = ['AzureCloud.json', 'AzureChinaCloud.json', 'AzureUSGovernment.json', 'file-metadata.json'];
  const missingFiles = requiredFiles.filter(file => !jsonFiles.includes(file));

  if (missingFiles.length > 0) {
    console.error(`ERROR: Missing required IP data files: ${missingFiles.join(', ')}`);
    console.error('Please run "npm run update-ip-data" to download the latest Azure IP ranges.');
    process.exit(1);
  }

  console.log('✓ IP data files validated');

  // Check for RBAC data files (optional for now)
  if (fs.existsSync(RBAC_DIR)) {
    const rbacFiles = fs.readdirSync(RBAC_DIR);
    const rbacJsonFiles = rbacFiles.filter(file => file.endsWith('.json'));

    const requiredRbacFiles = ['role-definitions.json', 'resource-providers.json', 'metadata.json'];
    const missingRbacFiles = requiredRbacFiles.filter(file => !rbacJsonFiles.includes(file));

    if (missingRbacFiles.length > 0) {
      console.warn(`WARNING: Missing RBAC data files: ${missingRbacFiles.join(', ')}`);
      console.warn('Run "npm run update-rbac-data" to enable RBAC calculator feature.');
    } else {
      console.log('✓ RBAC data files validated');
    }
  } else {
    console.warn('WARNING: RBAC data directory not found. RBAC calculator will not be available.');
    console.warn('Run "npm run update-rbac-data" to enable RBAC calculator feature.');
  }

  console.log('\n✅ Build validation completed successfully.');
} catch (err) {
  console.error('Error in build script:', err);
  process.exit(1);
}
