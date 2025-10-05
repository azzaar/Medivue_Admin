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
} from "@mui/material";
import { useDataProvider, useNotify } from "react-admin";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

// ===== Interfaces =====
interface PatientSummary {
  id: string;
  name: string;
  totalVisits: number;
  totalPaid: number;
  totalDue: number;
  date?: string;
}

interface Filter {
  month: string;
  year: string;
}

interface Totals {
  totalFee: number;
  totalPaid: number;
  totalDue: number;
  totalVisits: number;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const Dashboard: React.FC = () => {
  const dataProvider = useDataProvider();
  const notify = useNotify();

  const now = new Date();
  const defaultMonth = String(now.getMonth() + 1);
  const defaultYear = String(now.getFullYear());

  const [rows, setRows] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<Filter>({ month: defaultMonth, year: defaultYear });
  const [appliedFilter, setAppliedFilter] = useState<Filter>({ month: defaultMonth, year: defaultYear });

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
            month: appliedFilter.month,
            year: appliedFilter.year,
          },
        });
        if (isMounted) setRows(res.data || []);
      } catch (err) {
        notify(err.message || "Failed to load summary", { type: "error" });
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchSummary();
    return () => { isMounted = false; };
  }, [dataProvider, notify, appliedFilter]);

  // ===== Overall Totals =====
  const overall: Totals = useMemo(() => {
    const totalPaid = rows.reduce((s, r) => s + (r.totalPaid || 0), 0);
    const totalDue = rows.reduce((s, r) => s + (r.totalDue || 0), 0);
    const totalFee = totalPaid + totalDue;
    const totalVisits = rows.reduce((s, r) => s + (r.totalVisits || 0), 0);
    return { totalFee, totalPaid, totalDue, totalVisits };
  }, [rows]);

  // ===== Monthly Bar Chart Data =====
  const monthlyChart = useMemo(() => {
    const map: Record<string, { month: string; paid: number; due: number; fee: number }> = {};
    rows.forEach((r) => {
      const d = new Date(r.date || now);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { month: key, paid: 0, due: 0, fee: 0 };
      map[key].paid += r.totalPaid || 0;
      map[key].due += r.totalDue || 0;
      map[key].fee += (r.totalPaid || 0) + (r.totalDue || 0);
    });
    return Object.values(map);
  }, [rows]);

  // ===== Loading Spinner =====
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
        {/* ===== Header ===== */}
        <Typography variant="h5" fontWeight={700} gutterBottom>
          🩺 Medivue Payment Dashboard
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {/* ===== Filter Bar ===== */}
        <Paper
          sx={{
            p: 2.5,
            mb: 4,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 2,
            borderRadius: 3,
          }}
        >
          <TextField
            select
            label="Month"
            size="small"
            value={filter.month}
            onChange={(e) => setFilter({ ...filter, month: e.target.value })}
            sx={{ minWidth: 160 }}
          >
            {months.map((m, i) => (
              <MenuItem key={i} value={i + 1}>
                {m}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Year"
            type="number"
            size="small"
            value={filter.year}
            onChange={(e) => setFilter({ ...filter, year: e.target.value })}
            sx={{ width: 120 }}
          />

          <Button
            variant="contained"
            color="primary"
            onClick={() => setAppliedFilter(filter)}
            sx={{ height: 40 }}
          >
            Apply
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              const now = new Date();
              const reset = {
                month: String(now.getMonth() + 1),
                year: String(now.getFullYear()),
              };
              setFilter(reset);
              setAppliedFilter(reset);
            }}
            sx={{ height: 40 }}
          >
            Reset
          </Button>
        </Paper>

        {/* ===== KPI Cards ===== */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 4fr))",
            gap: 1,
            mb: 4,
          }}
        >
          {[
            { label: "Total Fee", value: fmt(overall.totalFee), color: "#2196f3", bg: "#e3f2fd" },
            { label: "Total Paid", value: fmt(overall.totalPaid), color: "#4caf50", bg: "#e8f5e9" },
            { label: "Total Due", value: fmt(overall.totalDue), color: "#ff9800", bg: "#fff3e0" },
            { label: "Total Visits", value: fmt(overall.totalVisits), color: "#9c27b0", bg: "#f3e5f5" },
          ].map((item, idx) => (
            <Card
              key={idx}
              sx={{
                bgcolor: item.bg,
                borderLeft: `5px solid ${item.color}`,
                borderRadius: 3,
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="h4" sx={{ color: item.color, fontWeight: 700 }}>
                  {item.value}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* ===== Chart ===== */}
        {monthlyChart.length > 1 && (
          <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom>
              📊 Monthly Payment Overview
            </Typography>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickFormatter={(m) => {
                    const [y, mo] = m.split("-");
                    return new Date(`${y}-${mo}-01`).toLocaleString("default", {
                      month: "short",
                    });
                  }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="paid" fill="#4caf50" name="Paid" />
                <Bar dataKey="due" fill="#ff9800" name="Due" />
                <Bar dataKey="fee" fill="#2196f3" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        )}

        {/* ===== Table ===== */}
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>
            👩‍⚕️ Patient Payment Summary
          </Typography>
          <Table size="small">
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
                    No records found for selected month/year.
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
