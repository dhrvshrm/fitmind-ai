import { Chip } from "@mui/material";
import {
  HelpOutlineRounded,
  SentimentDissatisfiedRounded,
  SentimentNeutralRounded,
  SentimentSatisfiedRounded,
  SentimentVerySatisfiedRounded,
} from "@mui/icons-material";
import { STRINGS } from "../../constants/strings";

const S = STRINGS.reports.trends.recovery;

type RecoveryTrendChipProps = {
  trend: string;
};

/**
 * Recovery-trend chip. Written as a literal switch (rather than picking an
 * icon out of a lookup map) because the React Compiler lint rule flags
 * rendering a locally-resolved component reference — only statically-known
 * JSX tags are allowed here.
 */
export function RecoveryTrendChip({ trend }: RecoveryTrendChipProps) {
  switch (trend) {
    case "excellent":
      return (
        <Chip
          size="small"
          color="success"
          icon={<SentimentVerySatisfiedRounded />}
          label={S.excellent}
        />
      );
    case "good":
      return (
        <Chip
          size="small"
          color="info"
          icon={<SentimentSatisfiedRounded />}
          label={S.good}
        />
      );
    case "moderate":
      return (
        <Chip
          size="small"
          color="warning"
          icon={<SentimentNeutralRounded />}
          label={S.moderate}
        />
      );
    case "low":
      return (
        <Chip
          size="small"
          color="error"
          icon={<SentimentDissatisfiedRounded />}
          label={S.low}
        />
      );
    default:
      return (
        <Chip size="small" icon={<HelpOutlineRounded />} label={S["no data"]} />
      );
  }
}
