# Azure Static Web Apps Deployment Troubleshooting

## Current Issue: Invalid API Key

The deployment is failing due to an **Invalid API key** error. The build process completes successfully, but the deployment to Azure Static Web Apps fails during the upload phase.

### Error Details
```
Status: Failed. Time: 507.386733(s)
Deployment Failed :(
Deployment Failure Reason: Invalid API key.
```

## How to Fix the API Key Issue

### Option 1: Regenerate the Azure Static Web Apps API Token

1. **Go to Azure Portal**
   - Navigate to your Azure Static Web Apps resource
   - Go to **Overview** → **Manage deployment token**

2. **Generate New Token**
   - Click **Reset token** to generate a new deployment token
   - Copy the new token

3. **Update GitHub Secret**
   - Go to your GitHub repository settings
   - Navigate to **Settings** → **Secrets and variables** → **Actions**
   - Find the secret named `AZURE_STATIC_WEB_APPS_API_TOKEN_LEMON_MUD_068CD8703`
   - Update it with the new token from step 2

### Option 2: Recreate the Azure Static Web Apps Resource

If regenerating the token doesn't work:

1. **Delete the current resource** (optional - for a fresh start)
2. **Create a new Azure Static Web Apps resource**
3. **Connect it to your GitHub repository**
4. **Azure will automatically create a new workflow file and secrets**

## Maintenance Page Implementation

I've created two maintenance pages to handle service unavailability:

### 1. React-based Maintenance Page
- **File**: `src/pages/maintenance.tsx`
- **Route**: `/maintenance`
- **Features**: Full React component with proper SEO and accessibility

### 2. Static HTML Maintenance Page
- **File**: `public/maintenance.html`
- **Route**: `/maintenance.html` or `/maintenance`
- **Features**: Pure HTML/CSS that works even when React fails to build

### Configuration Updates

The `staticwebapp.config.json` has been updated to handle maintenance routing:

```json
{
  "route": "/maintenance",
  "rewrite": "/maintenance.html"
},
{
  "route": "/maintenance.html", 
  "headers": {
    "Cache-Control": "no-cache, no-store, must-revalidate"
  }
}
```

## Usage

### For Planned Maintenance
1. Temporarily update your DNS or load balancer to redirect traffic to `/maintenance`
2. Or manually redirect users to `https://yoursite.com/maintenance`

### For Deployment Failures
1. The static HTML version (`/maintenance.html`) will be available even when the Next.js app fails to deploy
2. Users can be directed to this page until the deployment issue is resolved

## Auto-Refresh Feature

Both maintenance pages include:
- **5-minute auto-refresh**: Pages automatically reload every 5 minutes
- **Manual refresh button**: Users can manually check if service is restored
- **Alternative resources**: Links to Microsoft's official IP ranges and other Azure tools

## Next Steps

1. **Fix the API key issue** using Option 1 or 2 above
2. **Test the deployment** by pushing a small change
3. **Monitor the GitHub Actions** to ensure successful deployment
4. **Keep the maintenance pages** for future use

## Monitoring

To check deployment status:
```bash
gh run list --limit 5
gh run view [RUN_ID] --log-failed
```

The maintenance pages will be valuable for future deployments or when you need to perform maintenance on the service.