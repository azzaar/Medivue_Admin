import React, { useState, useEffect } from "react";
import { useNotify, useDataProvider, Loading } from "react-admin";
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Card,
  CardContent,
  useTheme,
  alpha,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonIcon from "@mui/icons-material/Person";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import { httpClient } from "@/lib/httpClient";

interface User {
  _id: string;
  username: string;
  role: string;
  fullName?: string;
  email?: string;
  linkedDoctorId?: { _id: string; name: string };
  createdAt: string;
}

interface Doctor {
  id: string;
  name: string;
}

const ROLES = [
  { value: "admin", label: "Admin", color: "error" },
  { value: "superAdmin", label: "Super Admin", color: "primary" },
  { value: "doctor", label: "Doctor", color: "info" },
  { value: "hr", label: "HR", color: "success" },
  { value: "operator", label: "Operator", color: "warning" },
  { value: "miniAdmin", label: "Mini Admin", color: "secondary" },
];

const UserManagement: React.FC = () => {
  const theme = useTheme();
  const notify = useNotify();
  const dataProvider = useDataProvider();

  const [users, setUsers] = useState<User[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("operator");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [linkedDoctorId, setLinkedDoctorId] = useState("");

  useEffect(() => {
    loadUsers();
    loadDoctors();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await httpClient.get<User[]>("/users");
      setUsers(data || []);
    } catch  {
      notify("Failed to load users", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    try {
      const resp = await dataProvider.getList("doctors", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "name", order: "ASC" },
        filter: {},
      });
      const doctorsList = (resp.data || []).map((d) => ({
        id: String(d.id ?? d._id),
        name: String(d.name),
      }));
      setDoctors(doctorsList);
    } catch  {
      notify("Failed to load doctors", { type: "error" });
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditMode(true);
      setCurrentUserId(user._id);
      setUsername(user.username);
      setRole(user.role);
      setFullName(user.fullName || "");
      setEmail(user.email || "");
      setLinkedDoctorId(user.linkedDoctorId?._id || "");
      setPassword("");
    } else {
      setEditMode(false);
      setCurrentUserId(null);
      setUsername("");
      setPassword("");
      setRole("operator");
      setFullName("");
      setEmail("");
      setLinkedDoctorId("");
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!username || (!editMode && !password) || !role) {
      notify("Please fill in all required fields", { type: "warning" });
      return;
    }

    if (role === "doctor" && !linkedDoctorId) {
      notify("Doctor role requires selecting a linked doctor", { type: "warning" });
      return;
    }

    try {
      const payload: Record<string, string> = {
        username,
        role,
        fullName,
        email,
      };

      if (password) payload.password = password;
      if (role === "doctor") payload.linkedDoctorId = linkedDoctorId;

      if (editMode && currentUserId) {
        await httpClient.put(`/users/${currentUserId}`, payload);
        notify("User updated successfully", { type: "success" });
      } else {
        await httpClient.post("/users", payload);
        notify("User created successfully", { type: "success" });
      }

      handleCloseDialog();
      loadUsers();
    } catch (error) {
      const err = error as { message?: string };
      notify(err?.message || "Failed to save user", { type: "error" });
    }
  };

  const handleDelete = async (userId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    try {
      await httpClient.delete(`/users/${userId}`);
      notify("User deleted successfully", { type: "success" });
      loadUsers();
    } catch (error) {
      const err = error as { message?: string };
      notify(err?.message || "Failed to delete user", { type: "error" });
    }
  };

  const getRoleColor = (role: string) => {
    const roleObj = ROLES.find((r) => r.value === role);
    return roleObj?.color || "default";
  };

  const getRoleLabel = (role: string) => {
    const roleObj = ROLES.find((r) => r.value === role);
    return roleObj?.label || role;
  };

  if (loading) return <Loading />;

  const roleCount = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.primary.main,
            0.1
          )} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
          borderRadius: 2,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <ManageAccountsIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
            <Box>
              <Typography variant="h4" fontWeight="bold" color="primary">
                User Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage system users and assign roles
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            }}
          >
            Create User
          </Button>
        </Stack>
      </Paper>

      {/* Summary Cards */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(6, 1fr)",
          },
          mb: 3,
        }}
      >
        <Card>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Total Users
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {users.length}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
        {ROLES.map((r) => (
          <Card key={r.value}>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  {r.label}
                </Typography>
                <Typography variant="h4" fontWeight="bold" color={`${r.color}.main`}>
                  {roleCount[r.value] || 0}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Users Table */}
      <Paper elevation={1} sx={{ borderRadius: 2, overflow: "hidden" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell><Typography variant="subtitle2" fontWeight="bold">Username</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight="bold">Full Name</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight="bold">Email</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight="bold">Role</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight="bold">Linked Doctor</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight="bold">Created</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2" fontWeight="bold">Actions</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="h6" color="text.secondary">
                      No users found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user._id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <PersonIcon color="action" />
                        <Typography variant="body2" fontWeight="bold">
                          {user.username}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{user.fullName || "-"}</TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(user.role)}
                        size="small"
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        color={getRoleColor(user.role) as any}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{user.linkedDoctorId?.name || "-"}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(user)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(user._id, user.username)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? "Edit User" : "Create New User"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              fullWidth
              disabled={editMode}
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!editMode}
              fullWidth
              helperText={editMode ? "Leave empty to keep current password" : ""}
            />
            <TextField
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              fullWidth
            >
              {ROLES.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </TextField>
            {role === "doctor" && (
              <TextField
                select
                label="Linked Doctor"
                value={linkedDoctorId}
                onChange={(e) => setLinkedDoctorId(e.target.value)}
                required
                fullWidth
                helperText="Required for doctor role"
              >
                {doctors.map((doctor) => (
                  <MenuItem key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editMode ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
