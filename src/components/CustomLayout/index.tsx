// CustomLayout.tsx — Responsive, aligned shell (AppBar + Sidebar + Content)
import * as React from 'react';
import { Layout, AppBar, Logout, TitlePortal, LayoutProps, useGetIdentity } from 'react-admin';
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Stack,
  useMediaQuery,
  Theme,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Person as PersonIcon,
  AccountCircle as AccountCircleIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

/** Single source of truth: AppBar height at each breakpoint */
const APPBAR_HEIGHT_XS = 56;
const APPBAR_HEIGHT_SM = 64;

const CustomAppBar = () => {
  const navigate = useNavigate();
  const isSmall = useMediaQuery((t: Theme) => t.breakpoints.down('sm'));
  const { data: identity } = useGetIdentity();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const doctorId = identity?.linkedDoctorId || localStorage.getItem('linkedDoctorId');
  const userName = identity?.fullName || identity?.name || 'User';
  const userEmail = identity?.email || '';

  const goProfile = () => {
    if (doctorId && doctorId !== 'null') {
      navigate(`/doctors/${doctorId}/profile`);
      setAnchorEl(null);
    }
  };

  return (
    <AppBar
      sx={(theme) => ({
        position: 'fixed',
        zIndex: theme.zIndex.drawer + 1,
        '& .RaAppBar-toolbar': {
          minHeight: { xs: APPBAR_HEIGHT_XS, sm: APPBAR_HEIGHT_SM },
          padding: { xs: '8px 12px', sm: '8px 20px' },
          gap: 1.5,
        },
      })}
    >
      {/* Left: menu icon + brand */}
      <Stack direction="row" alignItems="center" flex={1} gap={1.5}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            aria-label="Medivue logo"
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.15)',
              border: '2px solid rgba(255,255,255,0.2)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#fff', lineHeight: 1 }}>
              M
            </Typography>
          </Box>

          {!isSmall && (
            <Box sx={{ lineHeight: 1.1 }}>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
                Medivue Health
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                Admin Panel
              </Typography>
            </Box>
          )}
        </Box>

        <TitlePortal />
      </Stack>

      {/* Right: account */}
      <Stack direction="row" alignItems="center" gap={1}>
        <Tooltip title="Account">
          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            size="small"
            aria-controls={open ? 'acc-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: 'rgba(255,255,255,0.15)',
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            >
              <PersonIcon fontSize="small" />
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          id="acc-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={() => setAnchorEl(null)}
          PaperProps={{
            elevation: 3,
            sx: {
              minWidth: 220,
              mt: 1.2,
              borderRadius: 2,
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
              '&:before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 16,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.25 }}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>
              {userName}
            </Typography>
            {!!userEmail && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {userEmail}
              </Typography>
            )}
          </Box>
          <Divider />
          {doctorId && doctorId !== 'null' && (
            <MenuItem onClick={goProfile}>
              <ListItemIcon>
                <AccountCircleIcon fontSize="small" />
              </ListItemIcon>
              My Profile
            </MenuItem>
          )}
          <MenuItem onClick={() => setAnchorEl(null)}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => setAnchorEl(null)} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" color="error" />
            </ListItemIcon>
            <Logout />
          </MenuItem>
        </Menu>
      </Stack>
    </AppBar>
  );
};

const CustomLayout = (props: LayoutProps) => (
  <Layout
    {...props}
    appBar={CustomAppBar}
    sx={{
      /* CONTENT: push below AppBar, soft outer padding; background is set here (not theme) */
      '& .RaLayout-content': {
        minHeight: '100vh',
        backgroundColor: '#f5f7fa',
        paddingTop: '1.4rem',
        // paddingRight: { xs: 12, sm: 20 },
        // paddingLeft: { xs: 12, sm: 20 },
        // paddingBottom: { xs: 16, sm: 24 },
        paddingX: '0px !important'
      },

      /* SIDEBAR: perfect vertical alignment under AppBar, consistent height */
      '& .RaSidebar-fixed, & .RaSidebar-docked': {
        top: { xs: `${APPBAR_HEIGHT_XS}px`, sm: `${APPBAR_HEIGHT_SM}px` },
        height: {
          xs: `calc(100vh - ${APPBAR_HEIGHT_XS}px)`,
          sm: `calc(100vh - ${APPBAR_HEIGHT_SM}px)`,
        },
        backgroundColor: '#fff',
        borderRight: '1px solid #e5e7eb',
        boxShadow: 'none',
      },

      /* MENU ITEMS: icon alignment & size */
      '& .RaMenuItemLink-root': {
        minHeight: 44,
        padding: '10px 12px',
        gap: 10,
        '& .MuiListItemIcon-root': {
          minWidth: 0,
          marginRight: 10,
          color: 'inherit',
          display: 'grid',
          placeItems: 'center',
        },
        '& .MuiSvgIcon-root': { fontSize: 20 }, // uniform icon size
        '& .MuiListItemText-primary': { fontSize: 14, fontWeight: 600, lineHeight: 1.25 },
      },
    }}
  />
);

export default CustomLayout;
