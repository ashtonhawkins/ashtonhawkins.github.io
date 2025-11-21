import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Parser from "rss-parser";
import { fetch } from "undici";

import feeds from "./feeds.config.json" assert { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputPath = path.join(rootDir, "public", "data", "activity.json");
const githubUser = "ashtonhawkins";

type GithubCommit = {
  sha?: string;
  url?: string;
};

type GithubPage = {
  html_url?: string;
};

type GithubEventPayload = {
  action?: string;
  ref?: string;
  ref_type?: string;
  issue?: { title?: string; html_url?: string };
  pull_request?: { title?: string; html_url?: string };
  comment?: { html_url?: string };
  release?: { name?: string; tag_name?: string; html_url?: string };
  pages?: GithubPage[];
  commits?: GithubCommit[];
};

type GithubEvent = {
  type?: string;
  repo?: { name?: string };
  payload?: GithubEventPayload;
  created_at?: string;
};

const GITHUB_EVENT_TITLES: Record<string, (event: GithubEvent) => string> = {
  PushEvent: (event) => {
    const repo = event.repo?.name ?? "repository";
    const branch = event.payload?.ref?.split("/").pop();
    const commitCount = event.payload?.commits?.length ?? 0;
    const commitText = commitCount === 1 ? "commit" : "commits";
    const branchText = branch ? ` on ${branch}` : "";
    return `Pushed ${commitCount} ${commitText} to ${repo}${branchText}`;
  },
  IssuesEvent: (event) => {
    const action = event.payload?.action ?? "updated";
    const title = event.payload?.issue?.title ?? "issue";
    return `${capitalize(action)} issue: ${title}`;
  },
  IssueCommentEvent: (event) => {
    const action = event.payload?.action ?? "commented on";
    const title = event.payload?.issue?.title ?? event.repo?.name ?? "issue";
    return `${capitalize(action)} issue: ${title}`;
  },
  PullRequestEvent: (event) => {
    const action = event.payload?.action ?? "updated";
    const title = event.payload?.pull_request?.title ?? "pull request";
    return `${capitalize(action)} pull request: ${title}`;
  },
  PullRequestReviewCommentEvent: (event) => {
    const title = event.payload?.pull_request?.title ?? event.repo?.name ?? "pull request";
    return `Reviewed pull request: ${title}`;
  },
  CreateEvent: (event) => {
    const refType = event.payload?.ref_type ?? "repository";
    const ref = event.payload?.ref ?? event.repo?.name ?? "resource";
    return `Created ${refType}: ${ref}`;
  },
  ReleaseEvent: (event) => {
    const action = event.payload?.action ?? "published";
    const name = event.payload?.release?.name ?? event.payload?.release?.tag_name ?? "release";
    return `${capitalize(action)} release: ${name}`;
  },
};

type GithubActivity = {
  source: "github";
  type: string;
  repo: string | null;
  title: string;
  url: string | null;
  createdAt: string;
};

type RssActivity = {
  source: "rss";
  title: string;
  url: string;
  createdAt: string;
  feedTitle: string | null;
};

type LastFmActivity = {
  source: "lastfm";
  artist: string;
  track: string;
  url: string | null;
  createdAt: string;
};

type ActivityItem = GithubActivity | RssActivity | LastFmActivity;

function capitalize(value: string): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function fetchGithubEvents(): Promise<GithubActivity[]> {
  const eventsUrl = `https://api.github.com/users/${githubUser}/events/public`;

  try {
    const response = await fetch(eventsUrl, {
      headers: {
        "User-Agent": "ashtonhawkins-aggregate-script",
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      console.warn(`GitHub request failed with status ${response.status}`);
      return [];
    }

    const events = (await response.json()) as GithubEvent[];

    return events
      .filter((event) => event?.created_at)
      .map((event) => {
        const repoName: string | null = event.repo?.name ?? null;
        const createdAt: string = event.created_at ?? new Date().toISOString();
        const titleResolver = GITHUB_EVENT_TITLES[event.type as string];
        const title = titleResolver ? titleResolver(event) : formatDefaultGithubTitle(event.type, repoName);

        return {
          source: "github" as const,
          type: event.type,
          repo: repoName,
          title,
          url: resolveGithubUrl(event),
          createdAt,
        } satisfies GithubActivity;
      });
  } catch (error) {
    console.warn("Failed to fetch GitHub events:", error);
    return [];
  }
}

function formatDefaultGithubTitle(type: string, repo: string | null): string {
  if (repo) {
    return `${type} at ${repo}`;
  }
  return type;
}

function resolveGithubUrl(event: GithubEvent): string | null {
  const repoName: string | null = event.repo?.name ?? null;
  const repoHtmlUrl = repoName ? `https://github.com/${repoName}` : null;

  const payload = event.payload ?? {};

  if (payload.issue?.html_url) return payload.issue.html_url;
  if (payload.pull_request?.html_url) return payload.pull_request.html_url;
  if (payload.comment?.html_url) return payload.comment.html_url;
  if (payload.release?.html_url) return payload.release.html_url;
  if (payload.pages?.length) {
    const page = payload.pages.find((page) => page.html_url);
    if (page?.html_url) return page.html_url;
  }
  if (payload.commits?.length) {
      const commit = payload.commits[0];
    if (commit?.url && repoName) {
      const sha = commit.sha ?? "";
      return `https://github.com/${repoName}/commit/${sha}`;
    }
  }

  return repoHtmlUrl;
}

async function fetchRssFeeds(): Promise<RssActivity[]> {
  const parser = new Parser();

  const feedItems = await Promise.all(
    feeds.map(async (feedUrl) => {
      if (!feedUrl) return [];

      try {
        const feed = await parser.parseURL(feedUrl);
        const feedTitle = feed.title ?? null;

        return (feed.items ?? [])
          .filter((item) => item.link)
          .map((item) => {
            const isoDate = item.isoDate ?? item.pubDate ?? new Date().toISOString();
            return {
              source: "rss" as const,
              title: item.title ?? item.link ?? "Untitled item",
              url: item.link!,
              createdAt: new Date(isoDate).toISOString(),
              feedTitle,
            } satisfies RssActivity;
          });
      } catch (error) {
        console.warn(`Failed to parse feed ${feedUrl}:`, error);
        return [];
      }
    })
  );

  return feedItems.flat();
}

async function fetchLastFm(): Promise<LastFmActivity[]> {
  const apiKey = process.env.LASTFM_API_KEY;
  const user = process.env.LASTFM_USER;

  if (!apiKey || !user) {
    return [];
  }

  const params = new URLSearchParams({
    method: "user.getrecenttracks",
    user,
    api_key: apiKey,
    format: "json",
    limit: "1",
  });

  const requestUrl = `https://ws.audioscrobbler.com/2.0/?${params.toString()}`;

  try {
    const response = await fetch(requestUrl);

    if (!response.ok) {
      console.warn(`Last.fm request failed with status ${response.status}`);
      return [];
    }

    type LastFmTrack = {
      artist?: { "#text"?: string; name?: string };
      name?: string;
      date?: { uts?: string };
      url?: unknown;
    };

    type LastFmResponse = {
      recenttracks?: { track?: LastFmTrack[] };
    };

    const data = (await response.json()) as LastFmResponse;
    const track = data?.recenttracks?.track?.[0];
    if (!track) return [];

    const artist = track.artist?.["#text"] ?? track.artist?.name ?? "Unknown artist";
    const trackName = track.name ?? "Unknown track";
    const createdAt = track.date?.uts ? new Date(Number(track.date.uts) * 1000).toISOString() : new Date().toISOString();

    return [
      {
        source: "lastfm" as const,
        artist,
        track: trackName,
        url: typeof track.url === "string" ? track.url : null,
        createdAt,
      },
    ];
  } catch (error) {
    console.warn("Failed to fetch Last.fm activity:", error);
    return [];
  }
}

async function main(): Promise<void> {
  const [github, rss, lastfm] = await Promise.all([
    fetchGithubEvents(),
    fetchRssFeeds(),
    fetchLastFm(),
  ]);

  const allItems: ActivityItem[] = [...github, ...rss, ...lastfm];

  const sorted = allItems
    .filter((item) => {
      if (!item.createdAt) return false;
      const time = Date.parse(item.createdAt);
      return Number.isFinite(time);
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 50);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(sorted, null, 2) + "\n");

  console.log(`Wrote ${sorted.length} activity items to ${path.relative(rootDir, outputPath)}`);
}

main().catch((error) => {
  console.error("Aggregation failed:", error);
  process.exitCode = 1;
});
