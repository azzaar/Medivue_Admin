import { Login, LoginForm } from 'react-admin';
import { Box, Typography } from '@mui/material';
import Image from 'next/image';
import type { LoginProps } from 'react-admin';
import theme from '@/utils/theme';

const logoUrl = "/medivueLogo.jpeg"; // Path to your logo image

const CustomLoginPage = (props: LoginProps) => {
  return (
    <Login
      {...props}
      sx={{
        backgroundColor: theme.palette.primary.dark, // Dark background
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center', // Center vertically
        alignItems: 'center',     // Center horizontally
        minHeight: '100vh',       // Full viewport height
          width: '100vw',
      }}
    >
      {/* Logo and Welcome Section */}
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
              sx={{padding: 2, // Padding around the logo/text
            
          mb: 4, // Margin bottom to separate logo/text from the form elements
        }}
      >
        <Image
          src={logoUrl}
          alt="Medivue Logo"
          width={150}
          height={150}
        />
        <Typography
          variant="h5"
          sx={{
            color: theme.palette.text.primary,
            textAlign: 'center',
          }}
        >
          Welcome to Medivue Health and Wellness
        </Typography>
              <LoginForm sx={{mt:3}} />

      </Box>


    </Login>
  );
};

export default CustomLoginPage;
