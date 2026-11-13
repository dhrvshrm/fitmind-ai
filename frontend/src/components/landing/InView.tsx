import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { MOTION } from '../../constants/motion';
import { inViewStyles as styles } from './InView.styles';

type InViewProps = {
  children: ReactNode;
  /** Position in a row of items; later ones appear a little later (capped). */
  index?: number;
  /** Stretch to the grid cell's height, for equal-height cards. */
  fill?: boolean;
};

/**
 * Fades content up the first time it scrolls into view. The app's MotionConfig
 * turns this off for people who prefer reduced motion.
 */
export function InView({ children, index = 0, fill = false }: InViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: MOTION.revealDistance * 2 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: MOTION.revealDuration * 1.5,
        ease: MOTION.ease,
        delay: Math.min(index, MOTION.maxStaggerItems) * MOTION.stagger * 2,
      }}
      style={fill ? styles.fill : styles.block}
    >
      {children}
    </motion.div>
  );
}
