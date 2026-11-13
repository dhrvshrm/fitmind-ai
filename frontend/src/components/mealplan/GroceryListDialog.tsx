import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ContentCopyRounded, PrintRounded, RestartAltRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { INDIA_FIRST_STRINGS } from '../../constants/indiaFirstStrings';
import { useGroceryList } from '../../hooks/queries/useDietPlanQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { amountText, groceryText, printGroceryList } from '../../utils/grocery';
import { modeName } from '../../utils/mealPlan';
import { ErrorState } from '../ui/ErrorState';
import { groceryListDialogStyles as styles } from './GroceryListDialog.styles';

const G = INDIA_FIRST_STRINGS.grocery;
const DAY_OPTIONS = [1, 3, 7] as const;
const DEFAULT_DAYS = 7;

type GroceryListDialogProps = {
  onClose: () => void;
};

/** The plan's dishes over a few days as one shopping list, grouped by aisle, with tick-off. */
export function GroceryListDialog({ onClose }: GroceryListDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [days, setDays] = useState<number>(DEFAULT_DAYS);
  const [ticked, setTicked] = useState<Set<string>>(() => new Set());
  const list = useGroceryList(days, true);
  const data = list.data;
  const error = queryErrorMessage(list.error, G.loadError);
  const empty = data && data.aisles.length === 0;
  // Older servers don't send it; treat as nothing left out.
  const leftOut = data?.left_out ?? [];

  function toggle(key: string) {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function copy() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(groceryText(data));
      toast.success(G.copied);
    } catch {
      toast.error(G.copyError);
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen} scroll="paper">
      <DialogTitle>
        {G.title}
        <Typography variant="body2" color="text.secondary">
          {G.subtitle(days)}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={styles.content}>
        <Stack sx={styles.toolbar}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={days}
            onChange={(_, value: number | null) => value && setDays(value)}
            aria-label={G.daysLabel}
          >
            {DAY_OPTIONS.map((n) => (
              <ToggleButton key={n} value={n} sx={styles.toggle}>
                {G.days(n)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {ticked.size > 0 && (
            <Button size="small" color="inherit" startIcon={<RestartAltRounded />} onClick={() => setTicked(new Set())}>
              {G.clearTicks}
            </Button>
          )}
        </Stack>

        {data?.fasting_mode && (
          <Alert severity="info" variant="outlined">
            {G.fastingNote(modeName(data.fasting_mode.mode))}
            {leftOut.length > 0 && ` ${G.leftOut(modeName(data.fasting_mode.mode), leftOut.join(', ').toLowerCase())}`}
          </Alert>
        )}
        {list.isPending && <Skeleton variant="rounded" height={260} />}
        {error && !data && <ErrorState message={error} onRetry={() => list.refetch()} />}
        {empty && (
          <Typography variant="body2" color="text.secondary">
            {G.empty}
          </Typography>
        )}

        {data?.aisles.map((group) => (
          <Box key={group.aisle} component="section" sx={styles.aisle}>
            <Typography variant="overline" sx={styles.aisleTitle}>
              {G.aisles[group.aisle]}
            </Typography>
            {group.aisle === 'ready_made' && (
              <Typography variant="caption" color="text.secondary" component="p">
                {G.readyMadeHint}
              </Typography>
            )}
            <Box component="ul" sx={styles.items}>
              {group.items.map((item) => {
                const done = ticked.has(item.key);
                return (
                  <Box component="li" key={item.key} sx={styles.item(done)}>
                    <Checkbox
                      size="small"
                      checked={done}
                      onChange={() => toggle(item.key)}
                      slotProps={{ input: { 'aria-label': G.tickAria(item.name) } }}
                    />
                    <Box sx={styles.itemText}>
                      <Typography variant="body2" sx={styles.itemName} className="grocery-name">
                        {item.name}
                      </Typography>
                      {item.dishes.length > 0 && (
                        <Typography variant="caption" color="text.secondary" noWrap component="p">
                          {G.usedIn(item.dishes.join(', '))}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" sx={styles.amount}>
                      {amountText(item)}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        ))}

        {data && !empty && (
          <Typography variant="caption" color="text.secondary">
            {G.approxNote}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={styles.actions}>
        <Button color="inherit" onClick={onClose}>
          {G.close}
        </Button>
        <Box sx={styles.spacer} />
        <Button startIcon={<PrintRounded />} onClick={() => data && printGroceryList(data)} disabled={!data || empty}>
          {G.print}
        </Button>
        <Button variant="contained" startIcon={<ContentCopyRounded />} onClick={copy} disabled={!data || empty}>
          {G.copy}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
