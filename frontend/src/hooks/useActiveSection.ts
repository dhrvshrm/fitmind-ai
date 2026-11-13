import { useEffect, useState } from 'react';

/**
 * Which of the page's sections (by element id) is currently the main one on
 * screen, for highlighting the matching nav link. Null above the first one.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        // The first section (in page order) that's meaningfully on screen wins.
        const current = ids.find((id) => (visible.get(id) ?? 0) > 0);
        setActive(current ?? null);
      },
      // Count a section once it reaches the upper part of the screen.
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.01] },
    );
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}
