import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Skeleton,
  Typography,
} from "@mui/material";
import {
  AutorenewRounded,
  MenuBookRounded,
  ShoppingBasketRounded,
  TuneRounded,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { STRINGS } from "../../constants/strings";
import { ROUTES } from "../../constants/routes";
import {
  useCreateDietPlan,
  useDietPlan,
} from "../../hooks/queries/useDietPlanQueries";
import { queryErrorMessage } from "../../hooks/queries/queryHelpers";
import { resolveApiError } from "../../lib/apiClient";
import { formatDateLabel } from "../../utils/date";
import { noteText } from "../../utils/mealPlan";
import type { DietPlan } from "../../types/dietPlan";
import { PageHeader } from "../ui/PageHeader";
import { ErrorState } from "../ui/ErrorState";
import { EmptyState } from "../ui/EmptyState";
import { SectionCard } from "../ui/SectionCard";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { INDIA_FIRST_STRINGS } from "../../constants/indiaFirstStrings";
import { useUserProfile } from "../../hooks/queries/useProfileQueries";
import { FastingModesCard } from "./FastingModesCard";
import { GroceryListDialog } from "./GroceryListDialog";
import { ShiftTimesDialog } from "./ShiftTimesDialog";
import { PlanSummary } from "./PlanSummary";
import { DayRoutine } from "./DayRoutine";
import { PlanMealCard } from "./PlanMealCard";
import { mealPlanPageStyles as styles } from "./MealPlanPage.styles";

const S = STRINGS.mealPlan;
const I = INDIA_FIRST_STRINGS.plan;

/** Plan notes as one list; medical advice stands apart as a warning. */
function PlanNotes({ plan }: { plan: DietPlan }) {
  const medical = plan.notes.filter((note) => note.code === "medical_advice");
  const info = plan.notes.filter((note) => note.code !== "medical_advice");
  return (
    <>
      {medical.map((note) => (
        <Alert key={note.code} severity="warning" variant="outlined">
          {noteText(note, plan.fasting_mode?.mode)}
        </Alert>
      ))}
      {info.length > 0 && (
        <Alert severity="info" variant="outlined">
          <Box component="ul" sx={styles.notes}>
            {info.map((note) => (
              <li key={note.code}>{noteText(note, plan.fasting_mode?.mode)}</li>
            ))}
          </Box>
        </Alert>
      )}
    </>
  );
}

/** A day of meals fitted to the user's targets, with swaps, new options and one-tap logging. */
export function MealPlanPage() {
  const navigate = useNavigate();
  const planQuery = useDietPlan();
  const create = useCreateDietPlan();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [groceryOpen, setGroceryOpen] = useState(false);
  const [timesOpen, setTimesOpen] = useState(false);
  const profile = useUserProfile();
  const lifestyle = profile.data?.lifestyle;
  const plan = planQuery.data;
  const shiftNote =
    plan?.shift_aware && lifestyle?.wake_time && lifestyle.sleep_time
      ? I.shiftAware(lifestyle.wake_time, lifestyle.sleep_time)
      : undefined;
  const error = queryErrorMessage(planQuery.error, S.loadError);

  async function handleCreate() {
    setConfirmOpen(false);
    try {
      await create.mutateAsync();
      toast.success(S.created);
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  const editPreferences = (
    <Button
      color="inherit"
      startIcon={<TuneRounded />}
      onClick={() => navigate(`${ROUTES.ONBOARDING}?mode=update`)}
    >
      {S.editPreferences}
    </Button>
  );
  const createIcon = create.isPending ? (
    <CircularProgress size={18} color="inherit" />
  ) : (
    <AutorenewRounded />
  );

  return (
    <Box>
      <PageHeader
        title={S.title}
        subtitle={S.subtitle}
        actions={
          plan && (
            <>
              {editPreferences}
              <Button
                color="inherit"
                startIcon={<ShoppingBasketRounded />}
                onClick={() => setGroceryOpen(true)}
              >
                {I.groceryList}
              </Button>
              <Button
                variant="outlined"
                startIcon={createIcon}
                onClick={() => setConfirmOpen(true)}
                disabled={create.isPending}
              >
                {create.isPending ? S.creating : S.regenerate}
              </Button>
            </>
          )
        }
      />

      {planQuery.isPending && (
        <Box sx={styles.grid}>
          <Skeleton variant="rounded" sx={styles.skeleton} />
          <Skeleton variant="rounded" sx={styles.skeleton} />
        </Box>
      )}
      {error && (
        <ErrorState message={error} onRetry={() => planQuery.refetch()} />
      )}

      {planQuery.isSuccess && !plan && (
        <SectionCard>
          <EmptyState
            icon={MenuBookRounded}
            title={S.empty.title}
            description={S.empty.description}
            action={
              <Box sx={styles.emptyActions}>
                {editPreferences}
                <Button
                  variant="contained"
                  onClick={handleCreate}
                  disabled={create.isPending}
                  startIcon={
                    create.isPending ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : null
                  }
                >
                  {create.isPending ? S.creating : S.create}
                </Button>
              </Box>
            }
          />
        </SectionCard>
      )}
      {planQuery.isSuccess && !plan && (
        <Box sx={styles.section}>
          <FastingModesCard />
        </Box>
      )}

      {plan && (
        <Box sx={styles.layout}>
          {plan.stale && (
            <Alert
              severity="warning"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setConfirmOpen(true)}
                  disabled={create.isPending}
                >
                  {S.regenerate}
                </Button>
              }
            >
              {S.stale}
            </Alert>
          )}
          {plan.mode_changed && (
            <Alert
              severity="warning"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setConfirmOpen(true)}
                  disabled={create.isPending}
                >
                  {S.regenerate}
                </Button>
              }
            >
              {I.modeChanged}
            </Alert>
          )}
          <PlanSummary plan={plan} />
          <PlanNotes plan={plan} />
          <FastingModesCard />
          <DayRoutine
            plan={plan}
            onEditTimes={() => setTimesOpen(true)}
            note={shiftNote}
            renderMeal={(meal) => (
              <PlanMealCard
                key={`${plan.id}-${meal.id}`}
                meal={meal}
                logged={plan.logged_today.includes(meal.id)}
                locked={create.isPending}
              />
            )}
          />
          <Box sx={styles.footer}>
            <Typography variant="caption" color="text.secondary">
              {S.version(
                plan.version,
                formatDateLabel(plan.created_at.slice(0, 10)),
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {S.disclaimer}
            </Typography>
          </Box>
        </Box>
      )}

      {groceryOpen && <GroceryListDialog onClose={() => setGroceryOpen(false)} />}
      {timesOpen && <ShiftTimesDialog lifestyle={lifestyle} onClose={() => setTimesOpen(false)} />}

      <ConfirmDialog
        open={confirmOpen}
        title={S.regenerateTitle}
        description={S.regenerateBody}
        confirmLabel={S.regenerateConfirm}
        onConfirm={handleCreate}
        onClose={() => setConfirmOpen(false)}
      />
    </Box>
  );
}
