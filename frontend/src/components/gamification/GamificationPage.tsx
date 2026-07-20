import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Skeleton, Typography } from '@mui/material';
import toast from 'react-hot-toast';
import { LevelCard } from './LevelCard';
import { StreakDisplay } from './StreakDisplay';
import { BadgeWall } from './BadgeWall';
import { BadgeModal } from './BadgeModal';
import { gamificationService } from '../../services/gamificationService';
import { resolveApiError } from '../../lib/apiClient';
import { STRINGS } from '../../constants/strings';
import { formatDateLabel } from '../../utils/date';
import { syncEarnedBadgeDates } from '../../utils/gamification';
import type { Badge, BadgesResponse, GamificationProfile } from '../../types/gamification';
import { gamificationPageStyles as styles } from './GamificationPage.styles';

const S = STRINGS.gamification;

export function GamificationPage() {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [badges, setBadges] = useState<BadgesResponse | null>(null);
  const [earnedDates, setEarnedDates] = useState<Record<string, string>>({});
  const [newlyEarnedIds, setNewlyEarnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [profileResult, badgesResult] = await Promise.all([
        gamificationService.getProfile(),
        gamificationService.getBadges(),
      ]);
      setProfile(profileResult);
      setBadges(badgesResult);

      const { dates, newlyEarnedIds: fresh } = syncEarnedBadgeDates(
        badgesResult.earned.map((badge) => badge.id),
      );
      setEarnedDates(dates);
      setNewlyEarnedIds(new Set(fresh));

      for (const id of fresh) {
        const badge = badgesResult.earned.find((b) => b.id === id);
        if (badge) toast.success(S.badges.newBadgeToast(badge.name));
      }
    } catch (err) {
      setError(resolveApiError(err, S.loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred a microtask so the effect body itself schedules no state updates.
    queueMicrotask(() => {
      load();
    });
  }, [load]);

  const earnedIds = new Set((badges?.earned ?? []).map((badge) => badge.id));
  const selectedEarned = selectedBadge ? earnedIds.has(selectedBadge.id) : false;
  const selectedEarnedDate = selectedBadge && earnedDates[selectedBadge.id]
    ? formatDateLabel(earnedDates[selectedBadge.id])
    : null;

  return (
    <Box>
      <Typography variant="h5" sx={styles.title}>
        {S.title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {S.subtitle}
      </Typography>

      {loading && <Skeleton variant="rounded" sx={styles.skeleton} />}
      {!loading && error && (
        <Alert severity="error" sx={styles.errorAlert}>
          {error}
        </Alert>
      )}

      {profile && (
        <Box sx={styles.topGrid}>
          <LevelCard profile={profile} />
          <StreakDisplay
            currentStreak={profile.current_streak}
            longestStreak={profile.longest_streak}
          />
        </Box>
      )}

      {badges && (
        <Box sx={styles.badgeWallWrap}>
          <BadgeWall
            allBadges={badges.all_badges}
            earnedIds={earnedIds}
            newlyEarnedIds={newlyEarnedIds}
            onSelect={setSelectedBadge}
          />
        </Box>
      )}

      <BadgeModal
        badge={selectedBadge}
        earned={selectedEarned}
        earnedDateLabel={selectedEarnedDate}
        onClose={() => setSelectedBadge(null)}
      />
    </Box>
  );
}
