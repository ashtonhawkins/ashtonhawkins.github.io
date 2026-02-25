// Fetches the latest tweet from X API v2 and caches to src/data/x-latest.json

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'src', 'data', 'x-latest.json');

const BEARER_TOKEN = process.env.X_BEARER_TOKEN;
const USERNAME = process.env.X_USERNAME || 'ashtin';

function writeFallback() {
  const fallback = {
    id: null,
    text: null,
    created_at: null,
    url: `https://x.com/${USERNAME}`,
    metrics: null,
    author: { name: 'Ashton Hawkins', username: USERNAME, avatar: null },
    fetched_at: new Date().toISOString(),
    _fallback: true,
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(fallback, null, 2));
  console.log('[x] Wrote fallback x-latest.json (no post data available)');
}

async function fetchLatestTweet() {
  if (!BEARER_TOKEN) {
    console.warn('[x] X_BEARER_TOKEN not set. Writing fallback payload.');
    writeFallback();
    return;
  }

  try {
    const userRes = await fetch(`https://api.x.com/2/users/by/username/${USERNAME}`, {
      headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
    });

    if (!userRes.ok) {
      console.error(`[x] User lookup failed: ${userRes.status} ${userRes.statusText}`);
      writeFallback();
      return;
    }

    const userData = await userRes.json();
    const userId = userData.data?.id;
    if (!userId) {
      console.error('[x] Could not resolve user ID from username');
      writeFallback();
      return;
    }

    const query = new URLSearchParams({
      max_results: '5',
      exclude: 'replies,retweets',
      'tweet.fields': 'created_at,public_metrics,entities',
      'user.fields': 'name,username,profile_image_url',
      expansions: 'author_id',
    });

    const tweetsRes = await fetch(`https://api.x.com/2/users/${userId}/tweets?${query}`, {
      headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
    });

    if (!tweetsRes.ok) {
      console.error(`[x] Post fetch failed: ${tweetsRes.status} ${tweetsRes.statusText}`);
      writeFallback();
      return;
    }

    const tweetsData = await tweetsRes.json();
    const tweet = tweetsData.data?.[0];
    const author = tweetsData.includes?.users?.[0];

    if (!tweet) {
      console.warn('[x] No posts found. Writing fallback payload.');
      writeFallback();
      return;
    }

    const output = {
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      url: `https://x.com/${USERNAME}/status/${tweet.id}`,
      metrics: tweet.public_metrics || null,
      author: author
        ? {
            name: author.name,
            username: author.username,
            avatar: author.profile_image_url,
          }
        : null,
      fetched_at: new Date().toISOString(),
    };

    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    console.log(`[x] Cached latest post: "${tweet.text.substring(0, 60)}..."`);
  } catch (error) {
    console.error('[x] Fetch error:', error instanceof Error ? error.message : error);
    writeFallback();
  }
}

fetchLatestTweet();
