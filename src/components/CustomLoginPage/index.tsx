// CustomLoginPage.tsx - Clean Professional Login
import * as React from 'react';
import { useState } from 'react';
import { useLogin, useNotify } from 'react-admin';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Container,
  InputAdornment,
  IconButton,
  Stack,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock as LockIcon,
  Person,
} from '@mui/icons-material';
import Image from 'next/image';

const logoUrl = "/medivueLogo.jpeg";
const CustomLoginPage = () => {
  const [username, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useLogin();
  const notify = useNotify();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ username, password });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      notify('Invalid username or password', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: '#16669f',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Simple Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
        }}
      />

      <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, py: 4 }}>
        <Card
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 440,
            borderRadius: 3,
            overflow: 'hidden',
            backgroundColor: 'rgba(255,255,255,0.98)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            {/* Logo & Title */}
            <Stack spacing={2} alignItems="center" mb={4}>
              <Paper
                elevation={0}
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // background: 'linear-gradient(135deg, #16669f 0%, #2c7fb8 100%)',
                  boxShadow: '0 8px 24px rgba(22, 102, 159, 0.25)',
                }}
              >
                  <Image
          src={logoUrl}
          alt="Medivue Logo"
          width={150}
          height={150}
        />
              </Paper>
              <Box textAlign="center">
                <Typography variant="h5" fontWeight={600} gutterBottom color="text.primary">
                  Medivue Health and Wellness
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={400}>
                  Sign in to access your dashboard
                </Typography>
              </Box>
            </Stack>

            {/* Login Form */}
            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Username"
                  type="text"
                  value={username}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #16669f 0%, #2c7fb8 100%)',
                    boxShadow: '0 4px 12px rgba(22, 102, 159, 0.3)',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(22, 102, 159, 0.4)',
                      background: 'linear-gradient(135deg, #0d4d75 0%, #1a5f8f 100%)',
                    },
                    '&:disabled': {
                      background: '#ccc',
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: 'white' }} />
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </Stack>
            </form>

            {/* Footer */}
            <Box mt={4} textAlign="center">
              <Typography variant="caption" color="text.secondary">
                © {new Date().getFullYear()} Medivue Health and Wellness. All rights reserved.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default CustomLoginPage;