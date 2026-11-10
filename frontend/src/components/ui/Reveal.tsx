import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { MOTION } from '../../constants/motion';
import { revealStyles as styles } from './Reveal.styles';

type RevealProps = {
  children: ReactNode;
  /** Position in a list; later items appear a little later (capped). */
  index?: number;
  /** Stretch to the grid cell's height, for cards in equal-height rows. */
  fill?: boolean;
};

/** Fades and slides content up as it appears. */
export function Reveal({ children, index = 0, fill = false }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: MOTION.revealDistance }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: MOTION.revealDuration,
        ease: MOTION.ease,
        delay: Math.min(index, MOTION.maxStaggerItems) * MOTION.stagger,
      }}
      style={fill ? styles.fill : styles.block}
    >
      {children}
    </motion.div>
  );
}
