import { initialOf } from '../../utils/user';
import { useState, type MouseEvent } from "react";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  IconButton,
  Link,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  LogoutRounded,
  MenuRounded,
  NotificationsRounded,
  PersonRounded,
  SettingsRounded,
} from "@mui/icons-material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";
import { useNutritionToday } from "../../hooks/queries/useNutritionQueries";
import { useUiStore } from "../../store/uiStore";
import { STRINGS } from "../../constants/strings";
import { ROUTES } from "../../constants/routes";
import { getNotificationRoute } from "../../constants/notification";
import { Wordmark } from "../ui/Wordmark";
import { NotificationDrawer } from "./NotificationDrawer";
import { ColorModeMenu } from "./ColorModeMenu";
import type { AppNotification } from "../../types/notification";
import { navbarStyles as styles } from "./Navbar.styles";

type NavbarProps = {
  /** Opens the mobile sidebar drawer. */
  onMenuClick: () => void;
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" };

/**
 * Top app bar, like the header of today's diary page: the wordmark, today's
 * date in the middle, and the controls gathered in one pill. A thin ink line
 * along the bottom fills with the calories eaten so far today.
 */
export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Today already shows the date in its own header.
  const showDate = useLocation().pathname !== ROUTES.TODAY;
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const nutrition = useNutritionToday();

  // Loads notifications on mount and keeps them live over the WS channel;
  // called once here since Navbar is mounted for the whole authenticated app.
  const { markAllAsRead, markAsRead } = useNotifications();
  const notificationCount = useUiStore((s) => s.notificationCount);

  const initial = initialOf(user);
  const today = new Date().toLocaleDateString(undefined, DATE_FORMAT);
  const eaten = Math.round(nutrition.data?.totals.calories ?? 0);
  const goal = Math.round(nutrition.data?.goals.calories ?? 0);
  const inkPercent = goal > 0 ? Math.min(100, (eaten / goal) * 100) : 0;

  function handleOpenMenu(event: MouseEvent<HTMLElement>) {
    setMenuAnchor(event.currentTarget);
  }

  function handleLogout() {
    setMenuAnchor(null);
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  function handleNavigate(path: string) {
    setMenuAnchor(null);
    navigate(path);
  }

  /** Clicking a notification marks it read, closes the drawer, and takes the user to it. */
  function handleNotificationClick(notification: AppNotification) {
    markAsRead(notification.id);
    setNotifOpen(false);
    navigate(getNotificationRoute(notification.type));
  }

  return (
    <AppBar position="fixed" elevation={0} sx={styles.appBar}>
      <Toolbar sx={styles.toolbar}>
        <IconButton
          aria-label={STRINGS.navbar.openMenuAria}
          onClick={onMenuClick}
          sx={styles.menuButton}
        >
          <MenuRounded />
        </IconButton>

        <Link component={RouterLink} to={ROUTES.TODAY} underline="none" color="inherit" sx={styles.brandLink}>
          <Wordmark size={32} />
        </Link>

        <Typography component="p" sx={styles.date}>
          {showDate ? today : null}
        </Typography>

        <Stack sx={styles.actions}>
          <ColorModeMenu />

          <IconButton
            aria-label={STRINGS.navbar.notificationsAria}
            onClick={() => setNotifOpen(true)}
            sx={styles.actionButton}
          >
            <Badge badgeContent={notificationCount} color="secondary" overlap="circular" sx={styles.badge}>
              <NotificationsRounded />
            </Badge>
          </IconButton>

          <IconButton
            aria-label={STRINGS.navbar.accountAria}
            onClick={handleOpenMenu}
            sx={styles.avatarButton}
          >
            <Avatar sx={styles.avatar}>{initial}</Avatar>
          </IconButton>
        </Stack>

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <Box sx={styles.menuHeader}>
            <Typography variant="caption" color="text.secondary">
              {STRINGS.navbar.signedInAs}
            </Typography>
            <Typography variant="body2">{user?.email}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => handleNavigate(ROUTES.PROFILE)}>
            <ListItemIcon>
              <PersonRounded fontSize="small" />
            </ListItemIcon>
            {STRINGS.nav.profile}
          </MenuItem>
          <MenuItem onClick={() => handleNavigate(ROUTES.SETTINGS)}>
            <ListItemIcon>
              <SettingsRounded fontSize="small" />
            </ListItemIcon>
            {STRINGS.nav.settings}
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutRounded fontSize="small" />
            </ListItemIcon>
            {STRINGS.navbar.logout}
          </MenuItem>
        </Menu>
      </Toolbar>

      {/* The day's ink line: how much of today's calorie target is eaten. */}
      {goal > 0 && (
        <Tooltip title={STRINGS.navbar.inkLine(eaten, goal)} placement="bottom-start">
          <Box
            role="progressbar"
            aria-label={STRINGS.navbar.inkLineAria}
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={eaten}
            sx={styles.inkTrack}
          >
            <Box sx={styles.inkFill(inkPercent)} />
          </Box>
        </Tooltip>
      )}

      <NotificationDrawer
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        onItemClick={handleNotificationClick}
        onMarkAllRead={markAllAsRead}
      />
    </AppBar>
  );
}
