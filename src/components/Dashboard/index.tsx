import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Card, CardContent, Typography, CircularProgress, TextField,
  Paper, Table, TableHead, TableRow, TableCell, TableBody, MenuItem,
  Fade, Tabs, Tab, IconButton, Tooltip, Alert, Menu, Chip, Stack,
  alpha, useTheme, LinearProgress,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PeopleIcon from "@mui/icons-material/People";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PaymentIcon from "@mui/icons-material/Payment";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import { useDataProvider, useNotify } from "react-admin";
import { useChoices } from "@/hooks/useHooks";
import Grid from '@mui/material/GridLegacy';

// ===== Types =====
interface PatientSummary {
  id: string;
  name: string;
  totalVisits: number;
  totalPaid: number;
  totalDue: number;
}
type StatusFilter = "all" | "active" | "closed";

interface Filter {
  day: string;
  month: string;
  year: string;
  q: string;
  status: StatusFilter;
  paymentType: "" | "cash" | "upi" | "card" | "bank";
  visitedDoctor: string;
}

interface Totals {
  totalFee: number;
  totalPaid: number;
  totalDue: number;
  totalVisits: number;
}

interface DailyRow {
  id: string;
  date: string;
  visits: number;
  totalPaid: number;
  totalDue: number;
  totalFee: number;
}

interface PaymentTypeRow {
  id: string;
  paymentType: string;
  totalPaid: number;
  totalDue: number;
  totalFee: number;
  count: number;
}

interface DoctorRow {
  id: string;
  visitedDoctor: string;
  totalPaid: number;
  totalDue: number;
  totalFee: number;
  count: number;
}

