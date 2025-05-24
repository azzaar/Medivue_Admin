// CustomLayout.tsx
import { Layout, AppBar, Logout, TitlePortal } from 'react-admin';
import { Typography } from '@mui/material';

const CustomAppBar = () => (
  <AppBar>
    <TitlePortal />
    <Typography flex="1" variant="h6" id="react-admin-title" />
    <Logout />
  </AppBar>
);

import { LayoutProps } from 'react-admin';

const CustomLayout = (props: LayoutProps) => <Layout {...props} appBar={CustomAppBar} />;
export default CustomLayout;
