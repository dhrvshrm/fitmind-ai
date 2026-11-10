import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { MOTION } from '../../constants/motion';

type AnimatedNumberProps = {
  value: number;
  /** Decimal places shown (default whole numbers). */
  decimals?: number;
};

/**
 * A number that counts smoothly to its new value when it changes (after
 * logging a meal, earning XP...). Shows the final value straight away when
 * reduced motion is on.
 */
export function AnimatedNumber({ value, decimals = 0 }: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (reduceMotion || from === value) {
      setDisplay(value);
      return undefined;
    }
    const controls = animate(from, value, {
      duration: MOTION.countDuration,
      ease: MOTION.ease,
      onUpdate: setDisplay,
    });
    return () => controls.stop();
  }, [value, reduceMotion]);

  return <>{display.toFixed(decimals)}</>;
}
