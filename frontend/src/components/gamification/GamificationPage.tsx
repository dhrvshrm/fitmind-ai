import { useEffect, useState } from 'react';
import { Box, Skeleton } from '@mui/material';
import toast from 'react-hot-toast';
import { LevelCard } from './LevelCard';
import { StreakDisplay } from './StreakDisplay';
import { BadgeWall } from './BadgeWall';
import { BadgeModal } from './BadgeModal';
import { useBadges, useGamificationProfile } from '../../hooks/queries/useGamificationQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { STRINGS } from '../../constants/strings';
import { formatDateLabel } from '../../utils/date';
import { syncEarnedBadgeDates } from '../../utils/gamification';
import type { Badge } from '../../types/gamification';
import { PageHeader } from '../ui/PageHeader';
import { ErrorState } from '../ui/ErrorState';
import { gamificationPageStyles as styles } from './GamificationPage.styles';

const S = STRINGS.gamification;

type BadgeSyncState = {
  dates: Record<string, string>;
  newlyEarnedIds: ReadonlySet<string>;
};

export function GamificationPage() {
  const profileQuery = useGamificationProfile();
  const badgesQuery = useBadges();
  const profile = profileQuery.data;
  const badges = badgesQuery.data;

  const [badgeSync, setBadgeSync] = useState<BadgeSyncState>({ dates: {}, newlyEarnedIds: new Set() });
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  // Reconcile earned badges with the locally stored earned dates whenever the
  // badge data changes, and announce any badge unlocked since the last visit.
  useEffect(() => {
    if (!badges) return;
    const { dates, newlyEarnedIds: fresh } = syncEarnedBadgeDates(badges.earned.map((badge) => badge.id));
    for (const id of fresh) {
      const badge = badges.earned.find((b) => b.id === id);
      if (badge) toast.success(S.badges.newBadgeToast(badge.name));
    }
    // Deferred a microtask so the effect body itself schedules no state updates.
    queueMicrotask(() => {
      setBadgeSync((prev) => ({ dates, newlyEarnedIds: new Set([...prev.newlyEarnedIds, ...fresh]) }));
    });
  }, [badges]);

  const isPending = profileQuery.isPending || badgesQuery.isPending;
  const error = queryErrorMessage(profileQuery.error ?? badgesQuery.error, S.loadError);

  function retry() {
    profileQuery.refetch();
    badgesQuery.refetch();
  }

  const earnedIds = new Set((badges?.earned ?? []).map((badge) => badge.id));
  const selectedEarned = selectedBadge ? earnedIds.has(selectedBadge.id) : false;
  const selectedEarnedDate =
    selectedBadge && badgeSync.dates[selectedBadge.id] ? formatDateLabel(badgeSync.dates[selectedBadge.id]) : null;

  return (
    <Box>
      <PageHeader title={S.title} subtitle={S.subtitle} />

      {isPending && !error && (
        <>
          <Skeleton variant="rounded" sx={styles.skeletonTop} />
          <Skeleton variant="rounded" sx={styles.skeletonBadges} />
        </>
      )}
      {error && <ErrorState message={error} onRetry={retry} />}

      {profile && (
        <Box sx={styles.topGrid}>
          <LevelCard profile={profile} />
          <StreakDisplay currentStreak={profile.current_streak} longestStreak={profile.longest_streak} />
        </Box>
      )}

      {badges && (
        <Box sx={styles.badgeWallWrap}>
          <BadgeWall
            allBadges={badges.all_badges}
            earnedIds={earnedIds}
            newlyEarnedIds={badgeSync.newlyEarnedIds}
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
