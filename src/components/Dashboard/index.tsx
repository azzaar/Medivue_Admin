// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Grid,
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
  Fade,
  MenuItem,
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

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const Dashboard: React.FC = () => {
  const dataProvider = useDataProvider();
  const notify = useNotify();

  const currentDate = new Date();
  const defaultMonth = String(currentDate.getMonth() + 1);
  const defaultYear = String(currentDate.getFullYear());

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState({ month: defaultMonth, year: defaultYear });
  const [appliedFilter, setAppliedFilter] = useState({ month: defaultMonth, year: defaultYear });

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const res = await dataProvider.getList("patients/payment-summary", {
          pagination: { page: 1, perPage: 10000 },
          sort: { field: "name", order: "ASC" },
          filter: {
            mode: "patient",
            month: appliedFilter.month,
            year: appliedFilter.year,
          },
        });
        setRows(res.data || []);
      } catch (err: any) {
        notify(err.message || "Failed to load summary", { type: "error" });
      } finally {
        setTimeout(() => setLoading(false), 250);
      }
    };
    fetchSummary();
  }, [dataProvider, notify, appliedFilter]);

  const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  const fmt = (n: number) => nf.format(n);

  const overall = useMemo(() => {
    const totalPaid = rows.reduce((s, r) => s + (r.totalPaid || 0), 0);
    const totalDue = rows.reduce((s, r) => s + (r.totalDue || 0), 0);
    const totalFee = totalPaid + totalDue;
    const totalVisits = rows.reduce((s, r) => s + (r.totalVisits || 0), 0);
    return { totalFee, totalPaid, totalDue, totalVisits };
  }, [rows]);

  const monthlyChart = useMemo(() => {
    const map: Record<string, any> = {};
    rows.forEach((r) => {
      const date = new Date(r.date || Date.now());
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { month: key, paid: 0, due: 0, fee: 0 };
      map[key].paid += r.totalPaid || 0;
      map[key].due += r.totalDue || 0;
      map[key].fee += (r.totalPaid || 0) + (r.totalDue || 0);
    });
    return Object.values(map);
  }, [rows]);

  if (loading)
    return (
      <Grid container justifyContent="center" alignItems="center" sx={{ height: "70vh" }}>
        <CircularProgress />
      </Grid>
    );

  return (
    <Fade in={!loading} timeout={400}>
      <Box sx={{ p: { xs: 2, md: 4 }, width: "100%", maxWidth: "1600px", mx: "auto" }}>
        {/* ===== Header ===== */}
        <Typography variant="h5" fontWeight={700} gutterBottom>
          🩺 Medivue Payment Dashboard
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {/* ===== Filter Bar ===== */}
        <Paper
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            flexWrap: "wrap",
            gap: 2,
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
            Apply Filter
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              const now = new Date();
              setFilter({
                month: String(now.getMonth() + 1),
                year: String(now.getFullYear()),
              });
              setAppliedFilter({
                month: String(now.getMonth() + 1),
                year: String(now.getFullYear()),
              });
            }}
            sx={{ height: 40 }}
          >
            Reset
          </Button>
        </Paper>

        {/* ===== KPI Cards ===== */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: "#e3f2fd", borderLeft: "5px solid #2196f3" }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Total Fee
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {fmt(overall.totalFee)}
                </Typography>
                <Typography variant="caption">Expected (Paid + Due)</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: "#e8f5e9", borderLeft: "5px solid #4caf50" }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Total Paid
                </Typography>
                <Typography variant="h4" color="success.main">
                  {fmt(overall.totalPaid)}
                </Typography>
                <Typography variant="caption">Completed Payments</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: "#fff3e0", borderLeft: "5px solid #ff9800" }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Total Due
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {fmt(overall.totalDue)}
                </Typography>
                <Typography variant="caption">Pending Payments</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: "#f3e5f5", borderLeft: "5px solid #9c27b0" }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  Total Visits
                </Typography>
                <Typography variant="h4">{fmt(overall.totalVisits)}</Typography>
                <Typography variant="caption">Across all patients</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ===== Monthly Chart ===== */}
        {monthlyChart.length > 1 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              📊 Monthly Overview
            </Typography>
            <ResponsiveContainer width="100%" height={350}>
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
                <Bar dataKey="paid" name="Paid" fill="#4caf50" />
                <Bar dataKey="due" name="Due" fill="#ff9800" />
                <Bar dataKey="fee" name="Total" fill="#2196f3" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        )}

        {/* ===== Table ===== */}
        <Paper sx={{ p: 3 }}>
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
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell align="right">{r.totalVisits}</TableCell>
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
              ))}
              {rows.length === 0 && (
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
