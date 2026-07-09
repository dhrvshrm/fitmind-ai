import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { NAV_ITEMS } from '../../constants/navigation';
import { sidebarStyles as styles } from './Sidebar.styles';

type SidebarProps = {
  /** Whether the temporary (mobile) drawer is open. */
  mobileOpen: boolean;
  onClose: () => void;
};

/** Navigation list shared by both drawer variants. */
function NavList({ onNavigate }: { onNavigate: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <List sx={styles.list}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <ListItemButton
            key={item.path}
            selected={pathname.startsWith(item.path)}
            onClick={() => {
              navigate(item.path);
              onNavigate();
            }}
            sx={styles.itemButton}
          >
            <ListItemIcon sx={styles.itemIcon}>
              <Icon />
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        );
      })}
    </List>
  );
}

/**
 * App navigation: permanent drawer on md+ screens, temporary overlay drawer
 * on mobile (toggled from the navbar menu button).
 */
export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      <Drawer variant="permanent" sx={styles.permanentDrawer} open>
        {/* Spacer so the list starts below the fixed navbar. */}
        <Toolbar />
        <NavList onNavigate={() => undefined} />
      </Drawer>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={styles.mobileDrawer}
      >
        <Toolbar />
        <NavList onNavigate={onClose} />
      </Drawer>
    </>
  );
}
