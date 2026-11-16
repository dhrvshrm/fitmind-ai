import { Box, Stack, Typography } from '@mui/material';
import { LightbulbOutlined, ScheduleRounded } from '@mui/icons-material';
import { SUPPLEMENT_STRINGS } from '../../../constants/supplementStrings';
import { useSupplementRoutine } from '../../../hooks/queries/useSupplementQueries';
import { supplementRoutineStyles as styles } from './SupplementRoutine.styles';

const R = SUPPLEMENT_STRINGS.routine;

/**
 * Everything the person takes, grouped by when in their day (from their
 * workout and meal times), with a tip where a better time would fold a
 * supplement into a step they already take.
 */
export function SupplementRoutine() {
  const routine = useSupplementRoutine();
  const groups = routine.data?.groups ?? [];
  if (!groups.length) return null;

  return (
    <Box sx={styles.root}>
      <Typography variant="caption" sx={styles.title}>
        {R.title}
      </Typography>
      <Box component="ol" sx={styles.list}>
        {groups.map((group) => (
          <Box component="li" key={group.slot} sx={styles.group}>
            <Stack sx={styles.when}>
              <ScheduleRounded fontSize="small" sx={styles.clock} />
              <Typography variant="body2" sx={styles.time}>
                {group.time} · {group.label}
                {group.after_training ? `, ${R.afterTraining}` : ''}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={styles.items}>
              {group.items.map((i) => (i.dose ? `${i.name} ${i.dose}` : i.name)).join(' + ')}
            </Typography>
            {group.items
              .filter((i) => i.suggestion)
              .map((i) => (
                <Stack key={i.id} sx={styles.tip}>
                  <LightbulbOutlined fontSize="small" sx={styles.tipIcon} />
                  <Typography variant="caption" color="text.secondary">
                    {i.name}: {R.tip(SUPPLEMENT_STRINGS.timings[i.suggestion!.timing], i.suggestion!.why)}
                  </Typography>
                </Stack>
              ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
