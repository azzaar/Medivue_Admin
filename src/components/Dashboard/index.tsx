import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Card, CardContent, Typography, Divider, CircularProgress, TextField,
  Paper, Table, TableHead, TableRow, TableCell, TableBody, MenuItem,
  Fade, Tabs, Tab, IconButton, Tooltip, Alert, Menu
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useDataProvider, useNotify } from "react-admin";
import { useChoices } from "@/hooks/useHooks";

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
  const dataProvider = useDataProvider();
  const notify = useNotify();

  const now = new Date();
  const currentMonth = String(now.getMonth() + 1); // 1-12
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
    month: currentMonth, // Default to current month
    year: defaultYear,
    q: "",
    status: "all",
    paymentType: "",
    visitedDoctor: "",
  });

  const debouncedQ = useDebounced(filter.q);
  const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  const fmt = (n: number) => nf.format(n);

  // Helper to get month name
  const getMonthName = (monthNum: string) => {
    if (monthNum === "All") return "All Months";
    const idx = parseInt(monthNum);
    return months[idx] || monthNum;
  };

  // Helper to get date range string
  const getDateRangeString = () => {
    if (filter.month === "All") {
      return `Year ${filter.year}`;
    }
    return `${getMonthName(filter.month)} ${filter.year}`;
  };

  // ===== Fetch Data =====
  useEffect(() => {
    let isMounted = true;
    const fetchForTab = async () => {
      setLoading(true);
      try {
        const monthParam = filter.month === "All" ? "" : filter.month;
        const commonFilter = {
          month: monthParam,
          year: filter.year,
          q: debouncedQ,
          status: filter.status,
          paymentType: filter.paymentType,
          visitedDoctor: filter.visitedDoctor,
        };

        if (tab === "overall") {
          // overall by patient
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

  // ===== Enhanced CSV Downloads =====
  const toCSV = (arr: string[]) => arr.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");

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
          fmt(r.totalVisits),
          fmt(totalFee),
          fmt(r.totalPaid),
          fmt(r.totalDue),
          paymentPercent + "%"
        ]) + "\n";
      });
      csv += "\n" + toCSV(["Total", fmt(overall.totalVisits), fmt(overall.totalFee), fmt(overall.totalPaid), fmt(overall.totalDue), ""]) + "\n";
    } else if (tab === "daily") {
      csv += `Daily Payment Summary - ${dateRange}\n\n`;
      csv += toCSV(["Date", "Visits", "Total Fee", "Paid", "Due"]) + "\n";
      rowsDaily.forEach((r) =>
        (csv += toCSV([
          new Date(r.date).toLocaleDateString(),
          fmt(r.visits),
          fmt(r.totalFee),
          fmt(r.totalPaid),
          fmt(r.totalDue),
        ]) + "\n")
      );
    } else if (tab === "byPaymentType") {
      csv += `Payment Type Summary - ${dateRange}\n\n`;
      csv += toCSV(["Payment Type", "Count", "Total Fee", "Paid", "Due"]) + "\n";
      rowsByPaymentType.forEach((r) =>
        (csv += toCSV([
          r.paymentType || "Not Specified",
          String(r.count),
          fmt(r.totalFee),
          fmt(r.totalPaid),
          fmt(r.totalDue)
        ]) + "\n")
      );
    } else {
      csv += `Doctor Visit Summary - ${dateRange}\n\n`;
      csv += toCSV(["Doctor", "Visit Count", "Total Fee", "Paid", "Due"]) + "\n";
      rowsByDoctor.forEach((r) =>
        (csv += toCSV([
          doctorLabel(r.visitedDoctor) || "Not Specified",
          String(r.count),
          fmt(r.totalFee),
          fmt(r.totalPaid),
          fmt(r.totalDue)
        ]) + "\n")
      );
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filename = `payment-summary-${tab}-${filter.month}-${filter.year}.csv`;
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadMenuAnchor(null);
  };

  const downloadComprehensiveReport = () => {
    let csv = `Comprehensive Payment Report - ${getDateRangeString()}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    // Summary Section
    csv += "=== SUMMARY ===\n";
    csv += toCSV(["Total Visits", "Total Fee", "Total Paid", "Total Due", "Collection %"]) + "\n";
    const collectionPercent = overall.totalFee > 0 ? ((overall.totalPaid / overall.totalFee) * 100).toFixed(1) : "0";
    csv += toCSV([
      fmt(overall.totalVisits),
      fmt(overall.totalFee),
      fmt(overall.totalPaid),
      fmt(overall.totalDue),
      collectionPercent + "%"
    ]) + "\n\n";

    // By Patient
    csv += "=== BY PATIENT ===\n";
    csv += toCSV(["Patient", "Visits", "Total Fee", "Paid", "Due", "Payment %"]) + "\n";
    rowsPatients.forEach((r) => {
      const totalFee = r.totalPaid + r.totalDue;
      const paymentPercent = totalFee > 0 ? ((r.totalPaid / totalFee) * 100).toFixed(1) : "0";
      csv += toCSV([
        r.name,
        fmt(r.totalVisits),
        fmt(totalFee),
        fmt(r.totalPaid),
        fmt(r.totalDue),
        paymentPercent + "%"
      ]) + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comprehensive-report-${filter.month}-${filter.year}.csv`;
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
        fmt(r.totalFee),
        fmt(r.totalPaid),
        fmt(r.totalDue),
        fmt(Number(avgFee))
      ]) + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `doctor-visit-report-${filter.month}-${filter.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadMenuAnchor(null);
  };

  // ===== Loading =====
  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh", flexDirection: "column", gap: 2 }}>
        <CircularProgress size={48} />
        <Typography color="text.secondary">Loading payment data...</Typography>
      </Box>
    );
  }

  // ===== Layout =====
  return (
    <Fade in timeout={400}>
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>🩺 Payment Dashboard</Typography>
          </Box>
          <Box>
            <Tooltip title="Download Reports">
              <IconButton 
                onClick={(e) => setDownloadMenuAnchor(e.currentTarget)} 
                color="primary" 
                size="large"
                sx={{ bgcolor: "primary.50", "&:hover": { bgcolor: "primary.100" } }}
              >
                <DownloadIcon />
                <KeyboardArrowDownIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={downloadMenuAnchor}
              open={Boolean(downloadMenuAnchor)}
              onClose={() => setDownloadMenuAnchor(null)}
            >
              <MenuItem onClick={downloadCurrentTab}>
                <Box sx={{ display: "flex", flexDirection: "column", py: 0.5 }}>
                  <Typography variant="body2" fontWeight={600}>Current Tab</Typography>
                  <Typography variant="caption" color="text.secondary">Download {tab} view</Typography>
                </Box>
              </MenuItem>
              <MenuItem onClick={downloadComprehensiveReport}>
                <Box sx={{ display: "flex", flexDirection: "column", py: 0.5 }}>
                  <Typography variant="body2" fontWeight={600}>Comprehensive Report</Typography>
                  <Typography variant="caption" color="text.secondary">Full patient summary</Typography>
                </Box>
              </MenuItem>
              <MenuItem onClick={downloadDoctorVisitReport}>
                <Box sx={{ display: "flex", flexDirection: "column", py: 0.5 }}>
                  <Typography variant="body2" fontWeight={600}>Doctor Visit Report</Typography>
                  <Typography variant="caption" color="text.secondary">Monthly doctor statistics</Typography>
                </Box>
              </MenuItem>
            </Menu>
            <Tooltip title="Reset filters">
              <IconButton
                onClick={() => {
                  setFilter({
                    month: currentMonth,
                    year: defaultYear,
                    q: "",
                    status: "all",
                    paymentType: "",
                    visitedDoctor: "",
                  });
                }}
                size="large"
              >
                <RestartAltIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Divider sx={{ mb: 3 }} />

        {/* Filter Bar */}
        <Paper
          sx={{
            p: 2.5,
            mb: 3,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 2,
            borderRadius: 3,
            alignItems: "center",
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          }}
        >
          <TextField
            select
            label="Month"
            size="small"
            value={filter.month}
            onChange={(e) => setFilter({ ...filter, month: String(e.target.value) })}
          >
            {months.map((m, i) => (
              <MenuItem key={m} value={i === 0 ? "All" : String(i)}>{m}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Year"
            type="number"
            size="small"
            value={filter.year}
            onChange={(e) => setFilter({ ...filter, year: String(e.target.value) })}
          />

          <TextField
            select
            label="Doctor"
            size="small"
            value={filter.visitedDoctor}
            onChange={(e) => setFilter({ ...filter, visitedDoctor: String(e.target.value) })}
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
            value={filter.q}
            onChange={(e) => setFilter({ ...filter, q: String(e.target.value) })}
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
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value as StatusFilter })}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
          </TextField>

          <TextField
            select
            label="Payment Type"
            size="small"
            value={filter.paymentType}
            onChange={(e) =>
              setFilter({ ...filter, paymentType: e.target.value as Filter["paymentType"] })
            }
          >
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value="upi">UPI</MenuItem>
            <MenuItem value="cash">Cash</MenuItem>
            <MenuItem value="card">Card</MenuItem>
            <MenuItem value="bank">Bank Transfer</MenuItem>
          </TextField>
        </Paper>

        {/* Active Filters Alert */}
        {(filter.visitedDoctor || filter.q || filter.status !== "all" || filter.paymentType) && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Active Filters:</strong>{" "}
              {filter.visitedDoctor && `Doctor: ${doctorLabel(filter.visitedDoctor)} · `}
              {filter.q && `Patient: ${filter.q} · `}
              {filter.status !== "all" && `Status: ${filter.status} · `}
              {filter.paymentType && `Payment: ${filter.paymentType.toUpperCase()}`}
            </Typography>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v: TabKey) => setTab(v)} sx={{ mb: 3 }}>
          <Tab label="By Patient" value="overall" />
          <Tab label="By Day" value="daily" />
          <Tab label="By Payment Type" value="byPaymentType" />
          <Tab label="By Doctor" value="byDoctor" />
        </Tabs>

        {/* KPI Cards */}
        {tab === "overall" && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 2,
              mb: 3,
            }}
          >
            {[
              { label: "Total Fee", value: fmt(overall.totalFee), color: "#2196f3", bg: "#e3f2fd" },
              { label: "Total Paid", value: fmt(overall.totalPaid), color: "#4caf50", bg: "#e8f5e9" },
              { label: "Total Due", value: fmt(overall.totalDue), color: "#ff9800", bg: "#fff3e0" },
              { label: "Total Visits", value: fmt(overall.totalVisits), color: "#9c27b0", bg: "#f3e5f5" },
            ].map((kpi) => (
              <Card
                key={kpi.label}
                sx={{
                  bgcolor: kpi.bg,
                  borderLeft: `5px solid ${kpi.color}`,
                  borderRadius: 3,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    {kpi.label}
                  </Typography>
                  <Typography variant="h4" sx={{ color: kpi.color, fontWeight: 700 }}>
                    {kpi.value}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Content */}
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          {tab === "overall" && (
            <>
              <Typography variant="h6" gutterBottom>👩‍⚕️ Patient Payment Summary</Typography>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ "& th": { bgcolor: "#fafafa", fontWeight: 600 } }}>
                    <TableCell>Patient</TableCell>
                    <TableCell align="right">Visits</TableCell>
                    <TableCell align="right" sx={{ color: "success.main" }}>Paid</TableCell>
                    <TableCell align="right" sx={{ color: "warning.main" }}>Due</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rowsPatients.length ? (
                    rowsPatients.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>{r.name}</TableCell>
                        <TableCell align="right">{fmt(r.totalVisits)}</TableCell>
                        <TableCell align="right" sx={{ color: "success.main" }}>
                          {r.totalPaid > 0 ? fmt(r.totalPaid) : "—"}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: r.totalDue > 0 ? "warning.main" : "text.secondary" }}
                        >
                          {r.totalDue > 0 ? fmt(r.totalDue) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 5, color: "text.secondary" }}>
                        No records found for selected filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}

          {tab === "daily" && (
            <>
              <Typography variant="h6" gutterBottom>📅 Daily Summary</Typography>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ "& th": { bgcolor: "#fafafa", fontWeight: 600 } }}>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Visits</TableCell>
                    <TableCell align="right" sx={{ color: "success.main" }}>Paid</TableCell>
                    <TableCell align="right" sx={{ color: "warning.main" }}>Due</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rowsDaily.length ? (
                    rowsDaily.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                        <TableCell align="right">{fmt(r.visits)}</TableCell>
                        <TableCell align="right" sx={{ color: "success.main" }}>
                          {r.totalPaid > 0 ? fmt(r.totalPaid) : "—"}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: r.totalDue > 0 ? "warning.main" : "text.secondary" }}
                        >
                          {r.totalDue > 0 ? fmt(r.totalDue) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 5, color: "text.secondary" }}>
                        No daily records for selected filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}

          {tab === "byPaymentType" && (
            <>
              <Typography variant="h6" gutterBottom>💳 Payment Type Summary</Typography>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ "& th": { bgcolor: "#fafafa", fontWeight: 600 } }}>
                    <TableCell>Payment Type</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell align="right" sx={{ color: "success.main" }}>Paid</TableCell>
                    <TableCell align="right" sx={{ color: "warning.main" }}>Due</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rowsByPaymentType.length ? (
                    rowsByPaymentType.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>{r.paymentType || "—"}</TableCell>
                        <TableCell align="right">{fmt(r.count)}</TableCell>
                        <TableCell align="right" sx={{ color: "success.main" }}>
                          {r.totalPaid > 0 ? fmt(r.totalPaid) : "—"}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: r.totalDue > 0 ? "warning.main" : "text.secondary" }}
                        >
                          {r.totalDue > 0 ? fmt(r.totalDue) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 5, color: "text.secondary" }}>
                        No payment-type records for selected filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}

          {tab === "byDoctor" && (
            <>
              <Typography variant="h6" gutterBottom>🩺 Doctor Visit Summary</Typography>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ "& th": { bgcolor: "#fafafa", fontWeight: 600 } }}>
                    <TableCell>Doctor</TableCell>
                    <TableCell align="right">Visit Count</TableCell>
                    <TableCell align="right" sx={{ color: "success.main" }}>Paid</TableCell>
                    <TableCell align="right" sx={{ color: "warning.main" }}>Due</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rowsByDoctor.length ? (
                    rowsByDoctor.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>{doctorLabel(r.visitedDoctor)}</TableCell>
                        <TableCell align="right">{fmt(r.count)}</TableCell>
                        <TableCell align="right" sx={{ color: "success.main" }}>
                          {r.totalPaid > 0 ? fmt(r.totalPaid) : "—"}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: r.totalDue > 0 ? "warning.main" : "text.secondary" }}
                        >
                          {r.totalDue > 0 ? fmt(r.totalDue) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 5, color: "text.secondary" }}>
                        No doctor records for selected filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </Paper>
      </Box>
    </Fade>
  );
};

export default Dashboard;