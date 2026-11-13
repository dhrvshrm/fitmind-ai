/**
 * The page's background texture: faint, hand-drawn line doodles of an Indian
 * kitchen and a home gym (roti, katori with steam, curry leaf, chilli, water
 * drop, dumbbell, kettlebell), tiled across the page behind the cards. Drawn
 * as one SVG tile so it costs a single small data URI and no network request.
 */

const TILE = 360;

/** Each motif is drawn around (0, 0) and placed with a transform. */
const MOTIFS: { at: [number, number]; rotate: number; d: string }[] = [
  // Roti: a slightly uneven circle with a few charred spots.
  {
    at: [70, 70],
    rotate: -8,
    d: 'M-24,0 C-24,-14 -13,-25 1,-24 C15,-23 25,-13 24,1 C23,15 13,25 -1,24 C-15,23 -24,14 -24,0 Z '
      + 'M-10,-8 q2,-2 4,0 M7,-11 q2,-1 3,1 M10,6 q1,2 -1,3 M-6,10 q2,1 3,-1 M0,-1 q1,1 0,2',
  },
  // Dumbbell.
  {
    at: [232, 58],
    rotate: -18,
    d: 'M-20,0 L20,0 M-30,-13 h8 a2,2 0 0 1 2,2 v22 a2,2 0 0 1 -2,2 h-8 a2,2 0 0 1 -2,-2 v-22 a2,2 0 0 1 2,-2 Z '
      + 'M22,-13 h8 a2,2 0 0 1 2,2 v22 a2,2 0 0 1 -2,2 h-8 a2,2 0 0 1 -2,-2 v-22 a2,2 0 0 1 2,-2 Z '
      + 'M-38,-8 h6 v16 h-6 Z M32,-8 h6 v16 h-6 Z',
  },
  // Curry leaf with its midrib and veins.
  {
    at: [304, 176],
    rotate: 28,
    d: 'M0,-24 C13,-13 13,11 0,24 C-13,11 -13,-13 0,-24 Z M0,-24 L0,32 M0,-10 L6,-15 M0,-2 L-6,-7 M0,7 L6,2 M0,15 L-5,10',
  },
  // Water drop with a highlight.
  {
    at: [168, 168],
    rotate: 0,
    d: 'M0,-21 C8,-9 14,-1 14,7 C14,15 8,21 0,21 C-8,21 -14,15 -14,7 C-14,-1 -8,-9 0,-21 Z M-6,8 q0,6 5,8',
  },
  // Katori (bowl) with two wisps of steam.
  {
    at: [78, 262],
    rotate: 4,
    d: 'M-26,0 L26,0 C24,15 13,23 0,23 C-13,23 -24,15 -26,0 Z M-30,0 L30,0 '
      + 'M-8,-7 c-5,-6 5,-10 0,-17 M6,-7 c-5,-6 5,-10 0,-17',
  },
  // Green chilli with its stem.
  {
    at: [262, 292],
    rotate: -24,
    d: 'M-26,4 C-8,16 14,10 24,-10 M-26,4 C-12,7 8,3 22,-13 M23,-12 c2,-5 6,-7 11,-6',
  },
  // Kettlebell.
  {
    at: [182, 266],
    rotate: 10,
    d: 'M-11,-9 C-11,-27 11,-27 11,-9 M0,7 m-16,0 a16,16 0 1,0 32,0 a16,16 0 1,0 -32,0',
  },
];

/** Small crosses and dots that fill the gaps between motifs. */
const SPARKS: [number, number, 'cross' | 'dot'][] = [
  [140, 38, 'cross'], [30, 168, 'dot'], [104, 150, 'cross'], [336, 84, 'dot'],
  [238, 132, 'dot'], [330, 248, 'cross'], [128, 330, 'dot'], [26, 330, 'cross'], [300, 340, 'dot'],
];

function sparkPath([x, y, kind]: (typeof SPARKS)[number]): string {
  return kind === 'cross'
    ? `M${x - 4},${y} L${x + 4},${y} M${x},${y - 4} L${x},${y + 4}`
    : `M${x},${y} m-1.4,0 a1.4,1.4 0 1,0 2.8,0 a1.4,1.4 0 1,0 -2.8,0`;
}

/** The tile as a CSS `url(...)`, stroked in `color` at `opacity`. */
export function doodleBackground(color: string, opacity: number): string {
  const motifs = MOTIFS.map(
    ({ at: [x, y], rotate, d }) => `<path transform="translate(${x} ${y}) rotate(${rotate})" d="${d}"/>`,
  ).join('');
  const sparks = `<path d="${SPARKS.map(sparkPath).join(' ')}"/>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">`
    + `<g fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">`
    + motifs + sparks + '</g></svg>';
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export const DOODLE_TILE_PX = TILE;
