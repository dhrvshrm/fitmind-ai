import { Avatar, Box, Button, Chip, Skeleton, Stack, Typography } from "@mui/material";
import { EmojiEventsRounded } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useGamificationProfile } from "../../hooks/queries/useGamificationQueries";
import { useSettingsProfile } from "../../hooks/queries/useProfileQueries";
import { queryErrorMessage } from "../../hooks/queries/queryHelpers";
import { STRINGS } from "../../constants/strings";
import { ROUTES } from "../../constants/routes";
import { GOAL_OPTIONS } from "../../constants/onboarding";
import { displayName, initialOf } from "../../utils/user";
import { PageHeader } from "../ui/PageHeader";
import { SectionCard } from "../ui/SectionCard";
import { ErrorState } from "../ui/ErrorState";
import { EditProfileForm } from "./EditProfileForm";
import { PersonalisationCard } from "./PersonalisationCard";
import { profilePageStyles as styles } from "./ProfilePage.styles";

const S = STRINGS.profile;

/**
 * The person: who they are, their goal, their daily targets and details.
 * Levels, streaks and badges live on the Achievements page.
 */
export function ProfilePage() {
  const navigate = useNavigate();
  const profileQuery = useSettingsProfile();
  const gamificationQuery = useGamificationProfile();
  const profile = profileQuery.data;
  const gamification = gamificationQuery.data;
  const error = queryErrorMessage(profileQuery.error, S.loadError);

  if (error) {
    return (
      <Box sx={styles.root}>
        <PageHeader title={S.title} subtitle={S.subtitle} />
        <ErrorState message={error} onRetry={() => profileQuery.refetch()} />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={styles.root}>
        <PageHeader title={S.title} subtitle={S.subtitle} />
        <Skeleton variant="rounded" sx={styles.heroSkeleton} />
        <Skeleton variant="rounded" sx={styles.skeleton} />
      </Box>
    );
  }

  const goal = GOAL_OPTIONS.find((option) => option.value === profile.fitness_goal);
  const GoalIcon = goal?.icon;

  return (
    <Box sx={styles.root}>
      <PageHeader title={S.title} subtitle={S.subtitle} />

      <SectionCard>
        <Stack sx={styles.heroRow}>
          <Avatar sx={styles.avatar}>{initialOf(profile)}</Avatar>
          <Box sx={styles.heroText}>
            <Typography variant="h5" component="p" sx={styles.name}>
              {displayName(profile)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={styles.handle}>
              {S.handle(profile.username, profile.email)}
            </Typography>
            <Stack sx={styles.chips}>
              {goal && (
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  icon={GoalIcon ? <GoalIcon /> : undefined}
                  label={goal.label}
                />
              )}
              {gamification && (
                <Chip size="small" variant="outlined" label={S.level.label(gamification.level, gamification.title)} />
              )}
            </Stack>
          </Box>
          <Button
            variant="outlined"
            startIcon={<EmojiEventsRounded />}
            onClick={() => navigate(ROUTES.GAMIFICATION)}
            sx={styles.achievements}
          >
            {S.viewAchievements}
          </Button>
        </Stack>
      </SectionCard>

      <PersonalisationCard />
      <EditProfileForm profile={profile} />
    </Box>
  );
}
