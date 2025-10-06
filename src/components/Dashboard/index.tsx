// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  CircularProgress,
  TextField,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  MenuItem,
  Fade,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useDataProvider, useNotify } from "react-admin";

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
  month: string;   // "1".."12" or "all"
  year: string;    // "2025"
  q: string;       // name search
  status: StatusFilter;
}

interface Totals {
  totalFee: number;
  totalPaid: number;
  totalDue: number;
  totalVisits: number;
}

const months = [
  "All", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const Dashboard: React.FC = () => {
  const dataProvider = useDataProvider();
  const notify = useNotify();

  const now = new Date();
  const defaultMonth = "All"; // Set to "All" initially
  const defaultYear = String(now.getFullYear());

  const [rows, setRows] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // top filter UI state (editable)
  const [filter, setFilter] = useState<Filter>({
    month: defaultMonth,
    year: defaultYear,
    q: "",
    status: "all",
  });

  // applied filter (used to fetch)
  const [appliedFilter, setAppliedFilter] = useState<Filter>({
    month: defaultMonth,
    year: defaultYear,
    q: "",
    status: "all",
  });

  const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  const fmt = (n: number) => nf.format(n);

  // ===== Fetch Data =====
  useEffect(() => {
    let isMounted = true;
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const res = await dataProvider.getList<PatientSummary>("patients/payment-summary", {
          pagination: { page: 1, perPage: 10000 },
          sort: { field: "name", order: "ASC" },
          filter: {
            mode: "patient",
            month: appliedFilter.month === "All" ? "" : appliedFilter.month,  // Handle "All" month
            year: appliedFilter.year,
            q: appliedFilter.q,             // backend supports name/q
            status: appliedFilter.status,   // "active" | "closed" | "all"
          },
        });
        if (isMounted) setRows(res.data || []);
      } catch (e) {
        const err = e as Error;
        notify(err.message || "Failed to load summary", { type: "error" });
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchSummary();
    return () => {
      isMounted = false;
    };
  }, [dataProvider, notify, appliedFilter]);

  // ===== Overall Totals =====
  const overall: Totals = useMemo(() => {
    const totalPaid = rows.reduce((s, r) => s + (r.totalPaid || 0), 0);
    const totalDue = rows.reduce((s, r) => s + (r.totalDue || 0), 0);
    const totalFee = totalPaid + totalDue;
    const totalVisits = rows.reduce((s, r) => s + (r.totalVisits || 0), 0);
    return { totalFee, totalPaid, totalDue, totalVisits };
  }, [rows]);

  // ===== Loading =====
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "70vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // ===== Layout =====
  return (
    <Fade in timeout={400}>
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        {/* Header */}
        <Typography variant="h5" fontWeight={700} gutterBottom>
          🩺 Medivue Payment Dashboard
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {/* Filter Bar */}
        <Paper
          sx={{
            p: 2.5,
            mb: 4,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 2,
            borderRadius: 3,
            alignItems: "center",
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
              <MenuItem key={i} value={i === 0 ? "All" : i}>{m}</MenuItem>
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
            label="Search name"
            size="small"
            value={filter.q}
            onChange={(e) => setFilter({ ...filter, q: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

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

          {/* Actions */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setAppliedFilter(filter)}
            >
              Apply
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                const reset: Filter = {
                  month: "All",
                  year: String(now.getFullYear()),
                  q: "",
                  status: "all",
                };
                setFilter(reset);
                setAppliedFilter(reset);
              }}
            >
              Reset
            </Button>
          </Box>
        </Paper>

        {/* KPI Cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 2,
            mb: 4,
          }}
        >
          {[ 
            { label: "Total Fee", value: fmt(overall.totalFee), color: "#2196f3", bg: "#e3f2fd" },
            { label: "Total Paid", value: fmt(overall.totalPaid), color: "#4caf50", bg: "#e8f5e9" },
            { label: "Total Due", value: fmt(overall.totalDue), color: "#ff9800", bg: "#fff3e0" },
            { label: "Total Visits", value: fmt(overall.totalVisits), color: "#9c27b0", bg: "#f3e5f5" },
          ].map((kpi, idx) => (
            <Card
              key={idx}
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

        {/* Table */}
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>
            👩‍⚕️ Patient Payment Summary
          </Typography>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ "& th": { bgcolor: "#fafafa", fontWeight: 600 } }}>
                <TableCell>Patient</TableCell>
                <TableCell align="right">Visits</TableCell>
                <TableCell align="right" sx={{ color: "success.main" }}>
                  Paid
                </TableCell>
                <TableCell align="right" sx={{ color: "warning.main" }}>
                  Due
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length > 0 ? (
                rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.name}</TableCell>
                    <TableCell align="right">{fmt(r.totalVisits)}</TableCell>
                    <TableCell align="right" sx={{ color: "success.main" }}>
                      {fmt(r.totalPaid)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: r.totalDue ? "warning.main" : "text.secondary" }}
                    >
                      {fmt(r.totalDue)}
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
        </Paper>
      </Box>
    </Fade>
  );
};

export default Dashboard;
