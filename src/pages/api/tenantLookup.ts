import type { NextApiRequest, NextApiResponse } from 'next';
import { ClientSecretCredential, TokenCredential } from '@azure/identity';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';

interface TenantInformation {
  tenantId: string;
  defaultDomainName?: string;
  displayName?: string;
  federationBrandName?: string | null;
}

interface TenantMetadata {
  cloud_instance_name?: string;
  tenant_region_scope?: string;
  tenant_region_sub_scope?: string;
  authorization_endpoint?: string;
  issuer?: string;
  [key: string]: unknown;
}

interface TenantLookupResponse {
  input: {
    domain: string;
  };
  tenant: TenantInformation;
  metadata?: TenantMetadata;
  derived: {
    azureAdInstance?: string;
    tenantScope?: string;
  };
  fetchedAt: string;
}

type ErrorResponse = {
  error: string;
};

const GRAPH_SCOPE = process.env.GRAPH_SCOPE ?? 'https://graph.microsoft.com/.default';
const GRAPH_BASE_URL = process.env.GRAPH_BASE_URL ?? 'https://graph.microsoft.com';

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000', 'https://localhost:3000'];

const CLOUD_INSTANCE_LABELS: Record<string, string> = {
  AzureADMyOrg: 'Azure AD Global',
  AzureADChina: 'Azure AD China',
  AzureADGermany: 'Azure AD Germany',
  AzureADGovernment: 'Azure AD Government',
  AzureADUSGovernment: 'Azure AD US Government',
  AzureADUSSecurity: 'Azure AD US Security',
  AzureADUSGovernmentCloud: 'Azure AD US Government',
};

const REGION_SCOPE_LABELS: Record<string, string> = {
  NA: 'North America',
  EU: 'Europe',
  AS: 'Asia',
  IN: 'India',
  OC: 'Oceania',
  AF: 'Africa',
  ME: 'Middle East',
  SA: 'South America',
  CA: 'Canada',
  CN: 'China',
  DE: 'Germany',
  USGov: 'United States Government',
};

class MissingCredentialsError extends Error {
  constructor() {
    super(
      'Missing Azure AD app registration credentials. Set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID (or legacy GRAPH_* equivalents).'
    );
    this.name = 'MissingCredentialsError';
  }
}

let cachedCredential: TokenCredential | null = null;

function getEnvValue(...keys: string[]): string | undefined {
  return keys.map(key => process.env[key]).find(value => value);
}

function getCredential(): TokenCredential {
  if (cachedCredential) {
    return cachedCredential;
  }

  const tenantId = getEnvValue('AZURE_TENANT_ID', 'GRAPH_TENANT_ID');
  const clientId = getEnvValue('AZURE_CLIENT_ID', 'GRAPH_CLIENT_ID');
  const clientSecret = getEnvValue('AZURE_CLIENT_SECRET', 'GRAPH_CLIENT_SECRET');

  if (!tenantId || !clientId || !clientSecret) {
    throw new MissingCredentialsError();
  }

  cachedCredential = new ClientSecretCredential(tenantId, clientId, clientSecret, {
    authorityHost: process.env.AZURE_AUTHORITY_HOST,
  });

  return cachedCredential;
}

function formatAzureAdInstance(instance?: string, regionScope?: string): string | undefined {
  if (!instance) return undefined;
  const instanceLabel = CLOUD_INSTANCE_LABELS[instance] ?? instance;
  const regionLabel = regionScope ? REGION_SCOPE_LABELS[regionScope] ?? regionScope : null;
  return regionLabel ? `${instanceLabel}: ${regionLabel}` : instanceLabel;
}

function formatTenantScope(subScope?: string): string | undefined {
  if (!subScope) return 'Not applicable';
  return REGION_SCOPE_LABELS[subScope] ?? subScope;
}

