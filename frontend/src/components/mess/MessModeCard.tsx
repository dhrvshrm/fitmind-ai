import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { EditRounded, RamenDiningRounded, SettingsSuggestRounded } from '@mui/icons-material';
import { MESS_MEALS } from '../../constants/mess';
import { MESS_STRINGS } from '../../constants/messStrings';
import { useUserProfile } from '../../hooks/queries/useProfileQueries';
import type { MessSetup } from '../../types/mess';
import { IconBadge } from '../ui/IconBadge';
import { SectionCard } from '../ui/SectionCard';
import { MessModeDialog } from './MessModeDialog';
import { messModeCardStyles as styles } from './MessModeCard.styles';

const S = MESS_STRINGS.card;

function joinMeals(meals: string[]): string {
  if (meals.length <= 1) return meals.join('');
  return `${meals.slice(0, -1).join(', ')} and ${meals[meals.length - 1]}`;
}

/** PG and hostel mess mode: status, and the way to set it up or change it. */
export function MessModeCard() {
  const profile = useUserProfile();
  const [open, setOpen] = useState(false);
  const access = profile.data?.food_access ?? {};
  const setup: MessSetup = { mess_meals: access.mess_meals ?? [], shelf: access.shelf ?? [] };
  const isOn = setup.mess_meals.length > 0;
  const eatsAtMess = access.who_cooks === 'mess_or_canteen';
  const meals = MESS_MEALS.filter((m) => setup.mess_meals.includes(m)).map((m) =>
    MESS_STRINGS.meals[m].toLowerCase(),
  );

  return (
    <SectionCard
      title={S.title}
      subtitle={isOn ? S.subtitleOn : S.subtitleOff}
      action={
        <Button
          size="small"
          startIcon={isOn ? <EditRounded /> : <SettingsSuggestRounded />}
          onClick={() => setOpen(true)}
          disabled={!profile.data}
        >
          {isOn ? S.edit : S.setUp}
        </Button>
      }
    >
      {isOn ? (
        <Stack sx={styles.row}>
          <IconBadge icon={RamenDiningRounded} tone="primary" />
          <Box>
            <Typography variant="body2">{S.on(joinMeals(meals))}</Typography>
            <Typography variant="caption" color="text.secondary">
              {setup.shelf.length ? S.shelfLine(setup.shelf.length) : S.noShelf}
            </Typography>
          </Box>
        </Stack>
      ) : (
        eatsAtMess && (
          <Typography variant="body2" sx={styles.nudge}>
            {S.suggestMess}
          </Typography>
        )
      )}
      {open && (
        <MessModeDialog
          initial={isOn ? setup : { mess_meals: ['breakfast', 'lunch', 'dinner'], shelf: setup.shelf }}
          dietType={profile.data?.food_preferences?.diet_type}
          isOn={isOn}
          onClose={() => setOpen(false)}
        />
      )}
    </SectionCard>
  );
}
