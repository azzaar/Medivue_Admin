import { Layout, AppBar, Logout, TitlePortal } from 'react-admin';
import { Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for React Router v6
// OR if using React Router v6, you would use `useNavigate` instead
// import { useNavigate } from 'react-router-dom';

const CustomAppBar = () => {
  const navigate = useNavigate(); // For React Router v5
  const doctorId = localStorage.getItem('linkedDoctorId'); // Example, you should replace it with your actual ID fetching logic
  const handleProfileClick = () => {
    if (doctorId) {
      console.log(`Redirecting to profile of doctor with ID: ${doctorId}`);
      
      navigate(`/doctors/${doctorId}/profile`);
    }
  };

  return (
    <AppBar>
      <TitlePortal />
      <Typography flex="1" variant="h6" id="react-admin-title" />
      {doctorId && (
      <Button color="inherit" onClick={handleProfileClick}>
        My Profile
      </Button>
      )}
      <Logout />
    </AppBar>
  );
};

import { LayoutProps } from 'react-admin';

const CustomLayout = (props: LayoutProps) => <Layout {...props} appBar={CustomAppBar} />;

export default CustomLayout;
