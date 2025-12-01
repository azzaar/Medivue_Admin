import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Fade,
  Stack,
  alpha,
  useTheme,
  LinearProgress,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  TableContainer,
} from "@mui/material";
import {
  People as PeopleIcon,
  LocalHospital as LocalHospitalIcon,
  Refresh as RefreshIcon,
  TodayOutlined as TodayIcon,
  DateRange as DateRangeIcon,
  CalendarMonth as CalendarMonthIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";
import { useDataProvider, useNotify, useGetIdentity } from "react-admin";
import type { DoctorStats, RecentPatient } from "@/types/doctor-dashboard";

type FilterMode = 'daily' | 'monthly';

const DoctorDashboard: React.FC = () => {
  const theme = useTheme();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const { data: identity } = useGetIdentity();

  // Check if doctor is commission-based
  const isCommissionBased = localStorage.getItem('isCommissionBased') === 'true';

  const [loading, setLoading] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<FilterMode>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [stats, setStats] = useState<DoctorStats>({
    totalPatients: 0,
    todayVisits: 0,
    weeklyVisits: 0,
    monthlyVisits: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingDues: 0,
  });
  const [recentPatients, setRecentPatients] = useState<RecentPatient[]>([]);


  const nf = useMemo(() => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }), []);
  const fmt = useCallback((n: number) => nf.format(n), [nf]);
  const doctorId = identity?.linkedDoctorId || localStorage.getItem('linkedDoctorId');

  const fetchDashboardData = useCallback(async () => {
    if (!doctorId) return;

    setLoading(true);
    try {
      // Determine the date range based on filter mode
      let filterYear: number;
      let filterMonth: number;
      let filterDay: number | undefined;

      if (filterMode === 'daily') {
        const dateObj = new Date(selectedDate);
        filterYear = dateObj.getFullYear();
        filterMonth = dateObj.getMonth() + 1;
        filterDay = dateObj.getDate();
      } else {
        // monthly
        const [year, month] = selectedMonth.split('-').map(Number);
        filterYear = year;
        filterMonth = month;
      }

      const today = new Date();
      const isToday = filterMode === 'daily' &&
        filterYear === today.getFullYear() &&
        filterMonth === today.getMonth() + 1 &&
        filterDay === today.getDate();

      // OPTIMIZED: Only 3 API calls - fetch all patients, period visits, and filtered patients
      const [allPatientsRes, periodRes, filteredPatientsRes] = await Promise.all([
        // 1. All patients (for lifetime stats)
        dataProvider.getList("patients/payment-summary", {
          pagination: { page: 1, perPage: 10000 },
          sort: { field: "name", order: "ASC" },
          filter: {
            mode: "patient",
            visitedDoctor: doctorId,
          },
        }),
        // 2. Filtered period data (for visits and revenue based on filter)
        dataProvider.getList("patients/payment-summary", {
          pagination: { page: 1, perPage: 10000 },
          sort: { field: "date", order: "DESC" },
          filter: {
            mode: "daily",
            visitedDoctor: doctorId,
            ...(filterDay && { day: String(filterDay) }),
            month: String(filterMonth),
            year: String(filterYear),
          },
        }),
        // 3. Patients who had visits in the selected period
        dataProvider.getList("patients/payment-summary", {
          pagination: { page: 1, perPage: 10000 },
          sort: { field: "name", order: "ASC" },
          filter: {
            mode: "patient",
            visitedDoctor: doctorId,
            ...(filterDay && { day: String(filterDay) }),
            month: String(filterMonth),
            year: String(filterYear),
          },
        }),
      ]);

      // Calculate stats from all patients (lifetime)
      const allPatients = allPatientsRes.data || [];
      const totalPatients = allPatients.length;
      const totalPaid = allPatients.reduce((sum, p) => sum + (p.totalPaid || 0), 0);
      const totalDue = allPatients.reduce((sum, p) => sum + (p.totalDue || 0), 0);

      // Calculate visits and revenue from filtered period
      const periodData = periodRes.data || [];
      const periodVisits = periodData.reduce((sum: number, d: { visits?: number }) => sum + (d.visits || 0), 0);
      const periodRevenue = periodData.reduce((sum: number, d: { totalPaid?: number }) => sum + (d.totalPaid || 0), 0);

      // Calculate weekly visits (average from period data)
      const weeklyVisits = Math.round(periodVisits / 4);

      // Get filtered patients who had visits in the selected period
      const filteredPatients = filteredPatientsRes.data || [];

      setStats({
        totalPatients,
        todayVisits: isToday ? periodVisits : 0,
        weeklyVisits,
        monthlyVisits: periodVisits,
        totalRevenue: totalPaid + totalDue,
        monthlyRevenue: periodRevenue,
        pendingDues: totalDue,
      });

      // Show filtered patients in the table
      setRecentPatients(filteredPatients.slice(0, 10));

    } catch (e) {
      const err = e as Error;
      notify(err.message || "Failed to load dashboard data", { type: "error" });
    } finally {
      setLoading(false);
    }
  }, [doctorId, filterMode, selectedMonth, selectedDate, dataProvider, notify]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Memoized stats cards configuration
  const statsCards = useMemo(() => [
    {
      label: "Total Patients",
      value: fmt(stats.totalPatients),
      icon: PeopleIcon,
      color: "#6366f1",
      bg: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
      lightBg: alpha("#6366f1", 0.1),
      subtitle: "Lifetime",
    },
    {
      label: "Today's Visits",
      value: fmt(stats.todayVisits),
      icon: TodayIcon,
      color: "#10b981",
      bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      lightBg: alpha("#10b981", 0.1),
      subtitle: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    },
    {
      label: filterMode === 'daily' ? "Selected Day Visits" : "Monthly Visits",
      value: fmt(stats.monthlyVisits),
      icon: DateRangeIcon,
      color: "#f59e0b",
      bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      lightBg: alpha("#f59e0b", 0.1),
      subtitle: filterMode === 'daily'
        ? new Date(selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : new Date(selectedMonth + '-01').toLocaleDateString("en-US", { month: "long" }),
    },
  ], [stats, filterMode, selectedDate, selectedMonth, fmt]);

  // Show message for commission-based doctors
  if (isCommissionBased) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "70vh",
          flexDirection: "column",
          gap: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          p: 3,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 8px 30px ${alpha(theme.palette.primary.main, 0.3)}`,
          }}
        >
          <LocalHospitalIcon sx={{ fontSize: 40, color: "#fff" }} />
        </Box>
        <Typography variant="h5" color="text.primary" fontWeight={700} textAlign="center">
          Commission-Based Doctor Account
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" maxWidth={600}>
          Dashboard and visit statistics are not available for commission-based doctors.
          You can access your patients, invoices, and leave management from the menu.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "70vh",
          flexDirection: "column",
          gap: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        }}
      >
        <Box sx={{ position: "relative" }}>
          <CircularProgress size={64} thickness={4} sx={{ color: theme.palette.primary.main }} />
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <LocalHospitalIcon sx={{ fontSize: 28, color: theme.palette.primary.main }} />
          </Box>
        </Box>
        <Typography variant="h6" color="text.secondary" fontWeight={500}>
          Loading your dashboard...
        </Typography>
      </Box>
    );
  }


  return (
    <Fade in timeout={600}>
      <Box
        sx={{
          p: { xs: 2, md: 3 },
          minHeight: "100vh",
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
        }}
      >
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            mb: 3,
            borderRadius: 3,
            background: alpha("#fff", 0.9),
            backdropFilter: "blur(20px)",
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.08)}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: { xs: 48, md: 56 },
                  height: { xs: 48, md: 56 },
                  borderRadius: 2.5,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                }}
              >
                <LocalHospitalIcon sx={{ color: "#fff", fontSize: { xs: 28, md: 32 } }} />
              </Box>
              <Box>
                <Typography
                  variant="h5"
                  fontWeight={700}
                  sx={{
                    fontSize: { xs: "1.25rem", md: "1.5rem" },
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Doctor Dashboard
                </Typography>
              
              </Box>
            </Box>
            <Tooltip title="Refresh Dashboard" arrow>
              <IconButton
                onClick={fetchDashboardData}
                disabled={loading}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                    transform: "rotate(180deg)",
                  },
                  transition: "all 0.5s ease",
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>

        {/* Filter Controls */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            mb: 3,
            borderRadius: 3,
            background: alpha("#fff", 0.9),
            backdropFilter: "blur(20px)",
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.05)}`,
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            flexWrap="wrap"
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterListIcon sx={{ color: theme.palette.primary.main }} />
              <Typography variant="body1" fontWeight={600} color="text.primary">
                Filter by:
              </Typography>
            </Box>

            <ToggleButtonGroup
              value={filterMode}
              exclusive
              onChange={(_, newMode) => {
                if (newMode !== null) {
                  setFilterMode(newMode);
                }
              }}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  px: 2.5,
                  py: 1,
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  textTransform: 'none',
                  '&.Mui-selected': {
                    bgcolor: theme.palette.primary.main,
                    color: '#fff',
                    '&:hover': {
                      bgcolor: theme.palette.primary.dark,
                    },
                  },
                },
              }}
            >
              <ToggleButton value="daily">
                <TodayIcon sx={{ mr: 0.5, fontSize: 18 }} />
                Daily
              </ToggleButton>
              <ToggleButton value="monthly">
                <CalendarMonthIcon sx={{ mr: 0.5, fontSize: 18 }} />
                Monthly
              </ToggleButton>
            </ToggleButtonGroup>

            {filterMode === 'daily' ? (
              <TextField
                type="date"
                size="small"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  minWidth: { xs: '100%', sm: 200 },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    mb:'10px',
                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                  },
                }}
              />
            ) : (
              <TextField
                type="month"
                size="small"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  minWidth: { xs: '100%', sm: 200 },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                                        mb:'10px',

                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                  },
                }}
              />
            )}

            <Chip
              label={
                filterMode === 'daily'
                  ? new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  : new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long'
                    })
              }
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.15),
                color: theme.palette.primary.main,
                fontWeight: 700,
                px: 1,
                fontSize: { xs: '0.75rem', sm: '0.8125rem' },
              }}
            />
          </Stack>
        </Paper>

        {/* Main Stats Cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
            },
            gap: { xs: 2, md: 3 },
            mb: 3,
          }}
        >
          {statsCards.map((kpi, index) => (
            <Fade in timeout={800 + index * 100} key={kpi.label}>
              <Card
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 3,
                  border: `1px solid ${alpha(kpi.color, 0.2)}`,
                  bgcolor: alpha("#fff", 0.95),
                  backdropFilter: "blur(10px)",
                  boxShadow: `0 4px 20px ${alpha(kpi.color, 0.12)}`,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: `0 8px 30px ${alpha(kpi.color, 0.2)}`,
                  },
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: -20,
                    right: -20,
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    background: kpi.lightBg,
                    opacity: 0.5,
                  }}
                />
                <CardContent sx={{ position: "relative", zIndex: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box
                      sx={{
                        width: { xs: 44, md: 48 },
                        height: { xs: 44, md: 48 },
                        borderRadius: 2.5,
                        background: kpi.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: `0 4px 12px ${alpha(kpi.color, 0.3)}`,
                      }}
                    >
                      <kpi.icon sx={{ color: "#fff", fontSize: { xs: 22, md: 24 } }} />
                    </Box>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} mb={1}>
                    {kpi.label}
                  </Typography>
                  <Typography variant="h4" sx={{ color: kpi.color, fontWeight: 800, mb: 1, fontSize: { xs: "1.75rem", md: "2rem" } }}>
                    {kpi.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {kpi.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            </Fade>
          ))}
        </Box>



        {/* Recent Patients Table */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            background: alpha("#fff", 0.95),
            backdropFilter: "blur(20px)",
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: `0 4px 20px ${alpha("#000", 0.04)}`,
          }}
        >
          <Stack direction="row" alignItems="center" gap={1.5} mb={3} flexWrap="wrap">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PeopleIcon sx={{ color: "#fff", fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
              {filterMode === 'daily' ? 'Patients on Selected Day' : 'Patients in Selected Month'}
            </Typography>
            <Chip
              label={`${recentPatients.length} patient${recentPatients.length !== 1 ? 's' : ''}`}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                fontWeight: 600,
              }}
            />
          </Stack>

          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    "& th": {
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      fontWeight: 700,
                      fontSize: { xs: "0.7rem", sm: "0.75rem", md: "0.8rem" },
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      py: 2,
                      borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                      whiteSpace: 'nowrap',
                    },
                  }}
                >
                  <TableCell>Patient Name</TableCell>
                  <TableCell align="right">Total Visits</TableCell>
                  <TableCell align="right">Amount Paid</TableCell>
                  <TableCell align="right">Amount Due</TableCell>
                  <TableCell align="right">Payment %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentPatients.length ? (
                  recentPatients.map((patient) => {
                    const totalFee = patient.totalPaid + patient.totalDue;
                    const paymentPercent = totalFee > 0 ? (patient.totalPaid / totalFee) * 100 : 0;
                    return (
                      <TableRow
                        key={patient.id}
                        sx={{
                          "&:hover": {
                            bgcolor: alpha(theme.palette.primary.main, 0.03),
                          },
                          transition: "all 0.2s ease",
                          cursor: "pointer",
                        }}
                      >
                        <TableCell>
                          <Stack direction="row" alignItems="center" gap={1.5}>
                            <Avatar
                              sx={{
                                width: { xs: 32, md: 36 },
                                height: { xs: 32, md: 36 },
                                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.secondary.main, 0.2)} 100%)`,
                                color: theme.palette.primary.main,
                                fontWeight: 700,
                                fontSize: { xs: "0.75rem", md: "0.85rem" },
                              }}
                            >
                              {patient.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
                              {patient.name}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={fmt(patient.totalVisits)}
                            size="small"
                            sx={{
                              bgcolor: alpha("#6366f1", 0.1),
                              color: "#6366f1",
                              fontWeight: 600,
                              fontSize: { xs: '0.7rem', md: '0.75rem' },
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600} sx={{ color: "#10b981", fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
                            {patient.totalPaid > 0 ? `₹${fmt(patient.totalPaid)}` : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{ color: patient.totalDue > 0 ? "#f59e0b" : "text.secondary", fontSize: { xs: '0.8rem', md: '0.875rem' } }}
                          >
                            {patient.totalDue > 0 ? `₹${fmt(patient.totalDue)}` : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                            <Box sx={{ width: { xs: 50, md: 60 } }}>
                              <LinearProgress
                                variant="determinate"
                                value={paymentPercent}
                                sx={{
                                  height: 6,
                                  borderRadius: 3,
                                  bgcolor: alpha("#10b981", 0.1),
                                  "& .MuiLinearProgress-bar": {
                                    background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                                    borderRadius: 3,
                                  },
                                }}
                              />
                            </Box>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ minWidth: 35, fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                              {paymentPercent.toFixed(0)}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                      <PeopleIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
                      <Typography color="text.secondary" variant="body2">
                        No patients found for the selected period.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Fade>
  );
};

export default DoctorDashboard;
