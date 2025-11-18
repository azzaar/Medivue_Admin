import React, { useState, useEffect } from "react";
import {
  useDataProvider,
  useNotify,
  Loading,
} from "react-admin";
import { httpClient } from "@/lib/httpClient";
import { API_ENDPOINTS } from "@/config/api.config";
import {
  Box,
  Button,
  Paper,
  Typography,
  TextField,
  Chip,
  Card,
  CardContent,
  useTheme,
  Autocomplete,
  IconButton,
  Tooltip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Avatar,
  alpha,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PersonIcon from "@mui/icons-material/Person";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import CalendarView from "../Patients/CalendarView";

dayjs.extend(isoWeek);

interface Doctor {
  id: string;
  name: string;
  specialization?: string;
  doctorId?: string;
}

interface Patient {
  id: string;
  name: string;
  phoneNumber?: string;
  age?: number;
  gender?: string;
  condition?: string;
}

interface TimeSlot {
  date: string;
  time?: string;
  completed: boolean;
}

interface WeeklyAssignment {
  _id: string;
  doctorId: string;
  patientId: {
    _id: string;
    name: string;
    phoneNumber?: string;
    age?: number;
    gender?: string;
    condition?: string;
  };
  weekStartDate: string;
  weekEndDate: string;
  timeSlots: TimeSlot[];
  notes?: string;
  status: string;
}


const WeeklyAssignments: React.FC = () => {
  const theme = useTheme();
  const notify = useNotify();
  const dataProvider = useDataProvider();

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [linkedDoctorId, setLinkedDoctorId] = useState<string>("");

  // Data
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<dayjs.Dayjs>(
    dayjs().startOf("isoWeek")
  );

  // Weekly assignments and leave days
  const [assignments, setAssignments] = useState<WeeklyAssignment[]>([]);
  const [leaveDays, setLeaveDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Add patient dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [assignmentNotes, setAssignmentNotes] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  // Visited days dialog
  const [visitedDaysDialogOpen, setVisitedDaysDialogOpen] = useState(false);
  const [selectedPatientForVisitedDays, setSelectedPatientForVisitedDays] = useState<Patient | null>(null);


  useEffect(() => {
    const role = localStorage.getItem("role");
    const docId = localStorage.getItem("linkedDoctorId");
    const adminCheck = role === "admin" || role === "superAdmin";
    setIsAdmin(adminCheck);
    setLinkedDoctorId(docId && docId !== "null" ? docId : "");

    loadDoctors(adminCheck, docId);
    loadAllPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      loadWeeklyAssignments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctor, currentWeekStart]);

  const loadDoctors = async (adminCheck: boolean, docId: string | null) => {
    try {
      const resp = await dataProvider.getList("doctors", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "name", order: "ASC" },
        filter: {},
      });

      const doctorsList = (resp.data || []).map((d) => ({
        id: String(d.id ?? d._id),
        name: String(d.name),
        specialization: d.specialization ? String(d.specialization) : undefined,
        doctorId: d.doctorId ? String(d.doctorId) : undefined,
      }));

      setDoctors(doctorsList);

      if (!adminCheck && docId && docId !== "null") {
        const linkedDoc = doctorsList.find((d) => d.id === docId);
        if (linkedDoc) setSelectedDoctor(linkedDoc);
      } else if (doctorsList.length > 0) {
        setSelectedDoctor(doctorsList[0]);
      }
    } catch {
      notify("Failed to load doctors", { type: "error" });
    }
  };

  const loadAllPatients = async () => {
    try {
      const resp = await dataProvider.getList("patients", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "name", order: "ASC" },
        filter: { status: "active" },
      });

      const patientsList = (resp.data || []).map((p) => ({
        id: String(p.id ?? p._id),
        name: String(p.name),
        phoneNumber: p.phoneNumber,
        age: p.age,
        gender: p.gender,
        condition: p.condition,
      }));

      setAllPatients(patientsList);
    } catch {
      notify("Failed to load patients", { type: "error" });
    }
  };

  const loadWeeklyAssignments = async () => {
    if (!selectedDoctor) return;

    setLoading(true);
    try {
      const weekDate = currentWeekStart.toISOString();
      const params = {
        doctorId: selectedDoctor.id,
        weekDate,
      };

      const url = httpClient.buildURLWithParams(API_ENDPOINTS.WEEKLY_ASSIGNMENTS.BASE, params);
      const data = await httpClient.get<{
        assignments: WeeklyAssignment[];
        weekStartDate: string;
        weekEndDate: string;
        leaveDays: string[];
      }>(url);

      setAssignments(data.assignments || []);
      setLeaveDays(data.leaveDays || []);
    } catch (err) {
      notify(err?.message || "Failed to load weekly assignments", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!selectedPatient || !selectedDoctor) {
      notify("Please select a patient", { type: "warning" });
      return;
    }

    setAssigning(true);
    try {
      const weekDate = currentWeekStart.toISOString();
      const data = await httpClient.post<{
        message: string;
        assignment: WeeklyAssignment;
        leaveDays?: string[];
      }>(API_ENDPOINTS.WEEKLY_ASSIGNMENTS.BASE, {
        doctorId: selectedDoctor.id,
        patientId: selectedPatient.id,
        weekDate,
        timeSlots: [],
        notes: assignmentNotes,
      });

      if (data.leaveDays && data.leaveDays.length > 0) {
        notify(`Assignment created. Note: Doctor has ${data.leaveDays.length} leave day(s) this week`, {
          type: "info",
        });
      } else {
        notify("Assignment created successfully", { type: "success" });
      }

      setAddDialogOpen(false);
      setSelectedPatient(null);
      setAssignmentNotes("");
      loadWeeklyAssignments();
    } catch (err) {
      notify(err?.message || "Failed to create assignment", { type: "error" });
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!window.confirm("Are you sure you want to remove this assignment?")) return;

    try {
      await httpClient.delete(API_ENDPOINTS.WEEKLY_ASSIGNMENTS.BY_ID(assignmentId));
      notify("Assignment removed successfully", { type: "success" });
      loadWeeklyAssignments();
    } catch (err) {
      notify(err?.message || "Failed to remove assignment", { type: "error" });
    }
  };

  const handleViewVisitedDays = async (patientData: Patient | { _id: string; name: string; phoneNumber?: string; age?: number; gender?: string; condition?: string }) => {
    // Convert patientData to Patient format with proper id
    const patient: Patient = {
      id: '_id' in patientData ? patientData._id : patientData.id,
      name: patientData.name,
      phoneNumber: patientData.phoneNumber,
      age: patientData.age,
      gender: patientData.gender,
      condition: patientData.condition,
    };

    setSelectedPatientForVisitedDays(patient);
    setVisitedDaysDialogOpen(true);


  };

  const handleCalendarClose = () => {
    setVisitedDaysDialogOpen(false);
    setSelectedPatientForVisitedDays(null);
  };



  const weekRange = `${currentWeekStart.format("MMM DD")} - ${currentWeekStart
    .add(6, "day")
    .format("MMM DD, YYYY")}`;

  if (loading && assignments.length === 0) {
    return <Loading />;
  }

  return (
    <Box sx={{ p: 3, margin: "0 auto", width: "100%", maxWidth: 1400 }}>
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
        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
          <CalendarTodayIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary">
              Weekly Patient Assignment
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage patient assignments per week with leave day integration
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Controls */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box
          sx={{
            display: "grid",
            gap: 3,
            alignItems: "center",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(0, 2fr) minmax(0, 3fr) minmax(0, 2fr)",
            },
          }}
        >
          {/* Doctor selector */}
          <Box>
            <Autocomplete
              options={doctors}
              getOptionLabel={(option) =>
                `${option.name}${option.specialization ? ` - ${option.specialization}` : ""}`
              }
              value={selectedDoctor}
              onChange={(_, newValue) => setSelectedDoctor(newValue)}
              disabled={!isAdmin && !!linkedDoctorId}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Doctor"
                  variant="outlined"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <LocalHospitalIcon sx={{ mr: 1, color: "action.active" }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Box>

          {/* Week navigation */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton onClick={() => setCurrentWeekStart(currentWeekStart.subtract(1, "week"))}>
                <NavigateBeforeIcon />
              </IconButton>
              <Box sx={{ flex: 1, textAlign: "center" }}>
                <Typography variant="h6" fontWeight="medium">
                  {weekRange}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Week {currentWeekStart.isoWeek()}
                </Typography>
              </Box>
              <IconButton onClick={() => setCurrentWeekStart(currentWeekStart.add(1, "week"))}>
                <NavigateNextIcon />
              </IconButton>
              <Tooltip title="Go to current week">
                <IconButton onClick={() => setCurrentWeekStart(dayjs().startOf("isoWeek"))}>
                  <CalendarTodayIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* Actions */}
          <Box>
            <Stack direction="row" spacing={1} justifyContent="flex-start">
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddDialogOpen(true)}
                disabled={!selectedDoctor}
                fullWidth
              >
                Assign Patient
              </Button>
              <Tooltip title="Refresh">
                <IconButton onClick={loadWeeklyAssignments} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </Box>

        {leaveDays.length > 0 && (
          <Alert severity="info" icon={<EventBusyIcon />} sx={{ mt: 2 }}>
            Doctor has {leaveDays.length} approved leave day(s) this week
          </Alert>
        )}
      </Paper>

      {/* Weekly Calendar Grid */}
      <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
       

        {/* Assigned Patients List */}
        {assignments.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              Assigned Patients
            </Typography>

            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, 1fr)",
                  lg: "repeat(3, 1fr)",
                },
              }}
            >
              {assignments.map((assignment) => (
                <Card
                  key={assignment._id}
                  elevation={2}
                  sx={{
                    transition: "all 0.3s ease",
                    border: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: 4,
                      borderColor: theme.palette.primary.main,
                    },
                  }}
                >
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Stack direction="row" spacing={2} flex={1}>
                        <Avatar
                          sx={{
                            bgcolor: theme.palette.primary.main,
                            width: 48,
                            height: 48,
                          }}
                        >
                          <PersonIcon />
                        </Avatar>
                        <Box flex={1}>
                          <Typography variant="subtitle1" fontWeight="bold" color="primary">
                            {assignment.patientId.name}
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" mt={0.5}>
                            {assignment.patientId.age && (
                              <Chip label={`${assignment.patientId.age}y`} size="small" />
                            )}
                            {assignment.patientId.gender && (
                              <Chip label={assignment.patientId.gender} size="small" />
                            )}
                          </Stack>
                          {assignment.patientId.phoneNumber && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              mt={1}
                            >
                              {assignment.patientId.phoneNumber}
                            </Typography>
                          )}
                          {assignment.patientId.condition && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {assignment.patientId.condition}
                            </Typography>
                          )}
                          {assignment.notes && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              mt={1}
                            >
                              Note: {assignment.notes}
                            </Typography>
                          )}
                          <Stack direction="row" spacing={0.5} mt={1}>
                            <Chip
                              icon={<CheckCircleIcon />}
                              label={assignment.status}
                              size="small"
                              color={assignment.status === "completed" ? "success" : "primary"}
                              variant="outlined"
                            />
                          </Stack>
                          <Stack direction="row" spacing={1} mt={2}>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<EventAvailableIcon />}
                              onClick={() => handleViewVisitedDays(assignment.patientId)}
                              fullWidth
                              sx={{
                                borderWidth: 2,
                                "&:hover": {
                                  borderWidth: 2,
                                  transform: "scale(1.02)",
                                },
                              }}
                            >
                              View Visited Days
                            </Button>
                          </Stack>
                        </Box>
                      </Stack>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteAssignment(assignment._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}

        {assignments.length === 0 && !loading && (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Typography variant="h6" color="text.secondary">
              No patients assigned for this week
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Click &quot;Assign Patient&ldquo; to add assignments
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Add Assignment Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AddIcon />
            <Typography variant="h6">Assign Patient to Week</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Autocomplete
              options={allPatients}
              getOptionLabel={(option) =>
                `${option.name}${option.age ? ` (${option.age}y)` : ""}${
                  option.phoneNumber ? ` - ${option.phoneNumber}` : ""
                }`
              }
              value={selectedPatient}
              onChange={(_, newValue) => setSelectedPatient(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Patient"
                  variant="outlined"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <PersonIcon sx={{ mr: 1, color: "action.active" }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <TextField
              label="Notes (Optional)"
              multiline
              rows={3}
              value={assignmentNotes}
              onChange={(e) => setAssignmentNotes(e.target.value)}
              variant="outlined"
              fullWidth
            />

            <Alert severity="info" icon={<CalendarTodayIcon />}>
              Patient will be assigned to {selectedDoctor?.name} for the week of {weekRange}
              {leaveDays.length > 0 && (
                <Typography variant="caption" display="block" mt={1}>
                  Note: Doctor has approved leave on {leaveDays.length} day(s) this week
                </Typography>
              )}
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddDialogOpen(false)} disabled={assigning}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddAssignment}
            disabled={!selectedPatient || assigning}
            startIcon={assigning ? null : <AddIcon />}
          >
            {assigning ? "Assigning..." : "Assign Patient"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Visited Days Calendar Dialog */}
      <Dialog open={visitedDaysDialogOpen} onClose={handleCalendarClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedPatientForVisitedDays && (
            <Typography variant="h6">
              Visit Calendar - {selectedPatientForVisitedDays.name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedPatientForVisitedDays && (
            <CalendarView patientId={selectedPatientForVisitedDays.id} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCalendarClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WeeklyAssignments;
