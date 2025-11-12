import React, { useState, useEffect } from "react";
import {
  useDataProvider,
  useNotify,
  Loading,
} from "react-admin";
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  TextField,
  Chip,
  Card,
  CardContent,
  Fade,
  alpha,
  useTheme,
  Autocomplete,
  IconButton,
  Tooltip,
  Avatar,
  Badge,
  Divider,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
} from "@mui/material";
import Grid from '@mui/material/GridLegacy';
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PersonIcon from "@mui/icons-material/Person";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import EventNoteIcon from "@mui/icons-material/EventNote";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import GroupIcon from "@mui/icons-material/Group";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface Doctor {
  id: string;
  name: string;
  specialization?: string;
}

interface Patient {
  id: string;
  name: string;
  phoneNumber?: string;
  age?: number;
  gender?: string;
  email?: string;
}

interface ScheduledVisit {
  _id?: string;
  doctorId: string;
  patientId: string;
  time: string;
  date: string;
  status: string;
  patientDetails?: {
    name: string;
    phoneNumber?: string;
    age?: number;
    gender?: string;
  };
}

const TIME_SLOTS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", 
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", 
  "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM"
];

const DailyVisitScheduler: React.FC = () => {
  const theme = useTheme();
  const notify = useNotify();
  const dataProvider = useDataProvider();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [linkedDoctorId, setLinkedDoctorId] = useState<string>("");

  // Doctors and Patients
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Scheduled visits for the day
  const [scheduledVisits, setScheduledVisits] = useState<ScheduledVisit[]>([]);
  const [loading, setLoading] = useState(false);

  // Add patient dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("role");
    const docId = localStorage.getItem("linkedDoctorId");
    const adminCheck = role === "admin" || role === "superAdmin";
    setIsAdmin(adminCheck);
    setLinkedDoctorId(docId && docId !== "null" ? docId : "");

    loadDoctors(adminCheck, docId);
    loadAllPatients();
  }, []);

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
      }));
      
      setDoctors(doctorsList);

      // Auto-select doctor if not admin
      if (!adminCheck && docId && docId !== "null") {
        const linkedDoc = doctorsList.find((d) => d.id === docId);
        if (linkedDoc) setSelectedDoctor(linkedDoc);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      notify("Failed to load doctors", { type: "error" });
      setDoctors([]);
    }
  };

  const loadAllPatients = async () => {
    try {
      const resp = await dataProvider.getList("patients", {
        pagination: { page: 1, perPage: 10000 },
        sort: { field: "name", order: "ASC" },
        filter: {},
      });

      const patientsList = (resp.data || []).map((p) => ({
        id: String(p.id ?? p._id),
        name: String(p.name),
        phoneNumber: p.phoneNumber ? String(p.phoneNumber) : undefined,
        age: p.age ? Number(p.age) : undefined,
        gender: p.gender ? String(p.gender) : undefined,
        email: p.email ? String(p.email) : undefined,
      }));
      
      setAllPatients(patientsList);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      notify("Failed to load patients", { type: "error" });
      setAllPatients([]);
    }
  };

  const loadScheduledVisits = async () => {
    if (!selectedDoctor || !selectedDate) return;

    setLoading(true);
    try {
      // Call the daily visit summary API
      const resp = await dataProvider.getList("visits/daily-summary", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "time", order: "ASC" },
        filter: {
          doctorId: selectedDoctor.id,
          date: selectedDate,
        },
      });

      // Map the response and populate patient details
      const visits: ScheduledVisit[] = (resp.data || []).map((visit) => {
        const patientInfo = visit.patientId || {};
        return {
          _id: String(visit.id ?? visit._id),
          doctorId: String(visit.doctorId),
          patientId: String(visit.patientId?._id ?? visit.patientId),
          time: String(visit.time),
          date: String(visit.date),
          status: String(visit.status || "scheduled"),
          patientDetails: {
            name: String(patientInfo.name || "Unknown Patient"),
            phoneNumber: patientInfo.phoneNumber,
            age: patientInfo.age,
            gender: patientInfo.gender,
          },
        };
      });

      setScheduledVisits(visits);
    } catch (err) {
      notify(err?.message || "Failed to load scheduled visits", { type: "error" });
      setScheduledVisits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScheduledVisits();
  }, [selectedDate, selectedDoctor]);

  const handleOpenAddPatient = (timeSlot: string) => {
    setSelectedTime(timeSlot);
    setSelectedPatient(null);
    setSearchQuery("");
    setAddDialogOpen(true);
  };

  const handleAssignPatient = async () => {
    if (!selectedPatient || !selectedDoctor || !selectedTime) {
      notify("Please select a patient and time", { type: "warning" });
      return;
    }

    // Check if patient already scheduled
    const alreadyScheduled = scheduledVisits.find(
      (v) => v.patientId === selectedPatient.id
    );
    if (alreadyScheduled) {
      notify("This patient is already scheduled for today", { type: "warning" });
      return;
    }

    // Check if time slot is already taken
    const slotTaken = scheduledVisits.find((v) => v.time === selectedTime);
    if (slotTaken) {
      notify("This time slot is already occupied", { type: "warning" });
      return;
    }

    setAssigning(true);
    try {
      // Call the schedule visit API
      await dataProvider.create("visits/schedule", {
        data: {
          doctorId: selectedDoctor.id,
          patientId: selectedPatient.id,
          timeSlot: selectedTime,
          date: selectedDate,
          status: "scheduled",
        },
      });

      notify(`${selectedPatient.name} scheduled for ${selectedTime}`, {
        type: "success",
      });
      
      setAddDialogOpen(false);
      
      // Reload the schedule
      await loadScheduledVisits();
    } catch (err) {
      notify(err?.message || "Failed to schedule visit", { type: "error" });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveVisit = async (visitId: string, patientName: string) => {
    if (!confirm(`Remove ${patientName} from the schedule?`)) return;

    try {
      // Call the remove visit API
      await dataProvider.delete("visits/remove", {
        id: visitId,
        previousData: {
          id: ""
        },
      });

      notify("Patient removed from schedule", { type: "success" });
      
      // Reload the schedule
      await loadScheduledVisits();
    } catch (err) {
      notify(err?.message || "Failed to remove visit", { type: "error" });
    }
  };

  const getVisitsByTime = (time: string) => {
    return scheduledVisits.filter((v) => v.time === time);
  };

  const availableTimeSlots = TIME_SLOTS.filter((slot) => {
    const visits = getVisitsByTime(slot);
    return visits.length === 0;
  });

  const filteredPatients = allPatients.filter((p) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(searchLower) ||
      p.phoneNumber?.includes(searchQuery) ||
      p.id.includes(searchQuery)
    );
  });

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  if (!isAdmin && !linkedDoctorId) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6" color="error">
          No doctor linked to your account
        </Typography>
      </Box>
    );
  }

  return (
    <Fade in timeout={600}>
      <Box
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          maxWidth: 1800,
          mx: "auto",
          minHeight: "100vh",
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.primary.main,
            0.02
          )} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
        }}
      >
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: "white",
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" gap={2}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: alpha("#fff", 0.2),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <EventNoteIcon sx={{ fontSize: 32 }} />
              </Box>
              <Box flex={1}>
                <Typography variant={isMobile ? "h5" : "h4"} fontWeight={700}>
                  Daily Patient Scheduler
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Manage patient appointments and schedules
                </Typography>
              </Box>
            </Stack>

            {/* Filters */}
            <Grid container spacing={2} alignItems="center">
              {isAdmin && (
                <Grid item xs={12} md={5}>
                  <Autocomplete
                    value={selectedDoctor}
                    onChange={(_, newValue) => setSelectedDoctor(newValue)}
                    options={doctors}
                    getOptionLabel={(option) =>
                      option.specialization
                        ? ` ${option.name} - ${option.specialization}`
                        : `${option.name}`
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Doctor *"
                        placeholder="Choose a doctor"
                        size="medium"
                        sx={{
                          bgcolor: "white",
                          borderRadius: 1,
                          "& .MuiOutlinedInput-root": {
                            "& fieldset": {
                              borderColor: "transparent",
                            },
                          },
                        }}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <LocalHospitalIcon
                                sx={{ mr: 1, color: "text.secondary" }}
                              />
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    fullWidth
                  />
                </Grid>
              )}

              <Grid item xs={12} md={isAdmin ? 4 : 8}>
                <TextField
                  type="date"
                  label="Select Date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="medium"
                  fullWidth
                  sx={{
                    bgcolor: "white",
                    borderRadius: 1,
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: "transparent",
                      },
                    },
                  }}
                  InputProps={{
                    endAdornment: isToday && (
                      <Chip
                        label="Today"
                        size="small"
                        color="success"
                        sx={{ fontWeight: 600 }}
                      />
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={isAdmin ? 3 : 4}>
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Tooltip title="Refresh schedule">
                    <IconButton
                      onClick={loadScheduledVisits}
                      disabled={loading}
                      size="large"
                      sx={{
                        bgcolor: alpha("#fff", 0.2),
                        color: "white",
                        "&:hover": {
                          bgcolor: alpha("#fff", 0.3),
                        },
                      }}
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Grid>
            </Grid>
          </Stack>
        </Paper>

        {!selectedDoctor ? (
          <Paper
            elevation={0}
            sx={{
              p: 8,
              borderRadius: 3,
              textAlign: "center",
              border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                mx: "auto",
                mb: 2,
              }}
            >
              <LocalHospitalIcon
                sx={{
                  fontSize: 48,
                  color: theme.palette.primary.main,
                }}
              />
            </Avatar>
            <Typography variant="h6" fontWeight={700} color="text.secondary" mb={1}>
              Select a Doctor to Begin
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose a doctor from the dropdown above to view and manage their schedule
            </Typography>
          </Paper>
        ) : (
          <>
            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[
                {
                  label: "Scheduled Patients",
                  value: scheduledVisits.length,
                  color: theme.palette.info.main,
                  icon: <GroupIcon />,
                },
                {
                  label: "Available Slots",
                  value: availableTimeSlots.length,
                  color: theme.palette.success.main,
                  icon: <AccessTimeIcon />,
                },
                {
                  label: "Total Time Slots",
                  value: TIME_SLOTS.length,
                  color: theme.palette.primary.main,
                  icon: <CalendarTodayIcon />,
                },
              ].map((stat, idx) => (
                <Grid item xs={12} sm={4} key={idx}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      background: `linear-gradient(135deg, ${stat.color} 0%, ${alpha(
                        stat.color,
                        0.8
                      )} 100%)`,
                      color: "white",
                      transition: "transform 0.3s",
                      "&:hover": {
                        transform: "translateY(-8px)",
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Box
                          sx={{
                            width: 56,
                            height: 56,
                            borderRadius: 2,
                            bgcolor: alpha("#fff", 0.25),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {stat.icon}
                        </Box>
                        <Box>
                          <Typography variant="h3" fontWeight={700}>
                            {stat.value}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 600 }}>
                            {stat.label}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Timetable */}
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
              <Box
                sx={{
                  p: 2.5,
                  background: `linear-gradient(135deg, ${alpha(
                    theme.palette.primary.main,
                    0.05
                  )} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                  borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Avatar
                      sx={{
                        bgcolor: theme.palette.primary.main,
                        width: 40,
                        height: 40,
                      }}
                    >
                      <AccessTimeIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Daily Schedule -  {selectedDoctor.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(selectedDate).toLocaleDateString("en-IN", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </Typography>
                    </Box>
                  </Stack>
                  <Badge badgeContent={scheduledVisits.length} color="error">
                    <Chip
                      label="Scheduled"
                      color="primary"
                      sx={{ fontWeight: 700 }}
                    />
                  </Badge>
                </Stack>
              </Box>

              {loading ? (
                <Box sx={{ p: 8, textAlign: "center" }}>
                  <Loading />
                  <Typography variant="body2" color="text.secondary" mt={2}>
                    Loading schedule...
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={2}>
                    {TIME_SLOTS.map((timeSlot) => {
                      const visits = getVisitsByTime(timeSlot);
                      const isOccupied = visits.length > 0;

                      return (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={timeSlot}>
                          <Card
                            elevation={0}
                            sx={{
                              borderRadius: 2,
                              border: `2px solid ${
                                isOccupied
                                  ? alpha(theme.palette.success.main, 0.3)
                                  : alpha(theme.palette.divider, 0.2)
                              }`,
                              bgcolor: isOccupied
                                ? alpha(theme.palette.success.main, 0.05)
                                : "white",
                              transition: "all 0.2s",
                              "&:hover": {
                                transform: "translateY(-4px)",
                                boxShadow: `0 4px 12px ${alpha(
                                  theme.palette.primary.main,
                                  0.15
                                )}`,
                              },
                            }}
                          >
                            <CardContent sx={{ p: 2 }}>
                              <Stack spacing={1.5}>
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  justifyContent="space-between"
                                >
                                  <Chip
                                    icon={<AccessTimeIcon sx={{ fontSize: 16 }} />}
                                    label={timeSlot}
                                    size="small"
                                    color={isOccupied ? "success" : "default"}
                                    sx={{ fontWeight: 700 }}
                                  />
                                  {isOccupied && (
                                    <CheckCircleIcon
                                      sx={{
                                        fontSize: 20,
                                        color: theme.palette.success.main,
                                      }}
                                    />
                                  )}
                                </Stack>

                                <Divider />

                                {isOccupied ? (
                                  visits.map((visit) => (
                                    <Box key={visit._id}>
                                      <Stack
                                        direction="row"
                                        alignItems="center"
                                        spacing={1}
                                        mb={1}
                                      >
                                        <Avatar
                                          sx={{
                                            width: 36,
                                            height: 36,
                                            bgcolor: theme.palette.success.main,
                                            fontSize: "0.9rem",
                                          }}
                                        >
                                          {visit.patientDetails?.name.charAt(0) || "P"}
                                        </Avatar>
                                        <Box flex={1}>
                                          <Typography
                                            variant="body2"
                                            fontWeight={700}
                                            sx={{
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            {visit.patientDetails?.name || "Unknown"}
                                          </Typography>
                                          {visit.patientDetails?.phoneNumber && (
                                            <Typography variant="caption" color="text.secondary">
                                              📞 {visit.patientDetails.phoneNumber}
                                            </Typography>
                                          )}
                                        </Box>
                                      </Stack>
                                      <Stack direction="row" spacing={1} alignItems="center">
                                        <Tooltip title="Remove from schedule">
                                          <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() =>
                                              handleRemoveVisit(
                                                visit._id!,
                                                visit.patientDetails?.name || "patient"
                                              )
                                            }
                                          >
                                            <DeleteIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                        <Box flex={1}>
                                          <Chip
                                            label={visit.status}
                                            size="small"
                                            color="success"
                                            sx={{ fontSize: "0.7rem" }}
                                          />
                                        </Box>
                                      </Stack>
                                    </Box>
                                  ))
                                ) : (
                                  <Button
                                    variant="outlined"
                                    fullWidth
                                    startIcon={<AddIcon />}
                                    onClick={() => handleOpenAddPatient(timeSlot)}
                                    sx={{
                                      borderStyle: "dashed",
                                      py: 2,
                                      "&:hover": {
                                        borderStyle: "solid",
                                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                                      },
                                    }}
                                  >
                                    Assign Patient
                                  </Button>
                                )}
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              )}
            </Paper>
          </>
        )}

        {/* Add Patient Dialog */}
        <Dialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
            },
          }}
        >
          <DialogTitle
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: "white",
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ bgcolor: alpha("#fff", 0.2) }}>
                  <AssignmentIndIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Assign Patient
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Time Slot: {selectedTime}
                  </Typography>
                </Box>
              </Stack>
              <IconButton
                onClick={() => setAddDialogOpen(false)}
                size="small"
                sx={{ color: "white" }}
              >
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Stack spacing={3}>
              <TextField
                placeholder="Search by name, phone, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
                }}
              />

              <Paper
                variant="outlined"
                sx={{
                  maxHeight: 400,
                  overflow: "auto",
                  borderRadius: 2,
                }}
              >
                <List sx={{ p: 0 }}>
                  {filteredPatients.length === 0 ? (
                    <ListItem>
                      <ListItemText
                        primary="No patients found"
                        secondary="Try a different search term"
                      />
                    </ListItem>
                  ) : (
                    filteredPatients.map((patient) => {
                      const alreadyScheduled = scheduledVisits.find(
                        (v) => v.patientId === patient.id
                      );
                      const isSelected = selectedPatient?.id === patient.id;

                      return (
                        <ListItemButton
                          key={patient.id}
                          selected={isSelected}
                          disabled={!!alreadyScheduled}
                          onClick={() => setSelectedPatient(patient)}
                          sx={{
                            borderBottom: `1px solid ${alpha(
                              theme.palette.divider,
                              0.1
                            )}`,
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar
                              sx={{
                                bgcolor: alreadyScheduled
                                  ? theme.palette.grey[400]
                                  : isSelected
                                  ? theme.palette.primary.main
                                  : theme.palette.info.main,
                              }}
                            >
                              <PersonIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="body1" fontWeight={600}>
                                  {patient.name}
                                </Typography>
                                {alreadyScheduled && (
                                  <Chip
                                    label="Scheduled"
                                    size="small"
                                    color="warning"
                                    sx={{ height: 20, fontSize: "0.7rem" }}
                                  />
                                )}
                              </Stack>
                            }
                            secondary={
                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                {patient.phoneNumber && (
                                  <Typography variant="caption">
                                    📞 {patient.phoneNumber}
                                  </Typography>
                                )}
                                {patient.age && (
                                  <Typography variant="caption">
                                    Age: {patient.age}
                                  </Typography>
                                )}
                                {patient.gender && (
                                  <Typography variant="caption">
                                    {patient.gender}
                                  </Typography>
                                )}
                              </Stack>
                            }
                          />
                        </ListItemButton>
                      );
                    })
                  )}
                </List>
              </Paper>
            </Stack>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2.5 }}>
            <Button
              onClick={() => setAddDialogOpen(false)}
              variant="outlined"
              size="large"
              disabled={assigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignPatient}
              variant="contained"
              size="large"
              startIcon={<CheckCircleIcon />}
              disabled={!selectedPatient || assigning}
            >
              {assigning ? "Assigning..." : `Assign to ${selectedTime}`}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Fade>
  );
};

export default DailyVisitScheduler;