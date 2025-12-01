import React, { useState, useEffect } from "react";
import {
  NumberField,
  Show,
  SimpleShowLayout,
  TextField,
  useRecordContext,
  useNotify,
} from "react-admin";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  IconButton,
  Tooltip,
  TextField as MuiTextField,
} from "@mui/material";
import {
  Add as AddIcon,
  VpnKey as KeyIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Block as BlockIcon,
  Edit as EditIcon,
} from "@mui/icons-material";

interface AccountStatus {
  hasAccount: boolean;
  username: string;
  isActive: boolean;
  lastLoginAt?: string;
  mustChangePassword?: boolean;
}

interface Credentials {
  patientName?: string;
  username: string;
  temporaryPassword: string;
}

const PatientCredentialsPanel = () => {
  const record = useRecordContext();
  const notify = useNotify();

  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState<"create" | "reset" | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editUsernameDialog, setEditUsernameDialog] = useState(false);
  const [editPasswordDialog, setEditPasswordDialog] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (record?.id) {
      fetchAccountStatus();
    }
  }, [record?.id]);

  const fetchAccountStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000"}/admin/patient-credentials/${record.id}/status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch account status");

      const data = await response.json();
      setAccountStatus(data);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error fetching account status:", err);
      notify("Failed to load account status", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      setProcessing(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000"}/admin/patient-credentials/${record.id}/create`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create account");
      }

      const data = await response.json();
      setCredentials(data);
      setShowDialog(true);
      setDialogType("create");
      await fetchAccountStatus();
      notify("Patient account created successfully!", { type: "success" });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error creating account:", err);
      notify(err.message || "Failed to create account", { type: "error" });
    } finally {
      setProcessing(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setProcessing(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000"}/admin/patient-credentials/${record.id}/reset-password`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reset password");
      }

      const data = await response.json();
      setCredentials(data);
      setShowDialog(true);
      setDialogType("reset");
      await fetchAccountStatus();
      notify("Password reset successfully!", { type: "success" });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error resetting password:", err);
      notify(err.message || "Failed to reset password", { type: "error" });
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      setProcessing(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000"}/admin/patient-credentials/${record.id}/toggle-status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to toggle status");
      }

      const data = await response.json();
      await fetchAccountStatus();
      notify(data.message, { type: "success" });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error toggling status:", err);
      notify(err.message || "Failed to toggle status", { type: "error" });
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    notify("Copied to clipboard", { type: "info" });
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setCredentials(null);
    setShowPassword(false);
  };

  const handleUpdateUsername = async () => {
    if (!newUsername.trim() || newUsername.trim().length < 3) {
      notify("Username must be at least 3 characters long", { type: "error" });
      return;
    }

    try {
      setProcessing(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000"}/admin/patient-credentials/${record.id}/update-username`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newUsername: newUsername.trim() }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update username");
      }

      const data = await response.json();
      await fetchAccountStatus();
      setEditUsernameDialog(false);
      setNewUsername("");
      notify(data.message, { type: "success" });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error updating username:", err);
      notify(err.message || "Failed to update username", { type: "error" });
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      notify("Password must be at least 6 characters long", { type: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      notify("Passwords do not match", { type: "error" });
      return;
    }

    try {
      setProcessing(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000"}/admin/patient-credentials/${record.id}/update-password`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newPassword, mustChangePassword: false }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update password");
      }

      const data = await response.json();
      await fetchAccountStatus();
      setEditPasswordDialog(false);
      setNewPassword("");
      setConfirmPassword("");
      notify(data.message, { type: "success" });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error updating password:", err);
      notify(err.message || "Failed to update password", { type: "error" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <KeyIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Login Credentials
              </Typography>
            </Box>
            <IconButton onClick={fetchAccountStatus} size="small">
              <RefreshIcon />
            </IconButton>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          {!accountStatus?.hasAccount ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                This patient does not have a login account yet. Create one to allow them to access the patient portal.
              </Alert>
              <Button
                variant="contained"
                startIcon={processing ? <CircularProgress size={20} /> : <AddIcon />}
                onClick={handleCreateAccount}
                disabled={processing}
                fullWidth
              >
                Create Login Account
              </Button>
            </Box>
          ) : (
            <Box>
              <Stack spacing={2}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Username:
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body1" fontWeight={600}>
                      {accountStatus.username}
                    </Typography>
                    <Tooltip title="Edit username">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setNewUsername(accountStatus.username);
                          setEditUsernameDialog(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Copy username">
                      <IconButton
                        size="small"
                        onClick={() => handleCopy(accountStatus.username)}
                      >
                        {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Status:
                  </Typography>
                  <Chip
                    label={accountStatus.isActive ? "Active" : "Disabled"}
                    color={accountStatus.isActive ? "success" : "error"}
                    size="small"
                  />
                </Box>

                {accountStatus.lastLoginAt && (
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Last Login:
                    </Typography>
                    <Typography variant="body2">
                      {new Date(accountStatus.lastLoginAt).toLocaleString()}
                    </Typography>
                  </Box>
                )}

                {accountStatus.mustChangePassword && (
                  <Alert severity="warning" sx={{ fontSize: "0.875rem" }}>
                    Patient must change password on first login
                  </Alert>
                )}

                <Divider />

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => setEditPasswordDialog(true)}
                    disabled={processing}
                    fullWidth
                  >
                    Change Password
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={processing ? <CircularProgress size={20} /> : <KeyIcon />}
                    onClick={handleResetPassword}
                    disabled={processing}
                    fullWidth
                  >
                    Reset Password
                  </Button>
                </Stack>

                <Button
                  variant="outlined"
                  color={accountStatus.isActive ? "error" : "success"}
                  startIcon={processing ? <CircularProgress size={20} /> : <BlockIcon />}
                  onClick={handleToggleStatus}
                  disabled={processing}
                  fullWidth
                >
                  {accountStatus.isActive ? "Disable Account" : "Enable Account"}
                </Button>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Credentials Dialog */}
      <Dialog open={showDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === "create" ? "Account Created Successfully" : "Password Reset Successfully"}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            ⚠️ IMPORTANT: Save these credentials and share them with the patient. The password will NOT be shown again!
          </Alert>

          {credentials && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Patient Name:
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {credentials.patientName || record.name}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Username:
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body1" fontWeight={600}>
                    {credentials.username}
                  </Typography>
                  <Tooltip title="Copy username">
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(credentials.username)}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Temporary Password:
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{ fontFamily: "monospace" }}
                  >
                    {showPassword ? credentials.temporaryPassword : "••••••••"}
                  </Typography>
                  <Tooltip title={showPassword ? "Hide password" : "Show password"}>
                    <IconButton
                      size="small"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Copy password">
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(credentials.temporaryPassword)}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="contained">
            I&apos;ve Saved The Credentials
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Username Dialog */}
      <Dialog
        open={editUsernameDialog}
        onClose={() => {
          setEditUsernameDialog(false);
          setNewUsername("");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Username</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            The patient will need to use the new username to log in.
          </Alert>
          <MuiTextField
            autoFocus
            margin="dense"
            label="New Username"
            type="text"
            fullWidth
            variant="outlined"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            helperText="Username must be at least 3 characters long"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditUsernameDialog(false);
              setNewUsername("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateUsername}
            variant="contained"
            disabled={processing || !newUsername.trim() || newUsername.trim().length < 3}
            startIcon={processing && <CircularProgress size={20} />}
          >
            Update Username
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Password Dialog */}
      <Dialog
        open={editPasswordDialog}
        onClose={() => {
          setEditPasswordDialog(false);
          setNewPassword("");
          setConfirmPassword("");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Set a custom password for this patient. They can use it immediately without needing to change it.
          </Alert>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <MuiTextField
              autoFocus
              label="New Password"
              type={showPassword ? "text" : "password"}
              fullWidth
              variant="outlined"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="Password must be at least 6 characters long"
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                ),
              }}
            />
            <MuiTextField
              label="Confirm Password"
              type={showPassword ? "text" : "password"}
              fullWidth
              variant="outlined"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={confirmPassword.length > 0 && newPassword !== confirmPassword}
              helperText={
                confirmPassword.length > 0 && newPassword !== confirmPassword
                  ? "Passwords do not match"
                  : ""
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditPasswordDialog(false);
              setNewPassword("");
              setConfirmPassword("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdatePassword}
            variant="contained"
            disabled={
              processing ||
              !newPassword ||
              newPassword.length < 6 ||
              newPassword !== confirmPassword
            }
            startIcon={processing && <CircularProgress size={20} />}
          >
            Update Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export const PatientShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="name" />
      <NumberField source="age" />
      <TextField source="gender" />
      <TextField source="contactNumber" />
      <TextField source="email" />
      <TextField source="address.street" />
      <TextField source="address.city" />
      <TextField source="address.state" />
      <TextField source="address.postalCode" />
      <TextField source="emergencyContactName" />
      <TextField source="emergencyContactRelation" />
      <TextField source="emergencyContactNumber" />

      {/* Patient Credentials Management Panel */}
      <PatientCredentialsPanel />
    </SimpleShowLayout>
  </Show>
);
