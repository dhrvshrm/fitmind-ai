import { useEffect, useState, type ComponentType } from "react";
import {
  Alert,
  Avatar,
  Box,
  Chip,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
  type SvgIconProps,
} from "@mui/material";
import {
  BedtimeRounded,
  LocalFireDepartmentRounded,
  MicRounded,
  MilitaryTechRounded,
  RestaurantRounded,
  WaterDropRounded,
  WorkspacePremiumRounded,
} from "@mui/icons-material";
import { gamificationService } from "../../services/gamificationService";
import { settingsService } from "../../services/settingsService";
import { resolveApiError } from "../../lib/apiClient";
import { STRINGS } from "../../constants/strings";
import type {
  BadgesResponse,
  GamificationProfile,
} from "../../types/gamification";
import type { FullUserProfile } from "../../types/settings";
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

function xpBarValue(profile: GamificationProfile): number {
  const total = profile.xp_into_level + profile.xp_to_next;
  if (total <= 0) return 100;
  return Math.min(100, (profile.xp_into_level / total) * 100);
}

/** Profile overview: avatar, level + XP bar, stats, badge wall, edit form. */
export function ProfilePage() {
  const [gamification, setGamification] = useState<GamificationProfile | null>(
    null,
  );
  const [badges, setBadges] = useState<BadgesResponse | null>(null);
  const [profile, setProfile] = useState<FullUserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      gamificationService.getProfile(),
      gamificationService.getBadges(),
      settingsService.getProfile(),
    ])
      .then(([g, b, p]) => {
        if (!active) return;
        setGamification(g);
        setBadges(b);
        setProfile(p);
      })
      .catch((err: unknown) => {
        if (active) setError(resolveApiError(err, S.loadError));
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!gamification || !badges || !profile) {
    return (
      <Box sx={styles.root}>
        <Skeleton variant="rounded" sx={styles.skeleton} />
        <Skeleton variant="rounded" sx={styles.skeleton} />
      </Box>
    );
  }

  const initial = (profile.username?.[0] ?? "?").toUpperCase();
  const earnedIds = new Set(badges.earned.map((b) => b.id));

  return (
    <Box sx={styles.root}>
      <Box>
        <Typography variant="h4" sx={styles.header}>
          {S.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={styles.subtitle}>
          {S.subtitle}
        </Typography>
      </Box>

      {/* Hero: avatar, level, XP bar */}
      <Paper elevation={0} variant="outlined" sx={styles.heroCard}>
        <Stack sx={styles.heroRow}>
          <Avatar sx={styles.avatar}>{initial}</Avatar>
          <Box>
            <Typography variant="h5" sx={styles.username}>
              {profile.username}
            </Typography>
            <Chip
              color="primary"
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
            sx={styles.xpBar}
          />
          <Box sx={styles.xpMeta}>
            <Typography variant="caption" color="text.secondary">
              {S.level.progress(
                gamification.xp_into_level,
                gamification.xp_to_next,
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {gamification.next_title
                ? S.level.toNext(
                    gamification.xp_to_next,
                    gamification.next_title,
                  )
                : S.level.maxed}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Stats summary */}
      <Box sx={styles.statsGrid}>
        <Paper elevation={0} variant="outlined" sx={styles.statCard}>
          <Typography variant="h5" sx={styles.statValue}>
            {gamification.xp}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {S.stats.totalXp}
          </Typography>
        </Paper>
        <Paper elevation={0} variant="outlined" sx={styles.statCard}>
          <Typography variant="h5" sx={styles.statValue}>
            {gamification.current_streak}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {S.stats.currentStreak}
          </Typography>
        </Paper>
        <Paper elevation={0} variant="outlined" sx={styles.statCard}>
          <Typography variant="h5" sx={styles.statValue}>
            {gamification.longest_streak}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {S.stats.longestStreak}
          </Typography>
        </Paper>
        <Paper elevation={0} variant="outlined" sx={styles.statCard}>
          <Typography variant="h5" sx={styles.statValue}>
            {gamification.badge_count}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {S.stats.badges}
          </Typography>
        </Paper>
      </Box>

      {/* Badge wall */}
      <Box>
        <Typography variant="h6" sx={styles.sectionTitle}>
          {S.badges.title}
        </Typography>
        <Box sx={styles.badgeGrid}>
          {badges.all_badges.map((badge) => {
            const earned = earnedIds.has(badge.id);
            return (
              <Paper
                key={badge.id}
                elevation={0}
                variant="outlined"
                sx={{ ...styles.badge, ...(earned ? {} : styles.badgeLocked) }}
              >
                {(() => {
                  const BadgeIcon = BADGE_ICONS[badge.id] ?? WorkspacePremiumRounded;
                  return <BadgeIcon sx={styles.badgeIcon} color="primary" />;
                })()}
                <Typography variant="body2" sx={styles.badgeName}>
                  {badge.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {badge.description}
                </Typography>
              </Paper>
            );
          })}
        </Box>
      </Box>

      {/* Edit form */}
      <EditProfileForm profile={profile} onSaved={setProfile} />
    </Box>
  );
}
