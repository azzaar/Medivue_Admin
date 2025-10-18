import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Card, CardContent, Typography, Divider, CircularProgress, TextField,
  Paper, Table, TableHead, TableRow, TableCell, TableBody, MenuItem,
  Fade, Tabs, Tab, IconButton, Tooltip
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
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
  month: string;          // "All" | "1".."12"
  year: string;           // "2025"
  q: string;              // patient name search (server uses q or name)
  status: StatusFilter;
  paymentType: "" | "cash" | "upi" | "card" | "bank";
  visitedDoctor: string;  // doctor id or doctor name (your backend accepts either)
}

interface Totals {
  totalFee: number;
  totalPaid: number;
  totalDue: number;
  totalVisits: number;
}

interface DailyRow {
  id: string;         // "YYYY-MM-DD"
  date: string;       // ISO
  visits: number;
  totalPaid: number;
  totalDue: number;
  totalFee: number;
}

interface PaymentTypeRow {
  id: string;         // payment type key
  paymentType: string;
  totalPaid: number;
  totalDue: number;
  totalFee: number;
  count: number;      // number of payments
}

interface DoctorRow {
  id: string;         // doctor identifier/name
  visitedDoctor: string;
  totalPaid: number;
  totalDue: number;
  totalFee: number;
  count: number;      // number of payments
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
  const defaultMonth = "All";
  const defaultYear = String(now.getFullYear());
const { choices: doctorChoices }  = useChoices("doctors");
const { choices: patientChoices } = useChoices("patients");
  const [tab, setTab] = useState<TabKey>("overall");

  const [rowsPatients, setRowsPatients] = useState<PatientSummary[]>([]);
  const [rowsDaily, setRowsDaily] = useState<DailyRow[]>([]);
  const [rowsByPaymentType, setRowsByPaymentType] = useState<PaymentTypeRow[]>([]);
  const [rowsByDoctor, setRowsByDoctor] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // UI filter (live)
  const [filter, setFilter] = useState<Filter>({
    month: defaultMonth,
    year: defaultYear,
    q: "",
    status: "all",
    paymentType: "",
    visitedDoctor: "",
  });

  // live fetch on change (debounced for q)
  const debouncedQ = useDebounced(filter.q);

  const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  const fmt = (n: number) => nf.format(n);

  // ===== Fetch Data for active tab (no Apply button) =====
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

