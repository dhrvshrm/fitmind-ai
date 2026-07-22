import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Skeleton, Typography } from "@mui/material";
import { MealForm } from "./MealForm";
import { CalorieProgressBar } from "./CalorieProgressBar";
import { MacroPieChart } from "./MacroPieChart";
import { WaterIntakeTracker } from "./WaterIntakeTracker";
import { MealHistory } from "./MealHistory";
import { nutritionService } from "../../services/nutritionService";
import { resolveApiError } from "../../lib/apiClient";
import { STRINGS } from "../../constants/strings";
import type { NutritionSummary } from "../../types/nutrition";
import { nutritionPageStyles as styles } from "./NutritionPage.styles";

const S = STRINGS.nutrition;

export function NutritionPage() {
  const [summary, setSummary] = useState<NutritionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setSummary(await nutritionService.getTodaySummary());
    } catch (err) {
      setError(resolveApiError(err, S.summaryError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred a microtask so the effect body itself schedules no state updates.
    queueMicrotask(() => {
      refresh();
    });
  }, [refresh]);

  /** Water updates return the fresh total directly - patch without a refetch. */
  function handleWaterChange(waterMl: number) {
    setSummary((prev) => (prev ? { ...prev, water_ml: waterMl } : prev));
  }

  return (
    <Box>
      <Typography variant="h5" sx={styles.title}>
        {S.title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {S.subtitle}
      </Typography>

      <Box sx={styles.grid}>
        <MealForm onLogged={refresh} />

        <Box sx={styles.rightColumn}>
          {loading && <Skeleton variant="rounded" sx={styles.skeleton} />}
          {!loading && error && <Alert severity="error">{error}</Alert>}

          {summary && (
            <>
              <CalorieProgressBar
                eaten={summary.totals.calories}
                goal={summary.goals.calories}
                remaining={summary.calories_remaining}
              />
              <Box sx={styles.chartsRow}>
                <MacroPieChart
                  percentages={summary.macro_percentages}
                  totals={summary.totals}
                />
                <WaterIntakeTracker
                  waterMl={summary.water_ml}
                  onChange={handleWaterChange}
                />
              </Box>
              <MealHistory meals={summary.meals} />
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
