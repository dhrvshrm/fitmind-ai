import { useEffect, useState } from 'react';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import { OndemandVideoRounded, PauseRounded, PlayArrowRounded } from '@mui/icons-material';
import { STRINGS } from '../../constants/strings';
import { DEMO_FRAME_MS } from '../../constants/exercises';
import { exerciseDemoStyles as styles } from './ExerciseDemo.styles';

const S = STRINGS.exercises.detail;

type ExerciseDemoProps = {
  name: string;
  images: string[];
  videoUrl: string | null;
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The movement shown by alternating the start and end photos. Pauses for
 * people who prefer reduced motion; a video link appears when one exists.
 */
export function ExerciseDemo({ name, images, videoUrl }: ExerciseDemoProps) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    if (!playing || images.length < 2) return undefined;
    const timer = window.setInterval(() => setFrame((f) => (f + 1) % images.length), DEMO_FRAME_MS);
    return () => window.clearInterval(timer);
  }, [playing, images.length]);

  if (images.length === 0) return null;

  return (
    <Box sx={styles.root}>
      <Box sx={styles.stage}>
        {/* A blurred copy fills the frame, so portrait photos show whole instead of being cropped. */}
        <Box component="img" src={images[frame]} alt="" aria-hidden sx={styles.backdrop} />
        {images.map((src, index) => (
          <Box
            key={src}
            component="img"
            src={src}
            alt={S.demoAlt(name, index)}
            loading="lazy"
            sx={styles.frame(index === frame)}
          />
        ))}
        {images.length > 1 && (
          <Tooltip title={playing ? S.pause : S.play}>
            <IconButton
              size="small"
              aria-label={playing ? S.pause : S.play}
              onClick={() => setPlaying((p) => !p)}
              sx={styles.toggle}
            >
              {playing ? <PauseRounded fontSize="small" /> : <PlayArrowRounded fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {videoUrl && (
        <Button
          size="small"
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          startIcon={<OndemandVideoRounded />}
          sx={styles.video}
        >
          {S.watchVideo}
        </Button>
      )}
    </Box>
  );
}