  // ===== Overall Totals (from patient rows) =====
  const overall: Totals = useMemo(() => {
    const totalPaid = rowsPatients.reduce((s, r) => s + (r.totalPaid || 0), 0);
    const totalDue = rowsPatients.reduce((s, r) => s + (r.totalDue || 0), 0);
    const totalFee = totalPaid + totalDue;
    const totalVisits = rowsPatients.reduce((s, r) => s + (r.totalVisits || 0), 0);
    return { totalFee, totalPaid, totalDue, totalVisits };
  }, [rowsPatients]);
// Put these at the top of Dashboard.tsx (outside the component)
const toUTCDateOnly = (isoLike: string): string => {
  // Works for: "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss.sssZ", etc.
  if (!isoLike) return "";
  // If it's already a date-only string, keep it (no TZ math).
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoLike)) return isoLike;
  // Else, force UTC and cut the date part.
  const d = new Date(isoLike);
  return Number.isNaN(d.getTime()) ? isoLike : d.toISOString().slice(0, 10);
};



  // ===== CSV Download (current tab) =====
  const downloadCSV = () => {
    let csv = "";
    const toCSV = (arr: string[]) => arr.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");

    if (tab === "overall") {
      csv += toCSV(["Patient", "Visits", "Paid", "Due"]) + "\n";
      rowsPatients.forEach((r) =>
        (csv += toCSV([r.name, fmt(r.totalVisits), r.totalPaid > 0 ? fmt(r.totalPaid) : "0", r.totalDue > 0 ? fmt(r.totalDue) : "0"]) + "\n")
      );
    } else if (tab === "daily") {
      csv += toCSV(["Date", "Visits", "Paid", "Due"]) + "\n";
      rowsDaily.forEach((r) =>
        (csv += toCSV([
     r.date,
          fmt(r.visits),
          r.totalPaid > 0 ? fmt(r.totalPaid) : "0",
          r.totalDue > 0 ? fmt(r.totalDue) : "0",
        ]) + "\n")
      );
    } else if (tab === "byPaymentType") {
      csv += toCSV(["Payment Type", "Count", "Paid", "Due"]) + "\n";
      rowsByPaymentType.forEach((r) =>
        (csv += toCSV([r.paymentType || "—", String(r.count), r.totalPaid > 0 ? fmt(r.totalPaid) : "0", r.totalDue > 0 ? fmt(r.totalDue) : "0"]) + "\n")
      );
    } else {
      csv += toCSV(["Doctor", "Count", "Paid", "Due"]) + "\n";
      rowsByDoctor.forEach((r) =>
        (csv += toCSV([r.visitedDoctor || "—", String(r.count), r.totalPaid > 0 ? fmt(r.totalPaid) : "0", r.totalDue > 0 ? fmt(r.totalDue) : "0"]) + "\n")
      );
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const base = tab === "overall" ? "by-patient" : tab === "daily" ? "by-day" : tab === "byPaymentType" ? "by-payment-type" : "by-doctor";
    a.href = url;
    a.download = `payment-summary-${base}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== Loading =====
  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  // ===== Layout =====
  return (
    <Fade in timeout={400}>
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="h5" fontWeight={700}>🩺 Medivue Payment Dashboard</Typography>
          <Box>
            <Tooltip title="Download CSV (current tab)">
              <IconButton onClick={downloadCSV} color="primary" size="large">
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset filters">
              <IconButton
                onClick={() => {
                  setFilter({
                    month: "All",
                    year: String(now.getFullYear()),
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
        <Divider sx={{ mb: 2 }} />

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v: TabKey) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Overall (By Patient)" value="overall" />
          <Tab label="By Day" value="daily" />
          <Tab label="By Payment Type" value="byPaymentType" />
          <Tab label="By Doctor" value="byDoctor" />
        </Tabs>

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
          {/* Month */}
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

          {/* Year */}
          <TextField
            label="Year"
            type="number"
            size="small"
            value={filter.year}
            onChange={(e) => setFilter({ ...filter, year: String(e.target.value) })}
          />

          {/* Name search */}
  <TextField
  select
  label="Doctor"
  size="small"
  value={filter.visitedDoctor}
  onChange={(e) => setFilter({ ...filter, visitedDoctor: String(e.target.value) })}
>
  <MenuItem value="">All</MenuItem>
  {doctorChoices.map(d => (
    <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
  ))}
</TextField>

<TextField
  select
  label="Patient"
  size="small"
  value={filter.q}                 // if backend searches by patient name/id, adjust as needed
  onChange={(e) => setFilter({ ...filter, q: String(e.target.value) })}
>
  <MenuItem value="">All</MenuItem>
  {patientChoices.map(p => (
    <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>
  ))}
</TextField>


          {/* Status */}
          <TextField
            select
            label="Status"
            size="small"
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value as StatusFilter })}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
          </TextField>

          {/* Payment Type */}
          <TextField
            select
            label="Payment Type"
            size="small"
            value={filter.paymentType}
            onChange={(e) =>
              setFilter({ ...filter, paymentType: e.target.value as Filter["paymentType"] })
            }
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="upi">UPI</MenuItem>
            <MenuItem value="cash">Cash</MenuItem>
          </TextField>

   

        </Paper>

        {/* KPI Cards (from Overall tab data) */}
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
              <Typography variant="h6" gutterBottom>👩‍⚕️ By Patient</Typography>
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
              <Typography variant="h6" gutterBottom>📅 By Day</Typography>
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
              <Typography variant="h6" gutterBottom>💳 By Payment Type</Typography>
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
              <Typography variant="h6" gutterBottom>🩺 By Doctor</Typography>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ "& th": { bgcolor: "#fafafa", fontWeight: 600 } }}>
                    <TableCell>Doctor</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell align="right" sx={{ color: "success.main" }}>Paid</TableCell>
                    <TableCell align="right" sx={{ color: "warning.main" }}>Due</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rowsByDoctor.length ? (
                    rowsByDoctor.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>{r.visitedDoctor || "—"}</TableCell>
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
