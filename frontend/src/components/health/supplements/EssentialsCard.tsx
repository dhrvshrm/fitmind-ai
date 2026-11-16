import { useState } from 'react';
import { Box, Button, Chip, Skeleton, Stack, Typography } from '@mui/material';
import { AddRounded, CheckRounded, RestaurantRounded } from '@mui/icons-material';
import {
  BUDGET_OPTIONS_INR,
  BUDGET_STORAGE_KEY,
  DEFAULT_BUDGET_INR,
} from '../../../constants/supplements';
import { SUPPLEMENT_STRINGS } from '../../../constants/supplementStrings';
import { queryErrorMessage } from '../../../hooks/queries/queryHelpers';
import {
  useMySupplements,
  useSupplementCatalog,
  useSupplementEssentials,
} from '../../../hooks/queries/useSupplementQueries';
import type { CatalogSupplement, EssentialItem } from '../../../types/supplements';
import { ErrorState } from '../../ui/ErrorState';
import { SectionCard } from '../../ui/SectionCard';
import { SupplementDialog } from './SupplementDialog';
import { essentialsCardStyles as styles } from './EssentialsCard.styles';

const S = SUPPLEMENT_STRINGS.essentials;

function readBudget(): number {
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
    // Nothing saved yet must mean the default, not "food only" (Number(null) is 0).
    const stored = raw === null ? NaN : Number(raw);
    return BUDGET_OPTIONS_INR.includes(stored) ? stored : DEFAULT_BUDGET_INR;
  } catch {
    return DEFAULT_BUDGET_INR;
  }
}

function saveBudget(value: number) {
  try {
    localStorage.setItem(BUDGET_STORAGE_KEY, String(value));
  } catch {
    // Storage can be blocked (private windows); the choice just won't be remembered.
  }
}

type ItemProps = {
  item: EssentialItem;
  tracked?: boolean;
  onTrack?: () => void;
  compact?: boolean;
};

function Item({ item, tracked = false, onTrack, compact = false }: ItemProps) {
  return (
    <Box component="li" sx={styles.item(compact)}>
      <Stack sx={styles.itemHead}>
        <Box sx={styles.itemText}>
          <Typography variant="subtitle2" component="h3">
            {item.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {S.dose} {item.default_dose} · {S.perMonth(item.monthly_cost_inr)}
          </Typography>
        </Box>
        {onTrack && (
          <Button
            size="small"
            variant={tracked ? 'text' : 'contained'}
            startIcon={tracked ? <CheckRounded /> : <AddRounded />}
            onClick={onTrack}
            disabled={tracked}
            sx={styles.track}
          >
            {tracked ? S.tracking : S.track}
          </Button>
        )}
      </Stack>
      {!compact && item.why && <Typography variant="body2">{item.why}</Typography>}
      {!compact && item.india_gap && (
        <Typography variant="body2" color="text.secondary">
          <Box component="strong" sx={styles.label}>
            {S.indiaGap}:
          </Box>{' '}
          {item.india_gap}
        </Typography>
      )}
      <Stack sx={styles.food}>
        <RestaurantRounded fontSize="small" sx={styles.foodIcon} />
        <Typography variant="body2" color="text.secondary">
          <Box component="strong" sx={styles.label}>
            {S.foodFirst}:
          </Box>{' '}
          {item.food_first}
        </Typography>
      </Stack>
    </Box>
  );
}

/**
 * The bare minimum for this person: at most three supplements that fit their
 * body, diet, training and results, within the monthly budget they choose.
 * No brands, food first, and anything needing a doctor listed apart.
 */
export function EssentialsCard() {
  const [budget, setBudget] = useState<number>(readBudget);
  const essentials = useSupplementEssentials(budget);
  const catalog = useSupplementCatalog();
  const mine = useMySupplements();
  const [adding, setAdding] = useState<CatalogSupplement | null>(null);
  const error = queryErrorMessage(essentials.error, S.loadError);
  const tracked = new Set((mine.data ?? []).map((s) => s.supplement_id));
  const data = essentials.data;

  function choose(value: number) {
    setBudget(value);
    saveBudget(value);
  }

  function track(id: string) {
    const entry = catalog.data?.supplements.find((s) => s.id === id);
    if (entry) setAdding(entry);
  }

  return (
    <SectionCard title={S.title} subtitle={S.subtitle}>
      <Box role="group" aria-label={S.budgetLabel} sx={styles.budget}>
        <Typography variant="caption" sx={styles.budgetLabel}>
          {S.budgetLabel}
        </Typography>
        <Box sx={styles.chips}>
          {BUDGET_OPTIONS_INR.map((value) => (
            <Chip
              key={value}
              label={S.budget(value)}
              clickable
              aria-pressed={budget === value}
              color={budget === value ? 'primary' : 'default'}
              variant={budget === value ? 'filled' : 'outlined'}
              onClick={() => choose(value)}
            />
          ))}
        </Box>
      </Box>

      {essentials.isPending && <Skeleton variant="rounded" height={160} />}
      {error && !data && <ErrorState message={error} onRetry={() => essentials.refetch()} />}
      {data && (
        <Box sx={styles.body}>
          {data.picks.length > 0 && (
            <>
              <Box component="ul" sx={styles.list}>
                {data.picks.map((item) => (
                  <Item key={item.id} item={item} tracked={tracked.has(item.id)} onTrack={() => track(item.id)} />
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {S.total(data.total_inr)}
              </Typography>
            </>
          )}
          {data.picks.length === 0 && data.later.length === 0 && data.ask_doctor.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {S.none}
            </Typography>
          )}
          {data.later.length > 0 && (
            <Box>
              <Typography variant="caption" sx={styles.sectionTitle}>
                {data.picks.length === 0 ? S.foodOnly : S.later}
              </Typography>
              <Box component="ul" sx={styles.list}>
                {data.later.map((item) => (
                  <Item key={item.id} item={item} compact />
                ))}
              </Box>
            </Box>
          )}
          {data.ask_doctor.length > 0 && (
            <Box>
              <Typography variant="caption" sx={styles.sectionTitle}>
                {S.askDoctor}
              </Typography>
              <Box component="ul" sx={styles.list}>
                {data.ask_doctor.map((item) => (
                  <Item key={item.id} item={item} compact />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
      {adding && <SupplementDialog catalog={adding} onClose={() => setAdding(null)} />}
    </SectionCard>
  );
}