function normalizeDomain(rawDomain: string | null): string | null {
  if (!rawDomain) return null;
  const trimmed = rawDomain.trim().toLowerCase();
  const domainRegex = /^(?=.{1,255}$)(?!-)(?:[a-z0-9-]{0,62}[a-z0-9]\.)+[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/i;
  return trimmed && domainRegex.test(trimmed) ? trimmed : null;
}

async function fetchTenantInformation(domain: string, credential: TokenCredential) {
  const token = await credential.getToken(GRAPH_SCOPE);
  if (!token) {
    throw new Error('Failed to acquire Microsoft Graph access token.');
  }

  const safeDomain = domain.replace(/'/g, "''");
  const graphUrl = `${GRAPH_BASE_URL}/v1.0/tenantRelationships/findTenantInformationByDomainName(domainName='${safeDomain}')`;

  const response = await fetch(graphUrl, {
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    console.error(`Graph request failed with status ${response.status}`);
    throw new Error('Microsoft Graph request failed.');
  }

  return (await response.json()) as TenantInformation;
}

async function fetchTenantMetadata(tenantIdOrDomain: string): Promise<TenantMetadata | null> {
  const metadataUrl = `https://login.microsoftonline.com/${tenantIdOrDomain}/v2.0/.well-known/openid-configuration`;

  try {
    const response = await fetch(metadataUrl);
    if (!response.ok) {
      console.warn(`Metadata fetch returned status ${response.status}`);
      return null;
    }
    return (await response.json()) as TenantMetadata;
  } catch (error) {
    console.warn('Failed to fetch OpenID metadata');
    return null;
  }
}

function sendJson<T>(
  res: NextApiResponse<T>,
  status: number,
  payload: T,
  corsOrigin?: string,
  rateLimitHeaders?: { limit: number; remaining: number; reset: number }
) {
  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Vary', 'Origin');
  }
  if (rateLimitHeaders) {
    res.setHeader('X-RateLimit-Limit', rateLimitHeaders.limit.toString());
    res.setHeader('X-RateLimit-Remaining', rateLimitHeaders.remaining.toString());
    res.setHeader('X-RateLimit-Reset', rateLimitHeaders.reset.toString());
  }
  res.status(status).json(payload);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TenantLookupResponse | ErrorResponse>
) {
  const origin = req.headers.origin ?? '';
  const corsAllowedOrigins = (process.env.TENANT_LOOKUP_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const corsAllowOrigin = [...corsAllowedOrigins, ...DEFAULT_ALLOWED_ORIGINS].includes(origin)
    ? origin
    : undefined;

  if (req.method === 'OPTIONS') {
    if (corsAllowOrigin) {
      res.setHeader('Access-Control-Allow-Origin', corsAllowOrigin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '3600');
    res.status(204).end();
    return;
  }

  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(clientId);

  if (!rateLimit.success) {
    const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter.toString());
    if (corsAllowOrigin) {
      res.setHeader('Access-Control-Allow-Origin', corsAllowOrigin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('X-RateLimit-Limit', rateLimit.limit.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', rateLimit.reset.toString());
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }

  const rateLimitHeaders = {
    limit: rateLimit.limit,
    remaining: rateLimit.remaining,
    reset: rateLimit.reset,
  };

  if (!['GET', 'POST'].includes(req.method ?? '')) {
    sendJson(res, 405, { error: 'Method Not Allowed' }, corsAllowOrigin, rateLimitHeaders);
    return;
  }

  try {
    const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const requestBody =
      req.method === 'POST' ? (body as Record<string, unknown>) : ({} as Record<string, unknown>);
    const bodyDomain = typeof requestBody['domain'] === 'string' ? requestBody['domain'] : null;
    const domainParam = typeof req.query.domain === 'string' ? req.query.domain : bodyDomain;
    const domain = normalizeDomain(domainParam ?? '');

    if (!domain) {
      sendJson(
        res,
        400,
        { error: 'Enter a valid tenant-verified domain such as contoso.com.' },
        corsAllowOrigin,
        rateLimitHeaders
      );
      return;
    }

    const credential = getCredential();
    const tenantInfo = await fetchTenantInformation(domain, credential);

    if (!tenantInfo) {
      sendJson(
        res,
        404,
        {
          error: `No Microsoft Entra tenant found for ${domain}.`,
        },
        corsAllowOrigin,
        rateLimitHeaders
      );
      return;
    }

    const tenantIdOrDomain = tenantInfo.tenantId || tenantInfo.defaultDomainName || domain;
    const metadata = await fetchTenantMetadata(tenantIdOrDomain);
    const result: TenantLookupResponse = {
      input: {
        domain,
      },
      tenant: tenantInfo,
      metadata: metadata ?? undefined,
      derived: {
        azureAdInstance: formatAzureAdInstance(
          metadata?.cloud_instance_name,
          metadata?.tenant_region_scope
        ),
        tenantScope: formatTenantScope(metadata?.tenant_region_sub_scope),
      },
      fetchedAt: new Date().toISOString(),
    };

    sendJson(res, 200, result, corsAllowOrigin, rateLimitHeaders);
  } catch (error) {
    if (error instanceof MissingCredentialsError) {
      console.error('Tenant lookup configuration error');
      sendJson(
        res,
        500,
        { error: 'Unable to retrieve tenant information. Try again later.' },
        corsAllowOrigin,
        rateLimitHeaders
      );
      return;
    }

    console.error('Tenant lookup failed');
    sendJson(
      res,
      500,
      { error: 'Unable to retrieve tenant information. Try again later.' },
      corsAllowOrigin,
      rateLimitHeaders
    );
  }
}
