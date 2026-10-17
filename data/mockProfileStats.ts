/**
 * MOCK ONLY. There are no ratings/exchanges tables yet, so these numbers are generated
 * deterministically from the profile id (same id -> same numbers every time).
 * Replace getMockProfileStats() with a real query when exchanges + reviews exist.
 */
export type ProfileStats = { rating: number; ratingCount: number; exchanges: number; showUpRate: number };

function hash(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function getMockProfileStats(id: string): ProfileStats {
  const h = hash(id);
  const exchanges = 3 + (h % 20);
  return {
    rating: Math.round((4.2 + ((h >> 3) % 8) / 10) * 10) / 10, 
    ratingCount: Math.max(1, exchanges - 1 - ((h >> 5) % 3)),
    exchanges,
    showUpRate: 90 + ((h >> 7) % 11),
  };
}