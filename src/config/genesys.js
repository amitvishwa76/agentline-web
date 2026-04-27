// Genesys Cloud Configuration
export const GENESYS_CONFIG = {
  region: 'aps1',
  apiBase: 'https://api.aps1.pure.cloud/api/v2',
  authUrl: 'https://login.aps1.pure.cloud/oauth/authorize',
  tokenUrl: 'https://login.aps1.pure.cloud/oauth/token',

  // Replace with your actual OAuth client ID from Genesys Admin
  clientId: '7f64d1a9-a8c2-4106-b81c-5d18589160c8',

  // Redirect URIs — update for production
  redirectUri: import.meta.env.DEV
    ? 'http://localhost:5173/callback'
    : 'https://resonant-melomakarona-8c328f.netlify.app/callback',

  scopes: [
    'conversations',
    'presence',
    'users',
    'notifications',
    'routing',
    'outbound',
    'outbound:readonly',
  ].join(' '),
};
