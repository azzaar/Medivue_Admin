import React, { useState, useEffect, useRef } from "react";
import {
  useDataProvider,
  Loading,
  useNotify,
} from "react-admin";
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Fade,
  alpha,
  useTheme,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  useMediaQuery,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import ReceiptIcon from "@mui/icons-material/Receipt";
import PersonIcon from "@mui/icons-material/Person";
import DateRangeIcon from "@mui/icons-material/DateRange";
import TodayIcon from "@mui/icons-material/Today";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import FilterListIcon from "@mui/icons-material/FilterList";
import PrintIcon from "@mui/icons-material/Print";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";

// Constants
const CLINIC_NAME = "Medivue Health and Wellness";
const CLINIC_ADDRESS = "Ward 21, No 98, Vettiyara P.O, Navaikulam, Thiruvananthapuram, Kerala - 695603";
const CLINIC_PHONE = "+91 8089180303";
const CLINIC_EMAIL = "info@medivue.life";
const LOGO_PATH = "/medivueLogo.jpeg";

interface Patient {
  id: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  age?: number;
  gender?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
}

interface PaymentRecord {
  id: string | number;
  date: string;
  fee: number;
  paid: number;
  treatmentDescription?: string;
  paymentType?: "cash" | "upi" | "card" | "bank";
  visitedDoctor?: string;
  time?: string;
}

interface InvoiceData {
  payments: PaymentRecord[];
  patient: Patient | null;
  totalFee: number;
  totalPaid: number;
  totalDue: number;
}

type DateMode = "single" | "range" | "monthly";

