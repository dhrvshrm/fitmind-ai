import { useState, type MouseEvent } from "react";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  FitnessCenterRounded,
  LogoutRounded,
  MenuRounded,
  NotificationsRounded,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";
import { useUiStore } from "../../store/uiStore";
import { STRINGS } from "../../constants/strings";
import { ROUTES } from "../../constants/routes";
import { NotificationDrawer } from "./NotificationDrawer";
import { navbarStyles as styles } from "./Navbar.styles";

type NavbarProps = {
  /** Opens the mobile sidebar drawer. */
  onMenuClick: () => void;
};

/** Top app bar: mobile menu toggle, brand, notification bell, account menu. */
export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);

  // Loads notifications on mount and keeps them live over the WS channel;
  // called once here since Navbar is mounted for the whole authenticated app.
  const { markAllAsRead, markAsRead } = useNotifications();
  const notificationCount = useUiStore((s) => s.notificationCount);

  const initial = (user?.email?.[0] ?? "?").toUpperCase();

  function handleOpenMenu(event: MouseEvent<HTMLElement>) {
    setMenuAnchor(event.currentTarget);
  }

  function handleLogout() {
    setMenuAnchor(null);
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  return (
    <AppBar position="fixed" elevation={0} sx={styles.appBar}>
      <Toolbar>
        <IconButton
          aria-label={STRINGS.navbar.openMenuAria}
          onClick={onMenuClick}
          sx={styles.menuButton}
        >
          <MenuRounded />
        </IconButton>

        <Stack sx={styles.brandRow}>
          <FitnessCenterRounded sx={styles.brandIcon} />
          <Typography variant="h6" sx={styles.brandName}>
            {STRINGS.app.name}
          </Typography>
        </Stack>

        <Box sx={styles.spacer} />

        <IconButton
          aria-label={STRINGS.navbar.notificationsAria}
          onClick={() => setNotifOpen(true)}
        >
          <Badge badgeContent={notificationCount} color="error" overlap="circular">
            <NotificationsRounded />
          </Badge>
        </IconButton>

        <IconButton
          aria-label={STRINGS.navbar.accountAria}
          onClick={handleOpenMenu}
        >
          <Avatar sx={styles.avatar}>{initial}</Avatar>
        </IconButton>

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
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutRounded fontSize="small" />
            </ListItemIcon>
            {STRINGS.navbar.logout}
          </MenuItem>
        </Menu>
      </Toolbar>

      <NotificationDrawer
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        onItemClick={(notification) => markAsRead(notification.id)}
        onMarkAllRead={markAllAsRead}
      />
    </AppBar>
  );
}
