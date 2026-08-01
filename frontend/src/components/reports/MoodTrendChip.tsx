import { Chip } from "@mui/material";
import { TrendingDownRounded, TrendingFlatRounded, TrendingUpRounded } from "@mui/icons-material";
import { STRINGS } from "../../constants/strings";

const S = STRINGS.reports.trends.mood;

type MoodTrendChipProps = {
  trend: string;
};

/**
 * Mood-trend chip. Written as a literal switch (rather than picking an icon
 * out of a lookup map) because the React Compiler lint rule flags rendering
 * a locally-resolved component reference — only statically-known JSX tags
 * are allowed here.
 */
export function MoodTrendChip({ trend }: MoodTrendChipProps) {
  switch (trend) {
    case "improving":
      return <Chip size="small" color="success" icon={<TrendingUpRounded />} label={S.improving} />;
    case "declining":
      return <Chip size="small" color="error" icon={<TrendingDownRounded />} label={S.declining} />;
    default:
      return <Chip size="small" icon={<TrendingFlatRounded />} label={S.stable} />;
  }
}