const months = [
  "All","January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const dayChoices: string[] = ["All", ...Array.from({ length: 31 }, (_, i) => String(i + 1))];

type TabKey = "overall" | "daily" | "byPaymentType" | "byDoctor";

const useDebounced = (value: string, delay = 350): string => {
  const [v, setV] = useState<string>(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const dataProvider = useDataProvider();
  const notify = useNotify();

  const now = new Date();
  const currentMonth = String(now.getMonth() + 1);
  const currentDay = String(now.getDate());
  const defaultYear = String(now.getFullYear());
  
  const { choices: doctorChoices } = useChoices("doctors");
  const { choices: patientChoices } = useChoices("patients");
  
  const [tab, setTab] = useState<TabKey>("overall");
  const [rowsPatients, setRowsPatients] = useState<PatientSummary[]>([]);
  const [rowsDaily, setRowsDaily] = useState<DailyRow[]>([]);
  const [rowsByPaymentType, setRowsByPaymentType] = useState<PaymentTypeRow[]>([]);
  const [rowsByDoctor, setRowsByDoctor] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState<null | HTMLElement>(null);

  const doctorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const d of doctorChoices) map[String(d.id)] = d.name;
    return map;
  }, [doctorChoices]);

  const doctorLabel = (value?: string) =>
    value ? (doctorMap[String(value)] ?? value) : "—";

  const [filter, setFilter] = useState<Filter>({
    day: currentDay,
    month: currentMonth,
    year: defaultYear,
    q: "",
    status: "all",
    paymentType: "",
    visitedDoctor: "",
  });

  const debouncedQ = useDebounced(filter.q);
  const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  const fmt = (n: number) => nf.format(n);

  const getMonthName = (monthNum: string) => {
    if (monthNum === "All") return "All Months";
    const idx = parseInt(monthNum);
    return months[idx] || monthNum;
  };

  const getDateRangeString = () => {
    const showDay = filter.day !== "All";
    const showMonth = filter.month !== "All";
    if (showDay && showMonth) return `Day ${filter.day}, ${getMonthName(filter.month)} ${filter.year}`;
    if (!showDay && showMonth) return `${getMonthName(filter.month)} ${filter.year}`;
    if (showDay && !showMonth) return `Day ${filter.day}, Year ${filter.year}`;
    return `Year ${filter.year}`;
  };

  // ===== Fetch Data =====
  useEffect(() => {
    let isMounted = true;
    const fetchForTab = async () => {
      setLoading(true);
      try {
        const monthParam = filter.month === "All" ? "" : filter.month;
        const dayParam = filter.day === "All" ? "" : filter.day;
        const commonFilter = {
          day: dayParam,
          month: monthParam,
          year: filter.year,
          q: debouncedQ,
          status: filter.status,
          paymentType: filter.paymentType,
          visitedDoctor: filter.visitedDoctor,
        };

        if (tab === "overall") {
          const res = await dataProvider.getList<PatientSummary>("patients/payment-summary", {
            pagination: { page: 1, perPage: 10000 },
            sort: { field: "name", order: "ASC" },
            filter: { mode: "patient", ...commonFilter },
          });
          if (isMounted) setRowsPatients(res.data ?? []);
        } else if (tab === "daily") {
          const res = await dataProvider.getList<DailyRow>("patients/payment-summary", {
            pagination: { page: 1, perPage: 10000 },
            sort: { field: "date", order: "ASC" },
            filter: { mode: "daily", ...commonFilter },
          });
          if (isMounted) setRowsDaily(res.data ?? []);
        } else if (tab === "byPaymentType") {
          const res = await dataProvider.getList<PaymentTypeRow>("patients/payment-summary", {
            pagination: { page: 1, perPage: 10000 },
            sort: { field: "paymentType", order: "ASC" },
            filter: { mode: "byPaymentType", ...commonFilter },
          });
          if (isMounted) setRowsByPaymentType(res.data ?? []);
        } else {
          const res = await dataProvider.getList<DoctorRow>("patients/payment-summary", {
            pagination: { page: 1, perPage: 10000 },
            sort: { field: "visitedDoctor", order: "ASC" },
            filter: { mode: "byDoctor", ...commonFilter },
          });
          if (isMounted) setRowsByDoctor(res.data ?? []);
        }
      } catch (e) {
        const err = e as Error;
        notify(err.message || "Failed to load summary", { type: "error" });
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchForTab();
    return () => {
      isMounted = false;
    };
  }, [
    dataProvider,
    notify,
    tab,
    filter.day,
    filter.month,
    filter.year,
    debouncedQ,
    filter.status,
    filter.paymentType,
    filter.visitedDoctor,
  ]);

  // ===== Overall Totals =====
  const overall: Totals = useMemo(() => {
    const totalPaid = rowsPatients.reduce((s, r) => s + (r.totalPaid || 0), 0);
    const totalDue = rowsPatients.reduce((s, r) => s + (r.totalDue || 0), 0);
    const totalFee = totalPaid + totalDue;
    const totalVisits = rowsPatients.reduce((s, r) => s + (r.totalVisits || 0), 0);
    return { totalFee, totalPaid, totalDue, totalVisits };
  }, [rowsPatients]);

  // ===== CSV =====
  const toCSV = (arr: string[]) => arr.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");

  const filenameSuffix = `${filter.day === "All" ? "AllDays" : `day-${filter.day}`}-${filter.month === "All" ? "AllMonths" : `m-${filter.month}`}-${filter.year}`;

  const downloadCurrentTab = () => {
    let csv = "";
    const dateRange = getDateRangeString();
    
    if (tab === "overall") {
      csv += `Patient Payment Summary - ${dateRange}\n\n`;
      csv += toCSV(["Patient", "Visits", "Total Fee", "Paid", "Due", "Payment %"]) + "\n";
      rowsPatients.forEach((r) => {
        const totalFee = r.totalPaid + r.totalDue;
        const paymentPercent = totalFee > 0 ? ((r.totalPaid / totalFee) * 100).toFixed(1) : "0";
        csv += toCSV([
          r.name,
          String(r.totalVisits),
          String(totalFee),
          String(r.totalPaid),
          String(r.totalDue),
          paymentPercent + "%"
        ]) + "\n";
      });
      csv += "\n" + toCSV(["Total", String(overall.totalVisits), String(overall.totalFee), String(overall.totalPaid), String(overall.totalDue), ""]) + "\n";
    } else if (tab === "daily") {
      csv += `Daily Payment Summary - ${dateRange}\n\n`;
      csv += toCSV(["Date", "Visits", "Total Fee", "Paid", "Due"]) + "\n";
      rowsDaily.forEach((r) =>
        (csv += toCSV([
          new Date(r.date).toLocaleDateString(),
          String(r.visits),
          String(r.totalFee),
          String(r.totalPaid),
          String(r.totalDue),
        ]) + "\n")
      );
    } else if (tab === "byPaymentType") {
      csv += `Payment Type Summary - ${dateRange}\n\n`;
      csv += toCSV(["Payment Type", "Count", "Total Fee", "Paid", "Due"]) + "\n";
      rowsByPaymentType.forEach((r) =>
        (csv += toCSV([
          r.paymentType || "Not Specified",
          String(r.count),
          String(r.totalFee),
          String(r.totalPaid),
          String(r.totalDue)
        ]) + "\n")
      );
    } else {
      csv += `Doctor Visit Summary - ${dateRange}\n\n`;
      csv += toCSV(["Doctor", "Visit Count", "Total Fee", "Paid", "Due"]) + "\n";
      rowsByDoctor.forEach((r) =>
        (csv += toCSV([
          doctorLabel(r.visitedDoctor) || "Not Specified",
          String(r.count),
          String(r.totalFee),
          String(r.totalPaid),
          String(r.totalDue)
        ]) + "\n")
      );
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filename = `payment-summary-${tab}-${filenameSuffix}.csv`;
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadMenuAnchor(null);
  };

  const downloadComprehensiveReport = () => {
    let csv = `Comprehensive Payment Report - ${getDateRangeString()}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    csv += "=== SUMMARY ===\n";
    csv += toCSV(["Total Visits", "Total Fee", "Total Paid", "Total Due", "Collection %"]) + "\n";
    const collectionPercent = overall.totalFee > 0 ? ((overall.totalPaid / overall.totalFee) * 100).toFixed(1) : "0";
    csv += toCSV([
      String(overall.totalVisits),
      String(overall.totalFee),
      String(overall.totalPaid),
      String(overall.totalDue),
      collectionPercent + "%"
    ]) + "\n\n";

    csv += "=== BY PATIENT ===\n";
    csv += toCSV(["Patient", "Visits", "Total Fee", "Paid", "Due", "Payment %"]) + "\n";
    rowsPatients.forEach((r) => {
      const totalFee = r.totalPaid + r.totalDue;
      const paymentPercent = totalFee > 0 ? ((r.totalPaid / totalFee) * 100).toFixed(1) : "0";
      csv += toCSV([
        r.name,
        String(r.totalVisits),
        String(totalFee),
        String(r.totalPaid),
        String(r.totalDue),
        paymentPercent + "%"
      ]) + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comprehensive-report-${filenameSuffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadMenuAnchor(null);
  };

  const downloadDoctorVisitReport = () => {
    let csv = `Doctor Visit Report - ${getDateRangeString()}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    csv += toCSV(["Doctor", "Visit Count", "Total Fee", "Total Paid", "Total Due", "Avg Fee/Visit"]) + "\n";
    rowsByDoctor.forEach((r) => {
      const avgFee = r.count > 0 ? (r.totalFee / r.count).toFixed(0) : "0";
      csv += toCSV([
        doctorLabel(r.visitedDoctor) || "Not Specified",
        String(r.count),
        String(r.totalFee),
        String(r.totalPaid),
        String(r.totalDue),
        String(avgFee)
      ]) + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `doctor-visit-report-${filenameSuffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadMenuAnchor(null);
  };

  // ===== Loading =====
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
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`
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
          Loading payment data...
        </Typography>
      </Box>
    );
  }

  const collectionRate = overall.totalFee > 0 ? (overall.totalPaid / overall.totalFee) * 100 : 0;

  // ===== Layout =====
  return (
    <Fade in timeout={600}>
      <Box 
        sx={{ 
          p: { xs: 2, md: 4 },
          minHeight: "100vh",
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
        }}
      >
        {/* Glassmorphic Header */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 4,
            background: alpha("#fff", 0.8),
            backdropFilter: "blur(20px)",
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.08)}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                }}
              >
                <LocalHospitalIcon sx={{ color: "#fff", fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700} sx={{ 
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  Payment Dashboard
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                  <CalendarTodayIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    {getDateRangeString()}
                  </Typography>
                </Stack>
              </Box>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Download Reports" arrow>
                <IconButton 
                  onClick={(e) => setDownloadMenuAnchor(e.currentTarget)} 
                  sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    "&:hover": { 
                      bgcolor: alpha(theme.palette.primary.main, 0.2),
                      transform: "translateY(-2px)",
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  <DownloadIcon />
                  <KeyboardArrowDownIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={downloadMenuAnchor}
                open={Boolean(downloadMenuAnchor)}
                onClose={() => setDownloadMenuAnchor(null)}
                PaperProps={{
                  sx: {
                    borderRadius: 2,
                    mt: 1,
                    boxShadow: `0 8px 24px ${alpha("#000", 0.12)}`,
                  }
                }}
              >
                <MenuItem onClick={downloadCurrentTab} sx={{ py: 1.5, px: 2 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>Current Tab</Typography>
                    <Typography variant="caption" color="text.secondary">Download {tab} view</Typography>
                  </Box>
                </MenuItem>
                <MenuItem onClick={downloadComprehensiveReport} sx={{ py: 1.5, px: 2 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>Comprehensive Report</Typography>
                    <Typography variant="caption" color="text.secondary">Full patient summary</Typography>
                  </Box>
                </MenuItem>
                <MenuItem onClick={downloadDoctorVisitReport} sx={{ py: 1.5, px: 2 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>Doctor Visit Report</Typography>
                    <Typography variant="caption" color="text.secondary">Doctor statistics</Typography>
                  </Box>
                </MenuItem>
              </Menu>
              <Tooltip title="Reset Filters" arrow>
                <IconButton
                  onClick={() => {
                    setFilter({
                      day: currentDay,
                      month: currentMonth,
                      year: defaultYear,
                      q: "",
                      status: "all",
                      paymentType: "",
                      visitedDoctor: "",
                    });
                  }}
                  sx={{ 
                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                    "&:hover": { 
                      bgcolor: alpha(theme.palette.secondary.main, 0.2),
                      transform: "rotate(180deg)",
                    },
                    transition: "all 0.5s ease",
                  }}
                >
                  <RestartAltIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </Paper>

        {/* Filter Panel */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 4,
            background: alpha("#fff", 0.7),
            backdropFilter: "blur(10px)",
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} mb={2} color="text.secondary">
            FILTERS
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(7, 1fr)",
              },
              gap: 2,
              marginBottom:'1rem'
            }}
            
          >
            <TextField
                select
                label="Day"
                size="small"
                fullWidth
                value={filter.day}
                onChange={(e) => setFilter({ ...filter, day: String(e.target.value) })}
                sx={{ bgcolor: "#fff" }}
              >
                {dayChoices.map((d) => (
                  <MenuItem key={d} value={d}>{d === "All" ? "All Days" : `Day ${d}`}</MenuItem>
                ))}
              </TextField>
            
            <TextField
                select
                label="Month"
                size="small"
                fullWidth
                value={filter.month}
                onChange={(e) => setFilter({ ...filter, month: String(e.target.value) })}
                sx={{ bgcolor: "#fff" }}
              >
                {months.map((m, i) => (
                  <MenuItem key={m} value={i === 0 ? "All" : String(i)}>{m}</MenuItem>
                ))}
              </TextField>

            <TextField
                label="Year"
                type="number"
                size="small"
                fullWidth
                value={filter.year}
                onChange={(e) => setFilter({ ...filter, year: String(e.target.value) })}
                sx={{ bgcolor: "#fff" }}
              />
            </Box>
            <Grid item xs={12} sm={6} md={3} lg={1.7} className="flex flex-col gap-2 mt-2">
              <TextField
                select
                label="Doctor"
                size="small"
                fullWidth
                value={filter.visitedDoctor}
                onChange={(e) => setFilter({ ...filter, visitedDoctor: String(e.target.value) })}
                sx={{ bgcolor: "#fff" }}
              >
                <MenuItem value="">All Doctors</MenuItem>
                {doctorChoices.map(d => (
                  <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                ))}
              </TextField>

            <TextField
                select
                label="Patient"
                size="small"
                fullWidth
                value={filter.q}
                onChange={(e) => setFilter({ ...filter, q: String(e.target.value) })}
                sx={{ bgcolor: "#fff" }}
              >
                <MenuItem value="">All Patients</MenuItem>
                {patientChoices.map(p => (
                  <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>
                ))}
              </TextField>

            <TextField
                select
                label="Status"
                size="small"
                fullWidth
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value as StatusFilter })}
                sx={{ bgcolor: "#fff" }}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </TextField>

            <TextField
                select
                label="Payment Type"
                size="small"
                fullWidth
                value={filter.paymentType}
                onChange={(e) => setFilter({ ...filter, paymentType: e.target.value as Filter["paymentType"] })}
                sx={{ bgcolor: "#fff" }}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="upi">UPI</MenuItem>
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="card">Card</MenuItem>
                <MenuItem value="bank">Bank Transfer</MenuItem>
              </TextField>
            </Grid>
            
          </Paper>

        {/* Active Filters Alert */}
        {(filter.visitedDoctor || filter.q || filter.status !== "all" || filter.paymentType || filter.day !== currentDay || filter.month !== currentMonth) && (
          <Fade in>
            <Alert 
              severity="info" 
              sx={{ 
                mb: 3, 
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                bgcolor: alpha(theme.palette.info.main, 0.05),
              }}
            >
              <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                <Typography variant="body2" fontWeight={600}>Active Filters:</Typography>
                {filter.day !== "All" && <Chip label={`Day: ${filter.day}`} size="small" color="info" variant="outlined" />}
                {filter.month !== "All" && <Chip label={`${getMonthName(filter.month)}`} size="small" color="info" variant="outlined" />}
                {filter.visitedDoctor && <Chip label={`Doctor: ${doctorLabel(filter.visitedDoctor)}`} size="small" color="info" variant="outlined" />}
                {filter.q && <Chip label={`Patient: ${filter.q}`} size="small" color="info" variant="outlined" />}
                {filter.status !== "all" && <Chip label={`Status: ${filter.status}`} size="small" color="info" variant="outlined" />}
                {filter.paymentType && <Chip label={`${filter.paymentType.toUpperCase()}`} size="small" color="info" variant="outlined" />}
              </Stack>
            </Alert>
          </Fade>
        )}

        {/* KPI Cards */}
        {tab === "overall" && (
          <Fade in timeout={800}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  lg: "repeat(4, 1fr)",
                },
                gap: 3,
                mb: 3,
              }}
            >
              {[
                { 
                  label: "Total Revenue", 
                  value: fmt(overall.totalFee), 
                  icon: TrendingUpIcon,
                  color: "#6366f1", 
                  bg: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  lightBg: alpha("#6366f1", 0.1),
                },
                { 
                  label: "Total Collected", 
                  value: fmt(overall.totalPaid), 
                  icon: PaymentIcon,
                  color: "#10b981", 
                  bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  lightBg: alpha("#10b981", 0.1),
                },
                { 
                  label: "Outstanding Due", 
                  value: fmt(overall.totalDue), 
                  icon: PaymentIcon,
                  color: "#f59e0b", 
                  bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  lightBg: alpha("#f59e0b", 0.1),
                },
                { 
                  label: "Total Visits", 
                  value: fmt(overall.totalVisits), 
                  icon: PeopleIcon,
                  color: "#ec4899", 
                  bg: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                  lightBg: alpha("#ec4899", 0.1),
                },
              ].map((kpi, index) => (
                <Grid item xs={12} sm={6} lg={3} key={kpi.label}>
                  <Fade in timeout={800 + index * 100}>
                    <Card
                      sx={{
                        position: "relative",
                        overflow: "hidden",
                        borderRadius: 4,
                        border: `1px solid ${alpha(kpi.color, 0.2)}`,
                        bgcolor: alpha("#fff", 0.9),
                        backdropFilter: "blur(10px)",
                        boxShadow: `0 4px 20px ${alpha(kpi.color, 0.15)}`,
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "translateY(-8px)",
                          boxShadow: `0 12px 40px ${alpha(kpi.color, 0.25)}`,
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
                              width: 48,
                              height: 48,
                              borderRadius: 2.5,
                              background: kpi.bg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: `0 4px 12px ${alpha(kpi.color, 0.3)}`,
                            }}
                          >
                            <kpi.icon sx={{ color: "#fff", fontSize: 24 }} />
                          </Box>
                          <Box
                            sx={{
                              bgcolor: kpi.lightBg,
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 2,
                            }}
                          >
                            <Typography variant="caption" sx={{ color: kpi.color, fontWeight: 700 }}>
                              {index === 0 ? "TOTAL" : index === 1 ? "PAID" : index === 2 ? "DUE" : "COUNT"}
                            </Typography>
                          </Box>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" fontWeight={500} mb={1}>
                          {kpi.label}
                        </Typography>
                        <Typography variant="h4" sx={{ color: kpi.color, fontWeight: 800, mb: 1 }}>
                          ₹{kpi.value}
                        </Typography>
                        {index === 1 && (
                          <Box>
                            <Stack direction="row" justifyContent="space-between" mb={0.5}>
                              <Typography variant="caption" color="text.secondary">
                                Collection Rate
                              </Typography>
                              <Typography variant="caption" fontWeight={700} sx={{ color: kpi.color }}>
                                {collectionRate.toFixed(1)}%
                              </Typography>
                            </Stack>
                            <LinearProgress 
                              variant="determinate" 
                              value={collectionRate} 
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: alpha(kpi.color, 0.1),
                                "& .MuiLinearProgress-bar": {
                                  background: kpi.bg,
                                  borderRadius: 3,
                                }
                              }}
                            />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Fade>
                </Grid>
              ))}
            </Box>
          </Fade>
        )}

        {/* Tabs */}
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 4,
            overflow: "hidden",
            background: alpha("#fff", 0.7),
            backdropFilter: "blur(10px)",
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Tabs 
            value={tab} 
            onChange={(_, v: TabKey) => setTab(v)}
            sx={{
              "& .MuiTab-root": {
                py: 2.5,
                textTransform: "none",
                fontSize: "0.95rem",
                fontWeight: 600,
                minHeight: 64,
                transition: "all 0.3s ease",
              },
              "& .Mui-selected": {
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
              },
              "& .MuiTabs-indicator": {
                height: 3,
                borderRadius: "3px 3px 0 0",
                background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              },
            }}
          >
            <Tab 
              icon={<PeopleIcon />} 
              iconPosition="start" 
              label="By Patient" 
              value="overall" 
            />
            <Tab 
              icon={<CalendarTodayIcon />} 
              iconPosition="start" 
              label="By Day" 
              value="daily" 
            />
            <Tab 
              icon={<PaymentIcon />} 
              iconPosition="start" 
              label="By Payment Type" 
              value="byPaymentType" 
            />
            <Tab 
              icon={<LocalHospitalIcon />} 
              iconPosition="start" 
              label="By Doctor" 
              value="byDoctor" 
            />
          </Tabs>
        </Paper>

        {/* Content */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            borderRadius: 4,
            background: alpha("#fff", 0.9),
            backdropFilter: "blur(20px)",
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: `0 8px 32px ${alpha("#000", 0.04)}`,
          }}
        >
          {tab === "overall" && (
            <Fade in timeout={400}>
              <Box>
                <Stack direction="row" alignItems="center" gap={1.5} mb={3}>
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
                  <Typography variant="h6" fontWeight={700}>Patient Payment Summary</Typography>
                  <Chip 
                    label={`${rowsPatients.length} patients`} 
                    size="small" 
                    sx={{ 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                    }} 
                  />
                </Stack>
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ 
                        "& th": { 
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          py: 2,
                          borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        } 
                      }}>
                        <TableCell>Patient Name</TableCell>
                        <TableCell align="right">Total Visits</TableCell>
                        <TableCell align="right">Amount Paid</TableCell>
                        <TableCell align="right">Amount Due</TableCell>
                        <TableCell align="right">Payment %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rowsPatients.length ? (
                        rowsPatients.map((r) => {
                          const totalFee = r.totalPaid + r.totalDue;
                          const paymentPercent = totalFee > 0 ? (r.totalPaid / totalFee) * 100 : 0;
                          return (
                            <TableRow 
                              key={r.id} 
                              sx={{
                                "&:hover": { 
                                  bgcolor: alpha(theme.palette.primary.main, 0.03),
                                  transform: "scale(1.01)",
                                },
                                transition: "all 0.2s ease",
                                cursor: "pointer",
                              }}
                            >
                              <TableCell>
                                <Stack direction="row" alignItems="center" gap={1.5}>
                                  <Box
                                    sx={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: 2,
                                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.secondary.main, 0.2)} 100%)`,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: 700,
                                      color: theme.palette.primary.main,
                                      fontSize: "0.85rem",
                                    }}
                                  >
                                    {r.name.charAt(0).toUpperCase()}
                                  </Box>
                                  <Typography variant="body2" fontWeight={600}>
                                    {r.name}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell align="right">
                                <Chip 
                                  label={fmt(r.totalVisits)} 
                                  size="small" 
                                  sx={{ 
                                    bgcolor: alpha("#6366f1", 0.1),
                                    color: "#6366f1",
                                    fontWeight: 600,
                                  }} 
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight={600} sx={{ color: "#10b981" }}>
                                  {r.totalPaid > 0 ? `₹${fmt(r.totalPaid)}` : "—"}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography 
                                  variant="body2" 
                                  fontWeight={600} 
                                  sx={{ color: r.totalDue > 0 ? "#f59e0b" : "text.secondary" }}
                                >
                                  {r.totalDue > 0 ? `₹${fmt(r.totalDue)}` : "—"}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                                  <Box sx={{ width: 60 }}>
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
                                        }
                                      }}
                                    />
                                  </Box>
                                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ minWidth: 40 }}>
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
                              No patient records found for selected filters.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            </Fade>
          )}

          {tab === "daily" && (
            <Fade in timeout={400}>
              <Box>
                <Stack direction="row" alignItems="center" gap={1.5} mb={3}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CalendarTodayIcon sx={{ color: "#fff", fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>Daily Payment Summary</Typography>
                  <Chip 
                    label={`${rowsDaily.length} days`} 
                    size="small" 
                    sx={{ 
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                      color: theme.palette.info.main,
                      fontWeight: 600,
                    }} 
                  />
                </Stack>
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ 
                        "& th": { 
                          bgcolor: alpha(theme.palette.info.main, 0.05),
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          py: 2,
                          borderBottom: `2px solid ${alpha(theme.palette.info.main, 0.1)}`,
                        } 
                      }}>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Visits</TableCell>
                        <TableCell align="right">Total Fee</TableCell>
                        <TableCell align="right">Amount Paid</TableCell>
                        <TableCell align="right">Amount Due</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rowsDaily.length ? (
                        rowsDaily.map((r) => (
                          <TableRow 
                            key={r.id}
                            sx={{
                              "&:hover": { 
                                bgcolor: alpha(theme.palette.info.main, 0.03),
                              },
                              transition: "all 0.2s ease",
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {new Date(r.date).toLocaleDateString("en-IN", { 
                                  day: "numeric", 
                                  month: "short", 
                                  year: "numeric" 
                                })}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={fmt(r.visits)} 
                                size="small" 
                                sx={{ 
                                  bgcolor: alpha("#6366f1", 0.1),
                                  color: "#6366f1",
                                  fontWeight: 600,
                                }} 
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600}>
                                ₹{fmt(r.totalFee)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600} sx={{ color: "#10b981" }}>
                                {r.totalPaid > 0 ? `₹${fmt(r.totalPaid)}` : "—"}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography 
                                variant="body2" 
                                fontWeight={600} 
                                sx={{ color: r.totalDue > 0 ? "#f59e0b" : "text.secondary" }}
                              >
                                {r.totalDue > 0 ? `₹${fmt(r.totalDue)}` : "—"}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                            <CalendarTodayIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
                            <Typography color="text.secondary" variant="body2">
                              No daily records for selected filters.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            </Fade>
          )}

          {tab === "byPaymentType" && (
            <Fade in timeout={400}>
              <Box>
                <Stack direction="row" alignItems="center" gap={1.5} mb={3}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <PaymentIcon sx={{ color: "#fff", fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>Payment Type Summary</Typography>
                  <Chip 
                    label={`${rowsByPaymentType.length} types`} 
                    size="small" 
                    sx={{ 
                      bgcolor: alpha(theme.palette.success.main, 0.1),
                      color: theme.palette.success.main,
                      fontWeight: 600,
                    }} 
                  />
                </Stack>
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ 
                        "& th": { 
                          bgcolor: alpha(theme.palette.success.main, 0.05),
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          py: 2,
                          borderBottom: `2px solid ${alpha(theme.palette.success.main, 0.1)}`,
                        } 
                      }}>
                        <TableCell>Payment Type</TableCell>
                        <TableCell align="right">Transaction Count</TableCell>
                        <TableCell align="right">Total Fee</TableCell>
                        <TableCell align="right">Amount Paid</TableCell>
                        <TableCell align="right">Amount Due</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rowsByPaymentType.length ? (
                        rowsByPaymentType.map((r) => (
                          <TableRow 
                            key={r.id}
                            sx={{
                              "&:hover": { 
                                bgcolor: alpha(theme.palette.success.main, 0.03),
                              },
                              transition: "all 0.2s ease",
                            }}
                          >
                            <TableCell>
                              <Chip 
                                label={r.paymentType || "Not Specified"} 
                                size="small"
                                sx={{ 
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  bgcolor: alpha(theme.palette.success.main, 0.1),
                                  color: theme.palette.success.dark,
                                }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={fmt(r.count)} 
                                size="small" 
                                sx={{ 
                                  bgcolor: alpha("#6366f1", 0.1),
                                  color: "#6366f1",
                                  fontWeight: 600,
                                }} 
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600}>
                                ₹{fmt(r.totalFee)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600} sx={{ color: "#10b981" }}>
                                {r.totalPaid > 0 ? `₹${fmt(r.totalPaid)}` : "—"}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography 
                                variant="body2" 
                                fontWeight={600} 
                                sx={{ color: r.totalDue > 0 ? "#f59e0b" : "text.secondary" }}
                              >
                                {r.totalDue > 0 ? `₹${fmt(r.totalDue)}` : "—"}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                            <PaymentIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
                            <Typography color="text.secondary" variant="body2">
                              No payment type records for selected filters.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            </Fade>
          )}

          {tab === "byDoctor" && (
            <Fade in timeout={400}>
              <Box>
                <Stack direction="row" alignItems="center" gap={1.5} mb={3}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <LocalHospitalIcon sx={{ color: "#fff", fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>Doctor Visit Summary</Typography>
                  <Chip 
                    label={`${rowsByDoctor.length} doctors`} 
                    size="small" 
                    sx={{ 
                      bgcolor: alpha(theme.palette.secondary.main, 0.1),
                      color: theme.palette.secondary.main,
                      fontWeight: 600,
                    }} 
                  />
                </Stack>
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ 
                        "& th": { 
                          bgcolor: alpha(theme.palette.secondary.main, 0.05),
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          py: 2,
                          borderBottom: `2px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                        } 
                      }}>
                        <TableCell>Doctor Name</TableCell>
                        <TableCell align="right">Visit Count</TableCell>
                        <TableCell align="right">Total Fee</TableCell>
                        <TableCell align="right">Amount Paid</TableCell>
                        <TableCell align="right">Amount Due</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rowsByDoctor.length ? (
                        rowsByDoctor.map((r) => (
                          <TableRow 
                            key={r.id}
                            sx={{
                              "&:hover": { 
                                bgcolor: alpha(theme.palette.secondary.main, 0.03),
                              },
                              transition: "all 0.2s ease",
                            }}
                          >
                            <TableCell>
                              <Stack direction="row" alignItems="center" gap={1.5}>
                                <Box
                                  sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 2,
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.2)} 0%, ${alpha(theme.palette.secondary.dark, 0.2)} 100%)`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <LocalHospitalIcon sx={{ fontSize: 18, color: theme.palette.secondary.main }} />
                                </Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {doctorLabel(r.visitedDoctor)}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={fmt(r.count)} 
                                size="small" 
                                sx={{ 
                                  bgcolor: alpha("#6366f1", 0.1),
                                  color: "#6366f1",
                                  fontWeight: 600,
                                }} 
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600}>
                                ₹{fmt(r.totalFee)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600} sx={{ color: "#10b981" }}>
                                {r.totalPaid > 0 ? `₹${fmt(r.totalPaid)}` : "—"}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography 
                                variant="body2" 
                                fontWeight={600} 
                                sx={{ color: r.totalDue > 0 ? "#f59e0b" : "text.secondary" }}
                              >
                                {r.totalDue > 0 ? `₹${fmt(r.totalDue)}` : "—"}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                            <LocalHospitalIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
                            <Typography color="text.secondary" variant="body2">
                              No doctor records for selected filters.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            </Fade>
          )}
        </Paper>
      </Box>
    </Fade>
  );
};

export default Dashboard;