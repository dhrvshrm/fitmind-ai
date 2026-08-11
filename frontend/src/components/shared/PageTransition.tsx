import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

type PageTransitionProps = {
  children: ReactNode;
};

/**
 * Fades and slides routed page content in on each navigation. Keying the
 * motion element by pathname remounts it per route, so the enter animation
 * replays whenever the user changes pages.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
