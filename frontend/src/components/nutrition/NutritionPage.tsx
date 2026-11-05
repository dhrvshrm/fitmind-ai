import { Box, Skeleton } from "@mui/material";
import { QuickLog } from "./QuickLog";
import { QuickPicks } from "./QuickPicks";
import { MyFoods } from "./MyFoods";
import { CalorieProgressBar } from "./CalorieProgressBar";
import { MacroPieChart } from "./MacroPieChart";
import { WaterIntakeTracker } from "./WaterIntakeTracker";
import { MealHistory } from "./MealHistory";
import { useNutritionToday } from "../../hooks/queries/useNutritionQueries";
import { queryErrorMessage } from "../../hooks/queries/queryHelpers";
import { STRINGS } from "../../constants/strings";
import { PageHeader } from "../ui/PageHeader";
import { ErrorState } from "../ui/ErrorState";
import { nutritionPageStyles as styles } from "./NutritionPage.styles";

const S = STRINGS.nutrition;

export function NutritionPage() {
  const today = useNutritionToday();
  const summary = today.data;
  const error = queryErrorMessage(today.error, S.summaryError);

  return (
    <Box>
      <PageHeader title={S.title} subtitle={S.subtitle} />

      <Box sx={styles.grid}>
        <Box sx={styles.leftColumn}>
          <QuickLog />
          <QuickPicks />
          <MyFoods />
        </Box>

        <Box sx={styles.rightColumn}>
          {today.isPending && (
            <>
              <Skeleton variant="rounded" sx={styles.skeletonTall} />
              <Skeleton variant="rounded" sx={styles.skeleton} />
            </>
          )}
          {error && <ErrorState message={error} onRetry={() => today.refetch()} />}

          {summary && (
            <>
              <CalorieProgressBar
                totals={summary.totals}
                goals={summary.goals}
                remaining={summary.calories_remaining}
                targets={summary.targets}
              />
              <Box sx={styles.chartsRow}>
                <MacroPieChart percentages={summary.macro_percentages} totals={summary.totals} />
                <WaterIntakeTracker waterMl={summary.water_ml} goalMl={summary.water_goal_ml} />
              </Box>
              <MealHistory meals={summary.meals} />
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
