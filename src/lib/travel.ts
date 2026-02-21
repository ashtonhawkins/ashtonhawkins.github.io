export interface Destination {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface Trip {
  destination: Destination;
  date: string;
  landmark: string;
}

export interface TravelData {
  lastTrip: Trip | null;
  trips: Trip[];
}

/** SVG path data for landmark line drawings.
 *  Each is a single path string that can be drawn progressively with
 *  stroke-dasharray/stroke-dashoffset or by walking the path with canvas.
 *  Paths are normalized to a 0-100 viewBox.
 */
export const LANDMARKS: Record<string, { name: string; path: string }> = {
  'tokyo-tower': {
    name: 'Tokyo Tower',
    path: 'M50 95 L45 50 L35 10 L50 0 L65 10 L55 50 Z M40 60 L60 60 M42 70 L58 70 M44 80 L56 80',
  },
  'big-ben': {
    name: 'Big Ben',
    path: 'M45 95 L45 20 L42 15 L50 0 L58 15 L55 20 L55 95 Z M42 30 L58 30 M42 50 L58 50',
  },
  'belem-tower': {
    name: 'Belém Tower',
    path: 'M30 95 L30 40 L25 35 L25 20 L75 20 L75 35 L70 40 L70 95 Z M40 30 L60 30',
  },
  'eiffel-tower': {
    name: 'Eiffel Tower',
    path: 'M50 0 L35 95 M50 0 L65 95 M38 60 L62 60 M40 75 L60 75 M42 40 L58 40',
  },
  'sagrada-familia': {
    name: 'Sagrada Família',
    path: 'M30 95 L30 30 L35 10 L37 0 L39 10 L40 30 M60 95 L60 30 L55 10 L53 0 L51 10 L50 30 M45 95 L45 20 L50 5 L55 20 L55 95',
  },
  default: {
    name: 'Destination',
    path: 'M50 95 L30 50 L50 5 L70 50 Z M40 65 L60 65',
  },
};

/** Skyline profiles — arrays of [x_position_%, height_%] representing building heights.
 *  Used to draw a silhouette along the bottom of the canvas.
 */
export const SKYLINES: Record<string, [number, number][]> = {
  Tokyo: [[5, 30], [8, 45], [12, 60], [16, 85], [19, 40], [23, 35], [27, 50], [31, 70], [35, 45], [40, 55], [45, 65], [50, 90], [54, 50], [58, 40], [62, 55], [66, 45], [70, 60], [75, 40], [80, 50], [85, 35], [90, 45], [95, 30]],
  London: [[5, 25], [10, 35], [15, 30], [20, 45], [25, 40], [30, 55], [35, 80], [38, 95], [41, 80], [45, 50], [50, 45], [55, 60], [60, 50], [65, 40], [70, 55], [75, 35], [80, 45], [85, 30], [90, 35], [95, 25]],
  Lisbon: [[5, 20], [12, 30], [20, 25], [28, 35], [35, 40], [42, 50], [50, 45], [58, 35], [65, 30], [72, 40], [80, 35], [88, 25], [95, 20]],
  Paris: [[5, 30], [10, 35], [15, 40], [20, 45], [22, 50], [25, 55], [28, 60], [31, 65], [34, 70], [38, 80], [42, 100], [46, 80], [50, 70], [54, 65], [58, 60], [62, 55], [66, 50], [70, 45], [75, 40], [80, 35], [85, 35], [90, 30], [95, 25]],
  Reykjavik: [[5, 15], [12, 20], [20, 30], [28, 25], [35, 40], [40, 55], [45, 35], [52, 20], [60, 30], [68, 25], [75, 35], [82, 20], [90, 15], [95, 10]],
};

export function getSkyline(city: string): [number, number][] {
  return SKYLINES[city] ?? generateDefaultSkyline();
}

function generateDefaultSkyline(): [number, number][] {
  const points: [number, number][] = [];
  let x = 5;

  while (x <= 95) {
    points.push([x, 15 + Math.floor(Math.random() * 50)]);
    x += 5 + Math.floor(Math.random() * 5);
  }

  return points;
}

export async function loadTravelData(): Promise<TravelData | null> {
  try {
    const data = await import('@data/travel.json');
    const travelData = data.default as TravelData;

    if (!travelData || !travelData.lastTrip || !Array.isArray(travelData.trips)) {
      return null;
    }

    return travelData;
  } catch (error) {
    console.error('[Travel] Failed to load travel data:', error);
    return null;
  }
}
