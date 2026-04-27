/** Generate a PKCE code verifier and challenge */
export async function generatePKCE() {
  const verifier = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

  const encoder  = new TextEncoder();
  const data     = encoder.encode(verifier);
  const digest   = await crypto.subtle.digest('SHA-256', data);

  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return { verifier, challenge };
}
