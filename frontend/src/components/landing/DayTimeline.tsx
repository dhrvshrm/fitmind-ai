import type { ReactNode } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { LANDING_STRINGS } from '../../constants/landingStrings';
import { DeskBreak, EveningTags, GymLogbook, LunchReceipt, ProgressPostcard, StickyNote } from './DayArtifacts';
import { InView } from './InView';
import { dayTimelineStyles as styles } from './DayTimeline.styles';

const D = LANDING_STRINGS.day;

type Stop = {
  time: string;
  period: string;
  title: string;
  caption: string;
  artifact: ReactNode;
};

const STOPS: Stop[] = [
  { ...D.wake, artifact: <StickyNote /> },
  { ...D.gym, artifact: <GymLogbook /> },
  { ...D.lunch, artifact: <LunchReceipt /> },
  { ...D.desk, artifact: <DeskBreak /> },
  { ...D.evening, artifact: <EveningTags /> },
  { ...D.night, artifact: <ProgressPostcard /> },
];

/**
 * What the app does, told as one working day: a big serif time on the left,
 * a dashed rail, and at each stop a note, a logbook page or a receipt
 * instead of yet another feature card.
 */
export function DayTimeline() {
  return (
    <Box component="section" id="day" sx={styles.root}>
      <Box sx={styles.inner}>
        <InView>
          <Box sx={styles.heading}>
            <Typography variant="overline" component="p" sx={styles.eyebrow}>
              {D.eyebrow}
            </Typography>
            <Typography variant="h2" sx={styles.title}>
              {D.title}
            </Typography>
            <Chip size="small" label={LANDING_STRINGS.example} sx={styles.example} />
          </Box>
        </InView>

        <Box component="ol" sx={styles.list}>
          {STOPS.map((stop, index) => (
            <Box component="li" key={stop.time} sx={styles.stop}>
              <Box sx={styles.timeCol}>
                <Typography sx={styles.time}>
                  {stop.time}
                  <Box component="span" sx={styles.period}>
                    {stop.period}
                  </Box>
                </Typography>
              </Box>
              <Box sx={styles.rail} aria-hidden>
                <Box sx={styles.dot} />
              </Box>
              <Box sx={styles.body(index % 2 === 1)}>
                <InView>
                  <Box sx={styles.text}>
                    <Typography variant="h5" component="h3" sx={styles.stopTitle}>
                      {stop.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {stop.caption}
                    </Typography>
                  </Box>
                </InView>
                <InView index={1}>
                  <Box sx={styles.artifact}>{stop.artifact}</Box>
                </InView>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
