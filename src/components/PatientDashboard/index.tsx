import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import {
  CalendarMonth,
  Payments,
  Receipt,
} from "@mui/icons-material";
import { useNotify } from "react-admin";
import Grid from '@mui/material/GridLegacy';

interface DashboardData {
  patient: {
    id: string;
    name: string;
    age: number;
    gender: string;
    phoneNumber: string;
    status: string;
  };
  summary: {
    totalVisits: number;
    totalPaid: number;
    totalDue: number;
    totalFee: number;
    upcomingVisitsCount: number;
  };
  recentVisits: Array<{
    date: string;
    fee: number;
    paid: number;
    doctorName: string;
  }>;
  unpaidInvoices: Array<{
    date: string;
    fee: number;
    paid: number;
    due: number;
    doctorName: string;
  }>;
}

const PatientDashboard: React.FC = () => {
  const notify = useNotify();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000"}/patient-portal/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const data = await response.json();
      setDashboard(data);
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      setError(err.message || "Failed to load dashboard");
      notify("Failed to load dashboard data", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!dashboard) return null;

  return (
    <Box sx={{ p: 3 }}>
      {/* Welcome Header */}
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Welcome, {dashboard.patient.name}
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Here&apos;s your health summary
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <CalendarMonth color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  {dashboard.summary.totalVisits}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Visits
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Payments color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight={600} color="success.main">
                  ₹{dashboard.summary.totalPaid.toLocaleString()}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Paid
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Receipt color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight={600} color="warning.main">
                  ₹{dashboard.summary.totalDue.toLocaleString()}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Amount Due
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Visits */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Recent Visits
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Doctor</TableCell>
                  <TableCell align="right">Fee</TableCell>
                  <TableCell align="right">Paid</TableCell>
                  <TableCell align="right">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dashboard.recentVisits.length > 0 ? (
                  dashboard.recentVisits.map((visit, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(visit.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{visit.doctorName}</TableCell>
                      <TableCell align="right">₹{visit.fee}</TableCell>
                      <TableCell align="right">₹{visit.paid}</TableCell>
                      <TableCell align="right">
                        {visit.fee - visit.paid > 0 ? (
                          <Typography color="warning.main" fontWeight={600}>
                            ₹{visit.fee - visit.paid}
                          </Typography>
                        ) : (
                          <Chip label="Paid" color="success" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary" py={4}>
                        No visits recorded yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Unpaid Invoices */}
      {dashboard.unpaidInvoices.length > 0 && (
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2} color="warning.main">
              Pending Payments
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Doctor</TableCell>
                    <TableCell align="right">Amount Due</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboard.unpaidInvoices.map((invoice, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(invoice.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{invoice.doctorName}</TableCell>
                      <TableCell align="right">
                        <Typography color="warning.main" fontWeight={600}>
                          ₹{invoice.due}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default PatientDashboard;
