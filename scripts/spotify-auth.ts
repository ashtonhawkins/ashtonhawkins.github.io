/**
 * One-time OAuth2 setup script for the Spotify API.
 * Run with: npx tsx scripts/spotify-auth.ts
 *
 * This is NOT part of the GitHub Actions workflow — it's a local setup tool.
 *
 * Steps:
 * 1. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET as environment variables
 * 2. Run this script
 * 3. Authorize in the browser window that opens
 * 4. Copy the printed refresh token into your GitHub Actions secrets
 *
 * Required scopes:
 * - user-read-currently-playing   (now playing)
 * - user-read-recently-played     (recent tracks)
 * - user-top-read                 (top artists/tracks)
 * - user-read-playback-state      (playback state details)
 */

import { createServer } from 'node:http';
import { URL } from 'node:url';

const PORT = 3000;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

const SCOPES = [
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-top-read',
  'user-read-playback-state',
].join(' ');

async function main() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      'Missing environment variables. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.\n' +
        'Example:\n' +
        '  SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy npx tsx scripts/spotify-auth.ts'
    );
    process.exit(1);
  }

  const authUrl =
    `${SPOTIFY_AUTH_URL}?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&show_dialog=true`;

  console.log('\n=== Spotify OAuth2 Setup ===\n');
  console.log('Open this URL in your browser to authorize:\n');
  console.log(`  ${authUrl}\n`);
  console.log(`Waiting for callback on http://localhost:${PORT}/callback ...\n`);

  // Try to open the browser automatically
  try {
    const { exec } = await import('node:child_process');
    const openCmd =
      process.platform === 'darwin'
        ? 'open'
        : process.platform === 'win32'
          ? 'start'
          : 'xdg-open';
    exec(`${openCmd} "${authUrl}"`);
  } catch {
    // If auto-open fails, user can still copy the URL
  }

  return new Promise<void>((resolve) => {
    const server = createServer(async (req, res) => {
      if (!req.url?.startsWith('/callback')) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const url = new URL(req.url, `http://localhost:${PORT}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>Authorization Error</h1><p>${error}</p>`);
        console.error(`Authorization error: ${error}`);
        server.close();
        resolve();
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Missing authorization code</h1>');
        server.close();
        resolve();
        return;
      }

      console.log('Authorization code received. Exchanging for tokens...\n');

      try {
        // Spotify uses Basic auth for token exchange
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const tokenResponse = await fetch(SPOTIFY_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
          }),
        });

        if (!tokenResponse.ok) {
          const text = await tokenResponse.text();
          throw new Error(`Token exchange failed (${tokenResponse.status}): ${text}`);
        }

        const tokens = (await tokenResponse.json()) as {
          access_token: string;
          refresh_token: string;
          token_type: string;
          expires_in: number;
          scope: string;
        };

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          '<h1>Authorization successful!</h1>' +
            '<p>You can close this window. Check the terminal for your tokens.</p>'
        );

        console.log('=== Tokens Retrieved Successfully ===\n');
        console.log('Add these as GitHub Actions secrets:\n');
        console.log(`  SPOTIFY_CLIENT_ID=${clientId}`);
        console.log(`  SPOTIFY_CLIENT_SECRET=${clientSecret}`);
        console.log(`  SPOTIFY_REFRESH_TOKEN=${tokens.refresh_token}\n`);
        console.log(`Granted scopes: ${tokens.scope}\n`);
        console.log(
          `Access token (expires in ${tokens.expires_in}s): ${tokens.access_token}\n`
        );
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>Token Exchange Error</h1><p>${err}</p>`);
        console.error('Token exchange failed:', err);
      }

      server.close();
      resolve();
    });

    server.listen(PORT);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
