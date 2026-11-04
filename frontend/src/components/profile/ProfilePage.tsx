import type { ComponentType } from "react";
import {
  Avatar,
  Box,
  Chip,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
  type SvgIconProps,
} from "@mui/material";
import {
  BedtimeRounded,
  BoltRounded,
  EmojiEventsRounded,
  LocalFireDepartmentRounded,
  MicRounded,
  MilitaryTechRounded,
  RestaurantRounded,
  TrendingUpRounded,
  WaterDropRounded,
  WorkspacePremiumRounded,
} from "@mui/icons-material";
import { useBadges, useGamificationProfile } from "../../hooks/queries/useGamificationQueries";
import { useSettingsProfile } from "../../hooks/queries/useProfileQueries";
import { queryErrorMessage } from "../../hooks/queries/queryHelpers";
import { STRINGS } from "../../constants/strings";
import type { GamificationProfile } from "../../types/gamification";
import { PageHeader } from "../ui/PageHeader";
import { SectionCard } from "../ui/SectionCard";
import { StatTile } from "../ui/StatTile";
import { ErrorState } from "../ui/ErrorState";
import { EmptyState } from "../ui/EmptyState";
import { IconBadge } from "../ui/IconBadge";
import type { IconBadgeTone } from "../ui/IconBadge.styles";
import { EditProfileForm } from "./EditProfileForm";
import { profilePageStyles as styles } from "./ProfilePage.styles";

const S = STRINGS.profile;

/** Material icon per badge id (falls back to a premium medal for unknown ids). */
const BADGE_ICONS: Record<string, ComponentType<SvgIconProps>> = {
  seven_day_warrior: LocalFireDepartmentRounded,
  recovery_king: BedtimeRounded,
  clean_eater: RestaurantRounded,
  voice_native: MicRounded,
  century_club: MilitaryTechRounded,
  hydration_hero: WaterDropRounded,
};

type StatConfig = {
  label: string;
  value: (profile: GamificationProfile) => number;
  icon: ComponentType<SvgIconProps>;
  tone: IconBadgeTone;
};

const STATS: StatConfig[] = [
  { label: S.stats.totalXp, value: (p) => p.xp, icon: BoltRounded, tone: "primary" },
  { label: S.stats.currentStreak, value: (p) => p.current_streak, icon: LocalFireDepartmentRounded, tone: "warning" },
  { label: S.stats.longestStreak, value: (p) => p.longest_streak, icon: TrendingUpRounded, tone: "secondary" },
  { label: S.stats.badges, value: (p) => p.badge_count, icon: EmojiEventsRounded, tone: "success" },
];

function xpBarValue(profile: GamificationProfile): number {
  const total = profile.xp_into_level + profile.xp_to_next;
  if (total <= 0) return 100;
  return Math.min(100, (profile.xp_into_level / total) * 100);
}

/** Profile overview: avatar, level + XP bar, stats, badge wall, edit form. */
export function ProfilePage() {
  const gamificationQuery = useGamificationProfile();
  const badgesQuery = useBadges();
  const profileQuery = useSettingsProfile();

  const gamification = gamificationQuery.data;
  const badges = badgesQuery.data;
  const profile = profileQuery.data;

  const failed = [gamificationQuery, badgesQuery, profileQuery].filter((q) => q.isError);
  const error = queryErrorMessage(failed[0]?.error, S.loadError);
  const retry = () => failed.forEach((q) => q.refetch());

  if (error) {
    return (
      <Box sx={styles.root}>
        <PageHeader title={S.title} subtitle={S.subtitle} />
        <ErrorState message={error} onRetry={retry} />
      </Box>
    );
  }

  if (!gamification || !badges || !profile) {
    return (
      <Box sx={styles.root}>
        <PageHeader title={S.title} subtitle={S.subtitle} />
        <Skeleton variant="rounded" sx={styles.skeleton} />
        <Box sx={styles.statsGrid}>
          {STATS.map((stat) => (
            <Skeleton key={stat.label} variant="rounded" sx={styles.statSkeleton} />
          ))}
        </Box>
        <Skeleton variant="rounded" sx={styles.skeleton} />
      </Box>
    );
  }

  const initial = (profile.username?.[0] ?? "?").toUpperCase();
  const earnedIds = new Set(badges.earned.map((b) => b.id));

  return (
    <Box sx={styles.root}>
      <PageHeader title={S.title} subtitle={S.subtitle} />

      {/* Identity: avatar, level, XP bar */}
      <SectionCard>
        <Stack sx={styles.heroRow}>
          <Avatar sx={styles.avatar}>{initial}</Avatar>
          <Box sx={styles.heroText}>
            <Typography variant="h5" component="p" sx={styles.username}>
              {profile.username}
            </Typography>
            <Chip
              color="primary"
              variant="outlined"
              size="small"
              label={S.level.label(gamification.level, gamification.title)}
              sx={styles.levelChip}
            />
          </Box>
        </Stack>

        <Box sx={styles.xpSection}>
          <LinearProgress
            variant="determinate"
            value={xpBarValue(gamification)}
            aria-label={S.level.xpBarAria}
          />
          <Box sx={styles.xpMeta}>
            <Typography variant="caption" color="text.secondary">
              {S.level.progress(gamification.xp_into_level, gamification.xp_to_next)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {gamification.next_title
                ? S.level.toNext(gamification.xp_to_next, gamification.next_title)
                : S.level.maxed}
            </Typography>
          </Box>
        </Box>
      </SectionCard>

      {/* Stats summary */}
      <Box sx={styles.statsGrid}>
        {STATS.map((stat) => (
          <StatTile
            key={stat.label}
            label={stat.label}
            value={stat.value(gamification)}
            icon={stat.icon}
            tone={stat.tone}
          />
        ))}
      </Box>

      {/* Badge wall */}
      <SectionCard
        title={S.badges.title}
        action={
          <Typography variant="body2" color="text.secondary">
            {S.badges.earnedCount(earnedIds.size)}
          </Typography>
        }
      >
        {badges.all_badges.length === 0 ? (
          <EmptyState
            compact
            icon={WorkspacePremiumRounded}
            title={S.badges.emptyTitle}
            description={S.badges.empty}
          />
        ) : (
          <Box sx={styles.badgeGrid}>
            {badges.all_badges.map((badge) => {
              const earned = earnedIds.has(badge.id);
              return (
                <Box key={badge.id} sx={styles.badge(earned)}>
                  <IconBadge
                    icon={BADGE_ICONS[badge.id] ?? WorkspacePremiumRounded}
                    tone={earned ? "primary" : "neutral"}
                  />
                  <Typography variant="body2" sx={styles.badgeName}>
                    {badge.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {badge.description}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </SectionCard>

      {/* Edit form */}
      <EditProfileForm profile={profile} />
    </Box>
  );
}
