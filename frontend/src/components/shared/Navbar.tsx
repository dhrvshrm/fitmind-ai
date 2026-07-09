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
import { STRINGS } from "../../constants/strings";
import { ROUTES } from "../../constants/routes";
import { UNREAD_NOTIFICATIONS_PLACEHOLDER } from "../../constants/navigation";
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

        {/* Unread count is a placeholder until notifications land (Day 12). */}
        <IconButton aria-label={STRINGS.navbar.notificationsAria}>
          <Badge
            badgeContent={UNREAD_NOTIFICATIONS_PLACEHOLDER}
            color="error"
            overlap="circular"
          >
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
    </AppBar>
  );
}
