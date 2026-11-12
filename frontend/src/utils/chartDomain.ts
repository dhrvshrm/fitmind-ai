/** A Y-axis domain padded by `pad` and snapped to whole numbers, so ticks read 66, 67, 68. */
export function wholeNumberDomain(pad: number): [(min: number) => number, (max: number) => number] {
  return [(min) => Math.floor(min - pad), (max) => Math.ceil(max + pad)];
}
