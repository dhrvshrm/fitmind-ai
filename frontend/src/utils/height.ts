/** Height conversions. Height is always stored in cm; feet/inches is for entry only. */

export const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

/** 5 ft 6.6 in -> 169.2 cm (rounded to 0.1). */
export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * INCHES_PER_FOOT + inches) * CM_PER_INCH * 10) / 10;
}

/** 169.2 cm -> { feet: 5, inches: 6.6 }. */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / CM_PER_INCH;
  let feet = Math.floor(totalInches / INCHES_PER_FOOT);
  let inches = Math.round((totalInches - feet * INCHES_PER_FOOT) * 10) / 10;
  // 11.96 in rounds to 12.0: carry it into the next foot.
  if (inches >= INCHES_PER_FOOT) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}