const InvoicePage: React.FC = () => {
  const theme = useTheme();
  const notify = useNotify();
  const dataProvider = useDataProvider();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const printRef = useRef<HTMLDivElement>(null);

  const [patientChoices, setPatientChoices] = useState<Patient[]>([]);

  // Date selection
  const [dateMode, setDateMode] = useState<DateMode>("single");
  const [singleDate, setSingleDate] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  // Filters
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Data
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch patients
    dataProvider
      .getList("patients", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "name", order: "ASC" },
        filter: {},
      })
      .then((resp) => {
        const opts = (resp.data || []).map((p: Record<string, unknown>) => ({
          id: String(p.id ?? p._id),
          name: String(p.name),
          phoneNumber: p.phoneNumber ? String(p.phoneNumber) : undefined,
          email: p.email ? String(p.email) : undefined,
          age: p.age as number | undefined,
          gender: p.gender as string | undefined,
          address: p.address as Patient["address"],
        }));
        setPatientChoices(opts);
      })
      .catch(() => setPatientChoices([]));

    // Fetch doctors for name mapping
    dataProvider
      .getList("doctors", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "name", order: "ASC" },
        filter: {},
      })
      .then((resp) => {
        const map: Record<string, string> = {};
        (resp.data || []).forEach((d: Record<string, unknown>) => {
          const id = String(d.id ?? d._id);
          const name = String(d.name);
          map[id] = name;
        });
      })
  }, [dataProvider]);

  const generateInvoice = async () => {
    if (!selectedPatient) {
      notify("Please select a patient", { type: "warning" });
      return;
    }

    setLoading(true);

    try {
      // Fetch patient details
      const patientResp = await dataProvider.getOne<Patient>("patients", {
        id: selectedPatient.id
      });

      // Fetch payment history (sorted chronologically - oldest to newest)
      const paymentsResp = await dataProvider.getList<PaymentRecord>(
        `patients/${selectedPatient.id}/visit-payments`,
        {
          pagination: { page: 1, perPage: 10000 },
          sort: { field: "date", order: "ASC" },
          filter: {},
        }
      );

      let payments = paymentsResp.data;

      // Filter by date based on mode (optional - only filter if date is provided)
      if (dateMode === "single" && singleDate) {
        payments = payments.filter(p => {
          const paymentDate = new Date(p.date).toISOString().split('T')[0];
          return paymentDate === singleDate;
        });
      } else if (dateMode === "range" && fromDate && toDate) {
        const from = new Date(fromDate).getTime();
        const to = new Date(toDate).getTime();
        payments = payments.filter(p => {
          const paymentTime = new Date(p.date).getTime();
          return paymentTime >= from && paymentTime <= to;
        });
      } else if (dateMode === "monthly" && selectedMonth && selectedYear) {
        payments = payments.filter(p => {
          const paymentDate = new Date(p.date);
          const paymentMonth = String(paymentDate.getMonth() + 1).padStart(2, '0');
          const paymentYear = String(paymentDate.getFullYear());
          return paymentMonth === selectedMonth && paymentYear === selectedYear;
        });
      }

      const totalFee = payments.reduce((acc, p) => acc + (p.fee || 0), 0);
      const totalPaid = payments.reduce((acc, p) => acc + (p.paid || 0), 0);
      const totalDue = payments.reduce((acc, p) => acc + ((p.fee - p.paid) || 0), 0);

      setInvoiceData({
        payments,
        patient: patientResp.data,
        totalFee,
        totalPaid,
        totalDue,
      });

      notify("Invoice generated successfully", { type: "success" });
    } catch (err: unknown) {
      const error = err as Error;
      notify(error?.message || "Failed to generate invoice", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const DateSelector = () => {
    switch (dateMode) {
      case "single":
        return (
          <TextField
            type="date"
            label="Select Date"
            value={singleDate}
            onChange={(e) => setSingleDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            size="small"
            sx={{ bgcolor: "#fff" }}
          />
        );

      case "range":
        return (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              type="date"
              label="From Date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
              sx={{ bgcolor: "#fff" }}
            />
            <TextField
              type="date"
              label="To Date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
              sx={{ bgcolor: "#fff" }}
            />
          </Stack>
        );

      case "monthly":
        return (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              select
              label="Month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              fullWidth
              size="small"
              sx={{ bgcolor: "#fff" }}
            >
              {[
                { value: "01", label: "January" },
                { value: "02", label: "February" },
                { value: "03", label: "March" },
                { value: "04", label: "April" },
                { value: "05", label: "May" },
                { value: "06", label: "June" },
                { value: "07", label: "July" },
                { value: "08", label: "August" },
                { value: "09", label: "September" },
                { value: "10", label: "October" },
                { value: "11", label: "November" },
                { value: "12", label: "December" },
              ].map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              fullWidth
              size="small"
              sx={{ bgcolor: "#fff" }}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <MenuItem key={year} value={year.toString()}>
                  {year}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #invoice-document, #invoice-document * {
              visibility: visible;
            }
            #invoice-document {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
            @page {
              margin: 1cm;
            }
          }
        `}
      </style>

      <Fade in timeout={600}>
        <Box
          sx={{
            p: { xs: 2, sm: 3, md: 4 },
            maxWidth: 1400,
            mx: "auto",
            minHeight: "100vh",
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
          }}
        >
          {/* Header */}
          <Paper
            elevation={0}
            className="no-print"
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 4,
              background: alpha("#fff", 0.9),
              backdropFilter: "blur(20px)",
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.08)}`,
            }}
          >
            <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
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
                <ReceiptIcon sx={{ color: "#fff", fontSize: 28 }} />
              </Box>
              <Box flex={1}>
                <Typography variant="h5" fontWeight={700}>
                  Invoice Generator
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Generate detailed patient invoices
                </Typography>
              </Box>
            </Stack>
          </Paper>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "420px 1fr" },
              gap: 3,
              alignItems: "start",
            }}
          >
            {/* Left Panel - Filters */}
            <Paper
              elevation={0}
              className="no-print"
              sx={{
                p: 3,
                borderRadius: 4,
                background: alpha("#fff", 0.9),
                backdropFilter: "blur(10px)",
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                position: { lg: "sticky" },
                top: { lg: 24 },
              }}
            >
              <Stack spacing={3}>
                <Box>
                  <Stack direction="row" alignItems="center" gap={1} mb={2}>
                    <DateRangeIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      Date Selection Mode
                    </Typography>
                  </Stack>

                  <ToggleButtonGroup
                    value={dateMode}
                    exclusive
                    onChange={(_, newMode) => newMode && setDateMode(newMode)}
                    fullWidth
                    size="small"
                    sx={{ mb: 2 }}
                  >
                    <ToggleButton value="single">
                      <TodayIcon sx={{ fontSize: 18, mr: isMobile ? 0 : 0.5 }} />
                      {!isMobile && "Single"}
                    </ToggleButton>
                    <ToggleButton value="range">
                      <DateRangeIcon sx={{ fontSize: 18, mr: isMobile ? 0 : 0.5 }} />
                      {!isMobile && "Range"}
                    </ToggleButton>
                    <ToggleButton value="monthly">
                      <CalendarMonthIcon sx={{ fontSize: 18, mr: isMobile ? 0 : 0.5 }} />
                      {!isMobile && "Monthly"}
                    </ToggleButton>
                  </ToggleButtonGroup>

                  {DateSelector()}
                </Box>

                <Divider />

                <Box>
                  <Stack direction="row" alignItems="center" gap={1} mb={2}>
                    <FilterListIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      Filters
                    </Typography>
                  </Stack>

                  <Stack spacing={2}>
                    <Autocomplete
                      value={selectedPatient}
                      onChange={(_, newValue) => setSelectedPatient(newValue)}
                      options={patientChoices}
                      getOptionLabel={(option) => `${option.name}${option.phoneNumber ? ` (${option.phoneNumber})` : ""}`}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Select Patient *"
                          size="small"
                          sx={{ bgcolor: "#fff" }}
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                <PersonIcon sx={{ mr: 1, color: "text.secondary", fontSize: 20 }} />
                                {params.InputProps.startAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                      fullWidth
                    />
                  </Stack>
                </Box>

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={generateInvoice}
                  disabled={loading}
                  startIcon={<ReceiptIcon />}
                  sx={{
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                    "&:hover": {
                      boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                    },
                  }}
                >
                  {loading ? "Generating..." : "Generate Invoice"}
                </Button>
              </Stack>
            </Paper>

            {/* Right Panel - Invoice Document */}
            <Stack spacing={3}>
              {loading && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 6,
                    borderRadius: 4,
                    background: alpha("#fff", 0.9),
                    textAlign: "center",
                  }}
                >
                  <Loading />
                  <Typography variant="body2" color="text.secondary" mt={2}>
                    Generating invoice...
                  </Typography>
                </Paper>
              )}

              {!loading && !invoiceData && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 6,
                    borderRadius: 4,
                    background: alpha("#fff", 0.9),
                    textAlign: "center",
                  }}
                >
                  <ReceiptIcon sx={{ fontSize: 64, color: alpha(theme.palette.text.primary, 0.2), mb: 2 }} />
                  <Typography variant="h6" fontWeight={700} color="text.secondary" mb={1}>
                    No Invoice Generated
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Select a patient and date range, then click Generate Invoice
                  </Typography>
                </Paper>
              )}

              {!loading && invoiceData && (
                <>
                  {/* Print Button */}
                  <Box className="no-print" sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button
                      variant="contained"
                      startIcon={<PrintIcon />}
                      onClick={handlePrint}
                      sx={{
                        background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                      }}
                    >
                      Print Invoice
                    </Button>
                  </Box>

                  {/* Invoice Document */}
                  <Paper
                    id="invoice-document"
                    ref={printRef}
                    elevation={3}
                    sx={{
                      p: 4,
                      borderRadius: 2,
                      background: "#fff",
                      maxWidth: "210mm",
                      mx: "auto",
                    }}
                  >
                    {/* Header with Logo and Company Info */}
                    <Grid container spacing={3} mb={3}>
                      <Grid item xs={12} sm={4}>
                        <Box
                          component="img"
                          src={LOGO_PATH}
                          alt={CLINIC_NAME}
                          sx={{
                            width: "100%",
                            maxWidth: 150,
                            height: "auto",
                            objectFit: "contain",
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={8}>
                        <Box textAlign={{ xs: "left", sm: "right" }}>
                          <Typography variant="h5" fontWeight={700} color="primary.main" gutterBottom>
                            {CLINIC_NAME}
                          </Typography>
                          <Stack spacing={0.5} alignItems={{ xs: "flex-start", sm: "flex-end" }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <LocationOnIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                              <Typography variant="body2" color="text.secondary">
                                {CLINIC_ADDRESS}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <PhoneIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                              <Typography variant="body2" color="text.secondary">
                                {CLINIC_PHONE}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <EmailIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                              <Typography variant="body2" color="text.secondary">
                                {CLINIC_EMAIL}
                              </Typography>
                            </Stack>
                          </Stack>
                        </Box>
                      </Grid>
                    </Grid>

                    <Divider sx={{ mb: 3 }} />

                    {/* Invoice Title and Number */}
                    <Grid container spacing={3} mb={3}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="h4" fontWeight={700} color="primary.main">
                          INVOICE
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Number: INV-{invoiceData.patient?.id.slice(-6).toUpperCase()}-{new Date().getTime().toString().slice(-6)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Date: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </Typography>
                      </Grid>
                    </Grid>

                    {/* Billing Information */}
                    <Grid container spacing={3} mb={4}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>
                          BILLING TO:
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {invoiceData.patient?.name}
                        </Typography>
                        {invoiceData.patient?.phoneNumber && (
                          <Typography variant="body2" color="text.secondary">
                            Phone: {invoiceData.patient.phoneNumber}
                          </Typography>
                        )}
                        {invoiceData.patient?.email && (
                          <Typography variant="body2" color="text.secondary">
                            Email: {invoiceData.patient.email}
                          </Typography>
                        )}
                        {invoiceData.patient?.age && (
                          <Typography variant="body2" color="text.secondary">
                            Age: {invoiceData.patient.age} years
                            {invoiceData.patient?.gender && ` | ${invoiceData.patient.gender}`}
                          </Typography>
                        )}
                        {invoiceData.patient?.address?.street && (
                          <Typography variant="body2" color="text.secondary" mt={1}>
                            {invoiceData.patient.address.street}
                            {invoiceData.patient.address.city && `, ${invoiceData.patient.address.city}`}
                            {invoiceData.patient.address.state && `, ${invoiceData.patient.address.state}`}
                            {invoiceData.patient.address.postalCode && ` - ${invoiceData.patient.address.postalCode}`}
                          </Typography>
                        )}
                      </Grid>
                    </Grid>

                    {/* Services Table */}
                    <TableContainer sx={{ mb: 3 }}>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                            <TableCell sx={{ fontWeight: 700 }}>DATE</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>TREATMENT DESCRIPTION</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">TOTAL FEE</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">PAID</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">DUE</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {invoiceData.payments.map((payment, index) => {
                            const dueAmount = payment.fee - payment.paid;
                            return (
                              <TableRow key={payment.id || index}>
                                <TableCell>
                                  {new Date(payment.date).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </TableCell>
                                <TableCell>
                                  {payment.treatmentDescription || "Physiotherapy"}
                                </TableCell>
                                <TableCell align="right">₹{payment.fee.toFixed(2)}</TableCell>
                                <TableCell align="right" sx={{ color: "success.main" }}>
                                  ₹{payment.paid.toFixed(2)}
                                </TableCell>
                                <TableCell align="right" sx={{ color: "warning.main" }}>
                                  ₹{dueAmount.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Totals */}
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 4 }}>
                      <Box sx={{ minWidth: 300 }}>
                        <Stack spacing={1}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body1">Subtotal:</Typography>
                            <Typography variant="body1">₹{invoiceData.totalFee.toFixed(2)}</Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body1" color="success.main" fontWeight={600}>
                              Total Paid:
                            </Typography>
                            <Typography variant="body1" color="success.main" fontWeight={600}>
                              ₹{invoiceData.totalPaid.toFixed(2)}
                            </Typography>
                          </Stack>
                          <Divider />
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            sx={{
                              bgcolor: alpha(theme.palette.warning.main, 0.1),
                              p: 1.5,
                              borderRadius: 1
                            }}
                          >
                            <Typography variant="h6" fontWeight={700}>
                              Total Due:
                            </Typography>
                            <Typography variant="h6" fontWeight={700} color="warning.main">
                              ₹{invoiceData.totalDue.toFixed(2)}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Box>
                    </Box>

                    {/* Terms and Conditions */}
                    <Divider sx={{ mb: 2 }} />
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        Terms and Conditions:
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        • Payment is due within 30 days of the invoice date.
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        • Please make checks payable to {CLINIC_NAME}.
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        • For any queries regarding this invoice, please contact us at {CLINIC_PHONE} or {CLINIC_EMAIL}.
                      </Typography>
                    </Box>

                    {/* Footer */}
                    <Box sx={{ mt: 4, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                      <Typography variant="caption" color="text.secondary" align="center" display="block">
                        Thank you for choosing {CLINIC_NAME}
                      </Typography>
                    </Box>
                  </Paper>
                </>
              )}
            </Stack>
          </Box>
        </Box>
      </Fade>
    </>
  );
};

export default InvoicePage;
