import React, { useState, useEffect } from "react";
import { useNotify, Loading } from "react-admin";
import { httpClient } from "@/lib/httpClient";
import { API_ENDPOINTS } from "@/config/api.config";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Avatar,
  useTheme,
  alpha,
  TablePagination,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import PersonIcon from "@mui/icons-material/Person";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import dayjs from "dayjs";

interface Doctor {
  _id: string;
  name: string;
}

interface Patient {
  _id: string;
  name: string;
  phoneNumber?: string;
  age?: number;
  gender?: string;
}

interface WeeklyAssignment {
  _id: string;
  doctorId: Doctor;
  patientId: Patient;
  weekStartDate: string;
  weekEndDate: string;
  status: string;
  notes?: string;
  createdAt: string;
}

interface DoctorStat {
  _id: string;
  doctorName: string;
  specialization?: string;
  totalAssignments: number;
  scheduled: number;
  completed: number;
}

const WeeklyAssignmentHistory: React.FC = () => {
  const theme = useTheme();
  const notify = useNotify();

  const [assignments, setAssignments] = useState<WeeklyAssignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<WeeklyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorStats, setDoctorStats] = useState<DoctorStat[]>([]);

  // Filters
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [searchPatient, setSearchPatient] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    loadAllAssignments();
    loadDoctorStats();
  }, []);

  useEffect(() => {
    filterAssignments();
  }, [assignments, selectedDoctor, searchPatient]);

  const loadDoctorStats = async () => {
    try {
      const url = API_ENDPOINTS.WEEKLY_ASSIGNMENTS.DOCTOR_STATS;
      const data = await httpClient.get<DoctorStat[]>(url);
      setDoctorStats(data || []);
    } catch (err: unknown) {
      const error = err as { message?: string };
      notify(error?.message || "Failed to load doctor statistics", { type: "error" });
    }
  };

  const loadAllAssignments = async () => {
    setLoading(true);
    try {
      const url = API_ENDPOINTS.WEEKLY_ASSIGNMENTS.ALL;
      const data = await httpClient.get<WeeklyAssignment[]>(url);

      setAssignments(data || []);

      // Extract unique doctors
      const uniqueDoctors = Array.from(
        new Map(
          (data || [])
            .filter((a) => a.doctorId)
            .map((a) => [a.doctorId._id, a.doctorId])
        ).values()
      );
      setDoctors(uniqueDoctors);
    } catch (err) {
      notify(err?.message || "Failed to load assignment history", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const filterAssignments = () => {
    let filtered = [...assignments];

    // Filter by doctor
    if (selectedDoctor !== "all") {
      filtered = filtered.filter((a) => a.doctorId?._id === selectedDoctor);
    }

 

    // Filter by patient name
    if (searchPatient.trim()) {
      const searchLower = searchPatient.toLowerCase();
      filtered = filtered.filter((a) =>
        a.patientId?.name?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredAssignments(filtered);
    setPage(0); // Reset to first page when filters change
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "cancelled":
        return "error";
      default:
        return "primary";
    }
  };

  if (loading) {
    return <Loading />;
  }

  const paginatedAssignments = filteredAssignments.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

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
        <Stack direction="row" alignItems="center" spacing={2}>
          <HistoryIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary">
              Weekly Assignment History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View all past and current weekly patient assignments
            </Typography>
          </Box>
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
            md: "repeat(4, 1fr)",
          },
          mb: 3,
        }}
      >
        <Card>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Scheduled
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {filteredAssignments.filter((a) => a.status === "scheduled").length}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Cancelled
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {filteredAssignments.filter((a) => a.status === "cancelled").length}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Doctor Statistics */}
      {doctorStats.length > 0 && (
        <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2} mb={3}>
            <LocalHospitalIcon sx={{ fontSize: 32, color: theme.palette.secondary.main }} />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Doctor-wise Appointment Statistics
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Assignment breakdown by doctor
              </Typography>
            </Box>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                lg: "repeat(3, 1fr)",
              },
            }}
          >
            {doctorStats.map((stat) => (
              <Card
                key={stat._id}
                elevation={2}
                sx={{
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Avatar
                      sx={{
                        bgcolor: theme.palette.secondary.main,
                        width: 48,
                        height: 48,
                      }}
                    >
                      <LocalHospitalIcon />
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {stat.doctorName}
                      </Typography>
                      {stat.specialization && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {stat.specialization}
                        </Typography>
                      )}
                      <Box mt={2}>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip
                            label={`Total: ${stat.totalAssignments}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Chip
                            label={`Scheduled: ${stat.scheduled}`}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                          <Chip
                            label={`Completed: ${stat.completed}`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        </Stack>
                      </Box>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Paper>
      )}

      {/* Filters */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Filters
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(3, 1fr)",
            },
          }}
        >
          <FormControl fullWidth>
            <InputLabel>Doctor</InputLabel>
            <Select
              value={selectedDoctor}
              label="Doctor"
              onChange={(e) => setSelectedDoctor(e.target.value)}
              startAdornment={<LocalHospitalIcon sx={{ mr: 1, color: "action.active" }} />}
            >
              <MenuItem value="all">All Doctors</MenuItem>
              {doctors.map((doctor) => (
                <MenuItem key={doctor._id} value={doctor._id}>
                  {doctor.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          

          <TextField
            fullWidth
            label="Search Patient"
            value={searchPatient}
            onChange={(e) => setSearchPatient(e.target.value)}
            placeholder="Enter patient name"
            InputProps={{
              startAdornment: <PersonIcon sx={{ mr: 1, color: "action.active" }} />,
            }}
          />
        </Box>
      </Paper>

      {/* Assignments Table */}
      <Paper elevation={1} sx={{ borderRadius: 2, overflow: "hidden" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Patient
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Doctor
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Week Period
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Status
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Notes
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Created
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Box sx={{ py: 6 }}>
                      <Typography variant="h6" color="text.secondary">
                        No assignments found
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        Try adjusting your filters
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAssignments.map((assignment) => (
                  <TableRow key={assignment._id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {assignment.patientId?.name || "N/A"}
                          </Typography>
                          {assignment.patientId?.phoneNumber && (
                            <Typography variant="caption" color="text.secondary">
                              {assignment.patientId.phoneNumber}
                            </Typography>
                          )}
                          {assignment.patientId?.age && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {assignment.patientId.age}y, {assignment.patientId.gender}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{assignment.doctorId?.name || "N/A"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <CalendarTodayIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {dayjs(assignment.weekStartDate).format("MMM DD")} -{" "}
                          {dayjs(assignment.weekEndDate).format("MMM DD, YYYY")}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<CheckCircleIcon />}
                        label={assignment.status}
                        size="small"
                        color={getStatusColor(assignment.status)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                        {assignment.notes || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(assignment.createdAt).format("MMM DD, YYYY")}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredAssignments.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};

export default WeeklyAssignmentHistory;
