import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeActivity, type NormalizedActivity, type RawActivity } from "../src/lib/activity";

describe("normalizeActivity", () => {
  it("normalizes GitHub entries", () => {
    const raw: RawActivity[] = [
      {
        source: "github",
        title: "Pushed 2 commits",
        repo: "ashtonhawkins/site",
        url: "https://github.com/ashtonhawkins/site",
        createdAt: "2024-01-01T12:00:00Z"
      }
    ];

    const result = normalizeActivity(raw);
    assert.equal(result.length, 1);
    const item = result[0];
    assert.equal(item.category, "github");
    assert.equal(item.title, "Pushed 2 commits");
    assert.equal(item.description, "ashtonhawkins/site");
    assert.equal(item.url, "https://github.com/ashtonhawkins/site");
  });

  it("maps RSS items to the reading category", () => {
    const raw: RawActivity[] = [
      {
        source: "rss",
        title: "Designing calm interfaces",
        url: "https://example.com/articles/calm",
        createdAt: "2024-02-10T09:30:00Z",
        feedTitle: "Reading Log"
      }
    ];

    const result = normalizeActivity(raw);
    assert.equal(result.length, 1);
    const item = result[0];
    assert.equal(item.category, "reading");
    assert.equal(item.description, "Reading Log");
  });

  it("handles Last.fm items as music", () => {
    const raw: RawActivity[] = [
      {
        source: "lastfm",
        artist: "Khruangbin",
        track: "August 12",
        url: "https://last.fm/track",
        createdAt: "2024-03-05T21:15:00Z"
      }
    ];

    const result = normalizeActivity(raw);
    assert.equal(result.length, 1);
    const item = result[0];
    assert.equal(item.category, "music");
    assert.equal(item.title, "August 12");
    assert.equal(item.description, "Khruangbin");
  });

  it("filters out invalid entries", () => {
    const raw = [
      { source: "github", createdAt: "not-a-date" },
      { source: "rss", createdAt: null },
      { source: "unknown", createdAt: "2024-01-01T00:00:00Z" }
    ];

    const result = normalizeActivity(raw);
    assert.deepEqual(result, []);
  });

  it("sorts normalized entries by descending date", () => {
    const raw: RawActivity[] = [
      {
        source: "rss",
        title: "Second",
        url: "https://example.com/second",
        createdAt: "2024-01-02T00:00:00Z"
      },
      {
        source: "rss",
        title: "First",
        url: "https://example.com/first",
        createdAt: "2024-01-01T00:00:00Z"
      }
    ];

    const result = normalizeActivity(raw);
    assert.deepEqual(
      result.map((item: NormalizedActivity) => item.title),
      ["Second", "First"]
    );
  });
});
