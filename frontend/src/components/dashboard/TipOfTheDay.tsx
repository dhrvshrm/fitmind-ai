import { useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { CloseRounded, LightbulbRounded, PsychologyAltRounded } from '@mui/icons-material';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { STRINGS } from '../../constants/strings';
import { tipService } from '../../services/tipService';
import { tipOfTheDayStyles as styles } from './TipOfTheDay.styles';

const S = STRINGS.dashboard.tip;
const DISMISSED_KEY = 'fitmind-tip-dismissed';

function dismissedOn(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

/**
 * One short tip or "did you know" fact a day, shown quietly at the top of the
 * dashboard. Closing it hides it until tomorrow's tip.
 */
export function TipOfTheDay() {
  const tip = useQuery({ queryKey: QUERY_KEYS.tips.today, queryFn: tipService.today, staleTime: 60 * 60 * 1000 });
  const [hiddenDate, setHiddenDate] = useState(dismissedOn);
  const data = tip.data;
  const visible = Boolean(data) && hiddenDate !== data?.date;

  function dismiss() {
    if (!data) return;
    try {
      localStorage.setItem(DISMISSED_KEY, data.date);
    } catch {
      // Storage can be unavailable (private mode); hiding for this visit is fine.
    }
    setHiddenDate(data.date);
  }

  const fact = data?.kind === 'fact';
  const Icon = fact ? PsychologyAltRounded : LightbulbRounded;

  return (
    <AnimatePresence initial>
      {visible && data && (
        <motion.div
          key={data.date}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={styles.motion}
        >
          <Box component="aside" aria-label={fact ? S.factLabel : S.tipLabel} sx={styles.card}>
            <Box sx={styles.iconWrap}>
              <Icon fontSize="small" />
            </Box>
            <Box sx={styles.body}>
              <Typography variant="overline" sx={styles.label}>
                {fact ? S.factLabel : S.tipLabel}
              </Typography>
              <Typography variant="body1" sx={styles.text}>
                {data.text}
              </Typography>
            </Box>
            <IconButton size="small" aria-label={S.dismiss} onClick={dismiss} sx={styles.close}>
              <CloseRounded fontSize="small" />
            </IconButton>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
