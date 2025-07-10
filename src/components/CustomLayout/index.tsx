import { Layout, AppBar, Logout, TitlePortal, LayoutProps } from 'react-admin';
import { Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const CustomAppBar = () => {
  const navigate = useNavigate();

  // Assuming 'linkedDoctorId' is part of the identity object or still stored in localStorage
  // It's better to rely on identity if possible, but keeping localStorage for now as per original code.
  const doctorId = localStorage.getItem('linkedDoctorId'); // Example, replace with actual ID fetching logic if identity has it

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
      {doctorId && doctorId !=='null' ?
        <Button color="inherit" onClick={handleProfileClick}>
          My Profile
        </Button> : null}
      
      <Logout />
    </AppBar>
  );
};

// This component is wrapped in a CustomLayout, so it needs to be exported
// as part of the layout structure.
const CustomLayout = (props: LayoutProps) => <Layout {...props} appBar={CustomAppBar} />;

export default CustomLayout;
