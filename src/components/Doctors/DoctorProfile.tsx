"use client";

import { useState, useEffect } from "react";
import {
  useNotify,
  useRefresh,
  useLogout,
  Loading,
} from "react-admin";
import {
  Typography,
  Box,
  Button,
  TextField,
  Card,
  CardContent,
  Alert,
  Stack,
  IconButton,
  InputAdornment,
  Chip,
} from "@mui/material";
import Grid from '@mui/material/GridLegacy';

import {
  Visibility,
  VisibilityOff,
  Save as SaveIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from "@mui/icons-material";
import { apiClient as httpClient } from "@/utils";
import { API_ENDPOINTS } from "@/config/api.config";

interface DoctorProfile {
  id: string;
  _id: string;
  doctorId: string;
  name: string;
  specialization: string;
  contactNumber: string;
  email: string;
  experience: number;
  username: string;
  isCommissionBased?: boolean;
}

const DoctorProfilePage = () => {
  const notify = useNotify();
  const refresh = useRefresh();
  const logout = useLogout();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);

  // Profile form fields
  const [formData, setFormData] = useState({
    name: "",
    specialization: "",
    contactNumber: "",
    email: "",
    experience: 0,
  });

  // Credentials fields
  const [credentials, setCredentials] = useState({
    username: "",
    newPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [updatingCredentials, setUpdatingCredentials] = useState(false);

  // Load doctor profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const linkedDoctorId = localStorage.getItem("linkedDoctorId");
      if (!linkedDoctorId) {
        notify("No linked doctor ID found. Please log in again.", { type: "error" });
        return;
      }

      const data = await httpClient.get<DoctorProfile>(
        `${API_ENDPOINTS.DOCTORS}/${linkedDoctorId}`
      );

      setProfile(data);
      setFormData({
        name: data.name || "",
        specialization: data.specialization || "",
        contactNumber: data.contactNumber || "",
        email: data.email || "",
        experience: data.experience || 0,
      });
      setCredentials({
        username: data.username || "",
        newPassword: "",
      });
    } catch (error) {
      notify(error.message || "Failed to load profile", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    if (!profile?.id) {
      notify("Profile ID not found", { type: "error" });
      return;
    }

    // Validation
    if (!formData.name.trim()) {
      notify("Name is required", { type: "warning" });
      return;
    }

    if (!formData.contactNumber.trim()) {
      notify("Contact number is required", { type: "warning" });
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      notify("Invalid email format", { type: "warning" });
      return;
    }

    if (formData.experience < 0) {
      notify("Experience cannot be negative", { type: "warning" });
      return;
    }

    setSaving(true);
    try {
      await httpClient.put(`${API_ENDPOINTS.DOCTORS}/${profile.id}`, formData);
      notify("Profile updated successfully!", { type: "success" });
      await loadProfile(); // Reload fresh data
      refresh(); // Refresh React Admin
    } catch (error) {
      notify(error.message || "Failed to update profile", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCredentials = async () => {
    if (!profile?.id) {
      notify("Profile ID not found", { type: "error" });
      return;
    }

    if (!credentials.username.trim()) {
      notify("Username is required", { type: "warning" });
      return;
    }

    if (!credentials.newPassword.trim()) {
      notify("New password is required", { type: "warning" });
      return;
    }

    if (credentials.newPassword.length < 6) {
      notify("Password must be at least 6 characters", { type: "warning" });
      return;
    }

    setUpdatingCredentials(true);
    try {
      await httpClient.put(`${API_ENDPOINTS.DOCTORS}/${profile.id}/credentials`, {
        username: credentials.username,
        plainPassword: credentials.newPassword,
      });

      notify("Credentials updated successfully! Please log in again.", {
        type: "success",
      });

      // Auto logout after 2 seconds
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (error) {
      notify(error.message || "Failed to update credentials", { type: "error" });
    } finally {
      setUpdatingCredentials(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!profile) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load doctor profile. Please try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={1}>
          <PersonIcon sx={{ fontSize: 40, color: "primary.main" }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Doctor Profile
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your profile information and login credentials
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} mt={1}>
          <Chip label={`ID: ${profile.doctorId || profile.id}`} size="small" />
          {profile.isCommissionBased && (
            <Chip label="Commission Based" size="small" color="primary" />
          )}
        </Stack>
      </Box>

      {/* Profile Information Card */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={3}>
            Profile Information
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name"
                value={formData.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Specialization"
                value={formData.specialization}
                onChange={(e) => handleFieldChange("specialization", e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Number"
                value={formData.contactNumber}
                onChange={(e) => handleFieldChange("contactNumber", e.target.value)}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Experience (Years)"
                type="number"
                value={formData.experience}
                onChange={(e) =>
                  handleFieldChange("experience", parseInt(e.target.value) || 0)
                }
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveProfile}
              disabled={saving}
              size="large"
            >
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Login Credentials Card */}
      <Card elevation={2}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <LockIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Login Credentials
            </Typography>
          </Stack>

          <Alert severity="warning" sx={{ mb: 3 }}>
            Changing your credentials will log you out immediately. You&apos;ll need to log
            in again with your new credentials.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Username"
                value={credentials.username}
                onChange={(e) =>
                  setCredentials((prev) => ({ ...prev, username: e.target.value }))
                }
                helperText="Enter your new username for login"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="New Password"
                type={showPassword ? "text" : "password"}
                value={credentials.newPassword}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                helperText="Minimum 6 characters required"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              color="warning"
              startIcon={<LockIcon />}
              onClick={handleUpdateCredentials}
              disabled={updatingCredentials}
              size="large"
            >
              {updatingCredentials ? "Updating..." : "Update Credentials"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DoctorProfilePage;
