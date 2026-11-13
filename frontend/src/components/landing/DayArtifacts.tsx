import { Box, Stack, Typography } from '@mui/material';
import { AccessTimeRounded, AirlineSeatReclineNormalRounded } from '@mui/icons-material';
import { LANDING_STRINGS } from '../../constants/landingStrings';
import { dayArtifactsStyles as styles } from './DayArtifacts.styles';

/*
 * The "things" on each stop of the landing page's day: a sticky note, a gym
 * logbook, a receipt, a desk card, a few tags and a postcard. Sample content,
 * drawn with the theme so it matches the product in light and dark.
 */

const D = LANDING_STRINGS.day;

export function StickyNote() {
  return (
    <Box sx={styles.sticky}>
      <Box sx={styles.tape} aria-hidden />
      <Typography sx={styles.stickyText}>{D.wake.note}</Typography>
      <Typography sx={styles.stickySub}>{D.wake.noteSub}</Typography>
    </Box>
  );
}

export function GymLogbook() {
  const g = D.gym;
  return (
    <Box sx={styles.logbook}>
      <Typography sx={styles.logTitle}>{g.logTitle}</Typography>
      <Box component="table" sx={styles.logTable}>
        <thead>
          <tr>
            {g.logHead.map((head) => (
              <Box component="th" key={head} sx={styles.logHead}>
                {head}
              </Box>
            ))}
          </tr>
        </thead>
        <tbody>
          {g.logRows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, index) => (
                <Box component="td" key={`${row[0]}-${index}`} sx={styles.logCell(index === 2)}>
                  {cell}
                </Box>
              ))}
            </tr>
          ))}
        </tbody>
      </Box>
      <Box sx={styles.stamp} aria-hidden>
        {g.stamp}
      </Box>
    </Box>
  );
}

export function LunchReceipt() {
  const l = D.lunch;
  return (
    <Stack sx={styles.lunch}>
      <Box sx={styles.bubble}>{l.message}</Box>
      <Box sx={styles.receipt}>
        <Typography sx={styles.receiptTitle}>{l.receiptTitle}</Typography>
        {l.receiptRows.map(([name, kcal]) => (
          <Stack key={name} sx={styles.receiptRow}>
            <span>{name}</span>
            <span>{kcal}</span>
          </Stack>
        ))}
        <Stack sx={styles.receiptTotal}>
          <span>{l.receiptTotal[0]}</span>
          <span>{l.receiptTotal[1]}</span>
        </Stack>
        <Typography sx={styles.receiptProtein}>{l.receiptProtein}</Typography>
      </Box>
    </Stack>
  );
}

export function DeskBreak() {
  const d = D.desk;
  return (
    <Box sx={styles.desk}>
      <Stack sx={styles.deskHead}>
        <Box sx={styles.timer} aria-hidden>
          <AccessTimeRounded fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle2">{d.card}</Typography>
          <Typography variant="caption" color="text.secondary">
            {d.cardMeta}
          </Typography>
        </Box>
      </Stack>
      <Stack component="ol" sx={styles.deskSteps}>
        {d.steps.map((step) => (
          <Stack component="li" key={step} sx={styles.deskStep}>
            <AirlineSeatReclineNormalRounded sx={styles.deskIcon} />
            <Typography variant="body2">{step}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

/** Small tilts so the tags look dropped on the page, not laid out by a grid. */
const TAG_TILTS = [-3, 2, -1, 3, -2];

export function EveningTags() {
  const e = D.evening;
  return (
    <Box sx={styles.evening}>
      <Box sx={styles.tags}>
        {e.tags.map((tag, index) => (
          <Box key={tag} sx={styles.tag(TAG_TILTS[index % TAG_TILTS.length], index === 0)}>
            {tag}
          </Box>
        ))}
      </Box>
      <Typography sx={styles.handLine}>{e.plan}</Typography>
    </Box>
  );
}

export function ProgressPostcard() {
  const n = D.night;
  return (
    <Box sx={styles.postcard}>
      <Box sx={styles.postStamp} aria-hidden>
        <Box component="img" src="/favicon.svg" alt="" sx={styles.postStampImg} />
      </Box>
      <Typography sx={styles.postTitle}>{n.postcardTitle}</Typography>
      <Box component="svg" viewBox="0 0 200 50" sx={styles.spark} aria-hidden>
        <path d="M4 12 C 30 14, 45 22, 70 24 S 120 33, 150 36 S 185 42, 196 42" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </Box>
      {n.postcardLines.map((line) => (
        <Typography key={line} sx={styles.postLine}>
          {line}
        </Typography>
      ))}
    </Box>
  );
}
