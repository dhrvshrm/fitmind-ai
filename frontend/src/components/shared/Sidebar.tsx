import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Toolbar,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { NAV_GROUPS } from '../../constants/navigation';
import { sidebarStyles as styles } from './Sidebar.styles';

type SidebarProps = {
  /** Whether the temporary (mobile) drawer is open. */
  mobileOpen: boolean;
  onClose: () => void;
};

/** Grouped navigation shared by both drawer variants. */
function NavList({ onNavigate }: { onNavigate: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav>
      {NAV_GROUPS.map((group) => (
        <List
          key={group.label}
          dense
          sx={styles.list}
          subheader={<ListSubheader sx={styles.groupLabel}>{group.label}</ListSubheader>}
        >
          {group.items.map((item) => {
            const Icon = item.icon;
            const selected = pathname.startsWith(item.path);
            return (
              <ListItemButton
                key={item.path}
                selected={selected}
                aria-current={selected ? 'page' : undefined}
                onClick={() => {
                  navigate(item.path);
                  onNavigate();
                }}
                sx={styles.itemButton}
              >
                <ListItemIcon sx={styles.itemIcon}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            );
          })}
        </List>
      ))}
    </nav>
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
