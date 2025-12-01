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
  Paper,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  CalendarMonth,
  Refresh as RefreshIcon,
  CheckCircle,
  Warning,
  Event,
} from "@mui/icons-material";
import { useNotify } from "react-admin";
import Grid from '@mui/material/GridLegacy';

interface Visit {
  date: string;
  doctorName: string;
  fee: number;
  paid: number;
  due: number;
  paymentType: string;
  treatmentDescription: string;
  isPaid: boolean;
}

const PatientVisits: React.FC = () => {
  const notify = useNotify();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000"}/patient-portal/visits`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch visit history");
      }

      const data = await response.json();

      // Filter visits: only show from Nov 1, 2024 onwards and exclude future dates
      const nov1_2024 = new Date("2024-11-01");
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      const filteredVisits = (data.visits || []).filter((visit: Visit) => {
        const visitDate = new Date(visit.date);
        return visitDate >= nov1_2024 && visitDate <= today;
      });

      setVisits(filteredVisits);
      setTotalVisits(filteredVisits.length);
    } catch (err) {
      console.error("Error fetching visits:", err);
      setError(err.message || "Failed to load visit history");
      notify("Failed to load visit history", { type: "error" });
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

  // Group visits by month/year
  const groupedVisits = visits.reduce((acc, visit) => {
    const date = new Date(visit.date);
    const monthYear = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(visit);
    return acc;
  }, {} as Record<string, Visit[]>);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Visit History
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Complete record of your clinic visits
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchVisits}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CalendarMonth color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h5" fontWeight={600}>
                    {totalVisits}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Visits
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CheckCircle color="success" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h5" fontWeight={600}>
                    {visits.filter((v) => v.isPaid).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Paid Visits
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Warning color="warning" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h5" fontWeight={600}>
                    {visits.filter((v) => !v.isPaid).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Payments
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Visits Table */}
      {visits.length === 0 ? (
        <Card elevation={2}>
          <CardContent>
            <Box textAlign="center" py={4}>
              <Event sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Visits Recorded
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your visit history will appear here once you start your treatment
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {Object.entries(groupedVisits).map(([monthYear, monthVisits]) => (
            <Card key={monthYear} sx={{ mb: 3 }} elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2} color="primary">
                  {monthYear}
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Doctor</TableCell>
                        <TableCell>Treatment</TableCell>
                        <TableCell align="right">Fee</TableCell>
                        <TableCell align="right">Paid</TableCell>
                        <TableCell align="right">Due</TableCell>
                        <TableCell>Payment</TableCell>
                        <TableCell align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {monthVisits.map((visit, index) => (
                        <TableRow
                          key={index}
                          sx={{
                            "&:last-child td, &:last-child th": { border: 0 },
                            backgroundColor: visit.isPaid ? "inherit" : "warning.50",
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {new Date(visit.date).toLocaleDateString("en-US", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{visit.doctorName}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {visit.treatmentDescription || "Treatment"}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              ₹{visit.fee.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="success.main" fontWeight={600}>
                              ₹{visit.paid.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              color={visit.due > 0 ? "warning.main" : "text.secondary"}
                              fontWeight={600}
                            >
                              ₹{visit.due.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={visit.paymentType.toUpperCase()}
                              size="small"
                              variant="outlined"
                              color={visit.paymentType === "cash" ? "default" : "info"}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {visit.isPaid ? (
                              <Chip
                                icon={<CheckCircle />}
                                label="Paid"
                                size="small"
                                color="success"
                              />
                            ) : (
                              <Chip
                                icon={<Warning />}
                                label="Pending"
                                size="small"
                                color="warning"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default PatientVisits;
