import feedsConfig from '@data/feeds.json';

export async function fetchFeeds() {
  return {
    config: feedsConfig,
    items: []
  };
}
