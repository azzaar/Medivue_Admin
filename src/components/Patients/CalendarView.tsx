import React, { useState, useEffect, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
  useGetOne,
  useDataProvider,
  Loading,
  useNotify,
  useRefresh,
  HttpError,
} from "react-admin";
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Chip,
  Card,
  CardContent,
  Fade,
  Collapse,
  IconButton,
  alpha,
  useTheme,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PersonIcon from "@mui/icons-material/Person";
import PaymentIcon from "@mui/icons-material/Payment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import SaveIcon from "@mui/icons-material/Save";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface CalendarViewProps {
  patientId: string;
}

interface PaymentRecord {
  id: number | string;
  date: string;
  fee: number;
  paid: number;
  paymentType?: "cash" | "upi";
  visitedDoctor?: string;
}

interface Patient {
  id: string;
  name: string;
  visitedDays: string[];
}

const dayKeyUTC = (d: Date) =>
  new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();

type PaymentMap = Record<
  string,
  { fee: number; paid: number; paymentType?: "cash" | "upi"; visitedDoctor?: string }
>;

const DEFAULT_FEE = 300;

const CalendarView: React.FC<CalendarViewProps> = ({ patientId }) => {
  const theme = useTheme();
  const notify = useNotify();
  const refresh = useRefresh();
  const dataProvider = useDataProvider();

  const { data, isLoading, error } = useGetOne<Patient>("patients", {
    id: patientId,
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [linkedDoctorId, setLinkedDoctorId] = useState<string | null>(null);
  const [doctorChoices, setDoctorChoices] = useState<Array<{ id: string; name: string }>>([]);
  const [visitedKeys, setVisitedKeys] = useState<string[]>([]);
  const [payments, setPayments] = useState<PaymentMap>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [fee, setFee] = useState<number>(DEFAULT_FEE);
  const [status, setStatus] = useState<"Paid" | "Unpaid">("Unpaid");
  const [paymentType, setPaymentType] = useState<"cash" | "upi">("upi");
  const [visitedDoctor, setVisitedDoctor] = useState<string>("");
  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());
  const [showMonthSummary, setShowMonthSummary] = useState(false);
  const [showOverallSummary, setShowOverallSummary] = useState(false);

  // NEW: standalone Un-visit date state
  const [unvisitDate, setUnvisitDate] = useState<string>("");

  useEffect(() => {
    const role = localStorage.getItem("role");
    const docId = localStorage.getItem("linkedDoctorId");
    setIsAdmin(role === "admin");
    setLinkedDoctorId(docId && docId !== "null" ? docId : null);

    if (role === "admin") {
      dataProvider
        .getList("doctors", {
          pagination: { page: 1, perPage: 1000 },
          sort: { field: "name", order: "ASC" },
          filter: {},
        })
        .then((resp) => {
          const opts = (resp.data || []).map((d) => ({
            id: d.id ?? d._id,
            name: d.name,
          }));
          setDoctorChoices(opts);
        })
        .catch(() => setDoctorChoices([]));
    }
  }, [dataProvider]);

  useEffect(() => {
    if (data?.visitedDays) {
      const keys = data.visitedDays.map((s) => dayKeyUTC(new Date(s)));
      setVisitedKeys(Array.from(new Set(keys)));
    }
  }, [data]);

  useEffect(() => {
    const loadPayments = async () => {
      try {
        const resp = await dataProvider.getList<PaymentRecord>(
          `patients/${patientId}/visit-payments`,
          {
            pagination: { page: 1, perPage: 10000 },
            sort: { field: "date", order: "ASC" },
            filter: {},
          }
        );
        const map: PaymentMap = {};
        resp.data.forEach((row) => {
          if (!row?.date) return;
          const k = new Date(row.date).toISOString();
          map[k] = {
            fee: Number(row.fee || 0),
            paid: Number(row.paid || 0),
            paymentType: (row.paymentType as "cash" | "upi") ?? "upi",
            visitedDoctor: row.visitedDoctor ?? "",
          };
        });
        setPayments(map);
      } catch {
        // ignore if endpoint not available
      }
    };
    loadPayments();
  }, [dataProvider, patientId]);

  const lastPaidAmount: number | null = useMemo(() => {
    const keys = Object.keys(payments);
    if (!keys.length) return null;
    keys.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    for (const k of keys) {
      const p = payments[k];
      if (p && Number(p.paid) > 0) return Number(p.paid);
    }
    return null;
  }, [payments]);

  const visitedKeySet = useMemo(() => new Set(visitedKeys), [visitedKeys]);
  const paymentKeySet = useMemo(() => new Set(Object.keys(payments)), [payments]);
  const allKeySet = useMemo(
    () => new Set([...visitedKeys, ...Array.from(paymentKeySet)]),
    [visitedKeys, paymentKeySet]
  );

  const hasVisit = (key: string) => visitedKeySet.has(key);
  const hasAnyActivity = (key: string) => visitedKeySet.has(key) || paymentKeySet.has(key);

  const monthKeys = useMemo(() => {
    const targetMonth = activeStartDate.getMonth();
    const targetYear = activeStartDate.getFullYear();
    return Array.from(allKeySet).filter((k) => {
      const dLocal = new Date(k);
      return dLocal.getMonth() === targetMonth && dLocal.getFullYear() === targetYear;
    });
  }, [allKeySet, activeStartDate]);

  const monthLabel = useMemo(
    () =>
      activeStartDate.toLocaleString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [activeStartDate]
  );

  const monthSummary = useMemo(() => {
    const totalFee = monthKeys.reduce((acc, k) => acc + (payments[k]?.fee ?? 0), 0);
    const totalPaid = monthKeys.reduce((acc, k) => acc + (payments[k]?.paid ?? 0), 0);
    const totalDue = monthKeys.reduce(
      (acc, k) => acc + ((payments[k]?.fee ?? 0) - (payments[k]?.paid ?? 0)),
      0
    );
    const paidCount = monthKeys.filter((k) => {
      const p = payments[k];
      return p && p.paid >= p.fee;
    }).length;
    const unpaidCount = monthKeys.length - paidCount;
    return { totalFee, totalPaid, totalDue, paidCount, unpaidCount, visits: monthKeys.length };
  }, [monthKeys, payments]);

  const overallSummary = useMemo(() => {
    const allKeys = Array.from(allKeySet);
    const totalFee = allKeys.reduce((acc, k) => acc + (payments[k]?.fee ?? 0), 0);
    const totalPaid = allKeys.reduce((acc, k) => acc + (payments[k]?.paid ?? 0), 0);
    const totalDue = allKeys.reduce(
      (acc, k) => acc + ((payments[k]?.fee ?? 0) - (payments[k]?.paid ?? 0)),
      0
    );
    const paidCount = allKeys.filter((k) => {
      const p = payments[k];
      return p && p.paid >= p.fee;
    }).length;
    const unpaidCount = allKeys.length - paidCount;
    return { totalFee, totalPaid, totalDue, paidCount, unpaidCount, visits: allKeys.length };
  }, [allKeySet, payments]);

  if (isLoading) return <Loading />;
  if (error)
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography color="error">Error loading visits: {error.message}</Typography>
      </Paper>
    );

  const handleDayClick = (date: Date) => {
    const key = dayKeyUTC(date);
    const pay = payments[key];
    const existingFee = pay?.fee ?? null;

    const defaultAmount =
      existingFee !== null && existingFee !== undefined
        ? existingFee
        : lastPaidAmount !== null
        ? lastPaidAmount
        : DEFAULT_FEE;

    setSelectedDate(date);
    setFee(defaultAmount);
    setStatus(pay && pay.paid >= (existingFee ?? defaultAmount) ? "Paid" : "Unpaid");
    setPaymentType((pay?.paymentType as "cash" | "upi") ?? "upi");

    if (isAdmin) {
      setVisitedDoctor(pay?.visitedDoctor ?? "");
    } else {
      setVisitedDoctor(linkedDoctorId ?? "");
    }
  };

  const handleSave = async () => {
    if (!selectedDate) return;

    const key = dayKeyUTC(selectedDate);
    const alreadyVisited = hasVisit(key);
    const paidAmount = status === "Paid" ? fee : 0;
    const finalVisitedDoctor = isAdmin ? visitedDoctor : linkedDoctorId ?? "";

    if (!finalVisitedDoctor) {
      notify("Doctor is required", { type: "warning" });
      return;
    }

    try {
      await dataProvider.create(`patients/${patientId}/visit-payment`, {
        data: {
          date: key,
          fee,
          paid: paidAmount,
          paymentType,
          visitedDoctor: finalVisitedDoctor,
        },
      });

      setPayments((p) => ({
        ...p,
        [key]: {
          fee,
          paid: paidAmount,
          paymentType,
          visitedDoctor: finalVisitedDoctor,
        },
      }));

      notify(alreadyVisited ? "Payment updated" : "Visit marked & payment saved", {
        type: "success",
      });
      setSelectedDate(null);
      refresh();
    } catch (err) {
      const msg =
        err instanceof HttpError ? err.message : (err as Error)?.message || "Failed";
      notify(msg, { type: "warning" });
    }
  };

  const handleUnmark = async () => {
    if (!selectedDate) return;
    const key = dayKeyUTC(selectedDate);

    if (!hasAnyActivity(key)) {
      notify("No visit or payment found for this date.", { type: "info" });
      return;
    }

    try {
      await dataProvider.create(`patients/${patientId}/unmark-visit`, {
        data: { visitDate: key },
      });
      setVisitedKeys((prev) => prev.filter((k) => k !== key));
      setPayments((p) => {
        const c = { ...p };
        delete c[key];
        return c;
      });
      notify("Un-visited & removed payment", { type: "success" });
      setSelectedDate(null);
      refresh();
    } catch {
      notify("Failed to un-visit", { type: "warning" });
    }
  };

  // NEW: Un-visit by date (without opening the editor)
  const handleUnvisitByDate = async () => {
    if (!unvisitDate) {
      notify("Please select a date to un-visit.", { type: "warning" });
      return;
    }
    const date = new Date(`${unvisitDate}T00:00:00`);
    const key = dayKeyUTC(date);

    if (!hasAnyActivity(key)) {
      notify("No visit or payment found for the selected date.", { type: "info" });
      return;
    }

    try {
      await dataProvider.create(`patients/${patientId}/unmark-visit`, {
        data: { visitDate: key },
      });

      setVisitedKeys((prev) => prev.filter((k) => k !== key));
      setPayments((p) => {
        const c = { ...p };
        delete c[key];
        return c;
      });

      if (selectedDate && dayKeyUTC(selectedDate) === key) {
        setSelectedDate(null);
      }

      notify("Un-visited & removed payment for the selected date.", { type: "success" });
      refresh();
    } catch {
      notify("Failed to un-visit the selected date.", { type: "warning" });
    }
  };

  const tileContent = ({ date, view }: { date: Date; view: string }): React.ReactNode => {
    if (view !== "month") return null;
    const key = dayKeyUTC(date);

    if (!hasAnyActivity(key)) return null;

    const pay = payments[key];
    const fullyPaid = pay ? pay.paid >= pay.fee : false;

    return (
      <Box
        sx={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: fullyPaid
            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
            : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          boxShadow: fullyPaid
            ? `0 2px 4px ${alpha("#10b981", 0.4)}`
            : `0 2px 4px ${alpha("#f59e0b", 0.4)}`,
        }}
      />
    );
  };

  const onMonthChange = (p: { activeStartDate: Date | null }) => {
    if (p?.activeStartDate) setActiveStartDate(p.activeStartDate);
  };

  return (
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
              <CalendarTodayIcon sx={{ color: "#fff", fontSize: 28 }} />
            </Box>
            <Box flex={1}>
              <Typography variant="h5" fontWeight={700}>
                {data?.name ?? "Patient"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Visit & Payment Tracker
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Main Content */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "420px 1fr" },
            gap: 3,
            alignItems: "start",
          }}
        >
          {/* Calendar Section */}
          <Paper
            elevation={0}
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
            <Stack direction="row" alignItems="center" gap={1} mb={2}>
              <CalendarTodayIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Select Visit Date
              </Typography>
            </Stack>

            <Box
              sx={{
                "& .react-calendar": {
                  width: "100%",
                  border: "none",
                  borderRadius: 3,
                  overflow: "hidden",
                  fontFamily: theme.typography.fontFamily,
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                },
                "& .react-calendar__navigation": {
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  height: 56,
                  mb: 1,
                },
                "& .react-calendar__navigation button": {
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: theme.palette.primary.main,
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                  },
                },
                "& .react-calendar__month-view__weekdays": {
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: theme.palette.text.secondary,
                },
                "& .react-calendar__tile": {
                  position: "relative",
                  height: 48,
                  fontSize: "0.9rem",
                  borderRadius: 2,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                  },
                },
                "& .react-calendar__tile--active": {
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  color: "#fff",
                  fontWeight: 700,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                },
                "& .react-calendar__tile--now": {
                  bgcolor: alpha(theme.palette.secondary.main, 0.1),
                  fontWeight: 600,
                },
              }}
            >
              <Calendar
                onClickDay={handleDayClick}
                prevLabel={<ChevronLeftIcon />}
                nextLabel={<ChevronRightIcon />}
                tileContent={tileContent}
                onActiveStartDateChange={onMonthChange}
              />
            </Box>

            {/* Legend */}
            <Stack direction="row" spacing={2} mt={2} justifyContent="center">
              <Stack direction="row" alignItems="center" gap={0.5}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    boxShadow: `0 2px 4px ${alpha("#10b981", 0.3)}`,
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Paid
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" gap={0.5}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    boxShadow: `0 2px 4px ${alpha("#f59e0b", 0.3)}`,
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Unpaid
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          {/* Right Column */}
          <Stack spacing={3}>
            {/* Editor */}
            {selectedDate && (
              <Fade in timeout={400}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    background: alpha("#fff", 0.9),
                    backdropFilter: "blur(10px)",
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.12)}`,
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        {selectedDate.toLocaleDateString("en-IN", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {hasVisit(dayKeyUTC(selectedDate))
                          ? "Edit visit payment details"
                          : "Add new visit and payment"}
                      </Typography>
                    </Box>
                    <Chip
                      icon={
                        status === "Paid" ? (
                          <CheckCircleIcon sx={{ fontSize: 16 }} />
                        ) : (
                          <CancelIcon sx={{ fontSize: 16 }} />
                        )
                      }
                      label={status}
                      color={status === "Paid" ? "success" : "warning"}
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                      gap: 2,
                      mb: 3,
                    }}
                  >
                    <TextField
                      label="Amount"
                      type="number"
                      size="small"
                      value={fee}
                      onChange={(e) => setFee(Number(e.target.value))}
                      fullWidth
                      inputProps={{ min: 0 }}
                      sx={{ bgcolor: "#fff" }}
                      InputProps={{
                        startAdornment: (
                          <Typography sx={{ mr: 1, color: "text.secondary" }}>₹</Typography>
                        ),
                      }}
                    />

                    <TextField
                      select
                      label="Payment Type"
                      size="small"
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value as "cash" | "upi")}
                      fullWidth
                      sx={{ bgcolor: "#fff" }}
                    >
                      <MenuItem value="upi">💳 UPI</MenuItem>
                      <MenuItem value="cash">💵 Cash</MenuItem>
                    </TextField>

                    {isAdmin ? (
                      <TextField
                        select
                        label="Visited Doctor"
                        size="small"
                        value={visitedDoctor}
                        onChange={(e) => setVisitedDoctor(e.target.value)}
                        fullWidth
                        sx={{ bgcolor: "#fff" }}
                      >
                        {doctorChoices.map((d) => (
                          <MenuItem key={d.id} value={d.id}>
                            {d.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: alpha(theme.palette.info.main, 0.1),
                          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                        }}
                      >
                        <LocalHospitalIcon sx={{ color: theme.palette.info.main, fontSize: 20 }} />
                        <Typography variant="body2" fontWeight={600} color="info.main">
                          Dr. {doctorChoices.find((d) => d.id === linkedDoctorId)?.name || "You"}
                        </Typography>
                      </Box>
                    )}

                    <TextField
                      select
                      label="Payment Status"
                      size="small"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as "Paid" | "Unpaid")}
                      fullWidth
                      sx={{ bgcolor: "#fff" }}
                    >
                      <MenuItem value="Paid">✅ Paid</MenuItem>
                      <MenuItem value="Unpaid">❌ Unpaid</MenuItem>
                    </TextField>
                  </Box>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      startIcon={<SaveIcon />}
                      onClick={handleSave}
                      sx={{
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                        "&:hover": {
                          boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                        },
                      }}
                    >
                      {hasVisit(dayKeyUTC(selectedDate)) ? "Update Payment" : "Save Visit"}
                    </Button>

                    {/** CHANGED: show Un-visit button when there is any activity (visit or payment) */}
                    {hasAnyActivity(dayKeyUTC(selectedDate)) && (
                      <Button
                        variant="outlined"
                        size="large"
                        color="error"
                        fullWidth
                        startIcon={<DeleteIcon />}
                        onClick={handleUnmark}
                        sx={{
                          borderWidth: 2,
                          "&:hover": {
                            borderWidth: 2,
                            bgcolor: alpha(theme.palette.error.main, 0.05),
                          },
                        }}
                      >
                        Un-visit
                      </Button>
                    )}
                  </Stack>
                </Paper>
              </Fade>
            )}

            {/* Month Summary */}
            <Paper
              elevation={0}
              sx={{
                borderRadius: 4,
                overflow: "hidden",
                background: alpha("#fff", 0.9),
                backdropFilter: "blur(10px)",
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
              <Box
                sx={{
                  p: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
                onClick={() => setShowMonthSummary(!showMonthSummary)}
              >
                <Stack direction="row" alignItems="center" gap={1.5}>
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
                    <CalendarTodayIcon sx={{ color: "#fff", fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {monthLabel}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {monthSummary.visits} visits this month
                    </Typography>
                  </Box>
                </Stack>
                <IconButton
                  size="small"
                  sx={{
                    transform: showMonthSummary ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.3s",
                  }}
                >
                  <ExpandMoreIcon />
                </IconButton>
              </Box>

              <Collapse in={showMonthSummary}>
                <Box sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: 2,
                    }}
                  >
                    {[
                      { label: "Total Fee", value: `₹${monthSummary.totalFee}`, color: "#6366f1", icon: PaymentIcon },
                      { label: "Paid", value: `₹${monthSummary.totalPaid}`, color: "#10b981", icon: CheckCircleIcon },
                      { label: "Due", value: `₹${monthSummary.totalDue}`, color: "#f59e0b", icon: CancelIcon },
                      { label: "Paid Count", value: monthSummary.paidCount, color: "#10b981", icon: CheckCircleIcon },
                      { label: "Unpaid Count", value: monthSummary.unpaidCount, color: "#f59e0b", icon: CancelIcon },
                    ].map((stat) => (
                      <Card
                        key={stat.label}
                        sx={{
                          bgcolor: alpha(stat.color, 0.05),
                          borderLeft: `4px solid ${stat.color}`,
                          boxShadow: "none",
                        }}
                      >
                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                          <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                            <stat.icon sx={{ fontSize: 16, color: stat.color }} />
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              {stat.label}
                            </Typography>
                          </Stack>
                          <Typography variant="h6" fontWeight={700} sx={{ color: stat.color }}>
                            {stat.value}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Box>
              </Collapse>
            </Paper>

            {/* Overall Summary */}
            <Paper
              elevation={0}
              sx={{
                borderRadius: 4,
                overflow: "hidden",
                background: alpha("#fff", 0.9),
                backdropFilter: "blur(10px)",
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
              <Box
                sx={{
                  p: 2,
                  bgcolor: alpha(theme.palette.secondary.main, 0.05),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
                onClick={() => setShowOverallSummary(!showOverallSummary)}
              >
                <Stack direction="row" alignItems="center" gap={1.5}>
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
                    <PersonIcon sx={{ color: "#fff", fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Overall Summary
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {overallSummary.visits} total visits
                    </Typography>
                  </Box>
                </Stack>
                <IconButton
                  size="small"
                  sx={{
                    transform: showOverallSummary ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.3s",
                  }}
                >
                  <ExpandMoreIcon />
                </IconButton>
              </Box>

              <Collapse in={showOverallSummary}>
                <Box sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: 2,
                    }}
                  >
                    {[
                      { label: "Total Fee", value: `₹${overallSummary.totalFee}`, color: "#6366f1", icon: PaymentIcon },
                      { label: "Total Paid", value: `₹${overallSummary.totalPaid}`, color: "#10b981", icon: CheckCircleIcon },
                      { label: "Total Due", value: `₹${overallSummary.totalDue}`, color: "#f59e0b", icon: CancelIcon },
                      { label: "Paid Visits", value: overallSummary.paidCount, color: "#10b981", icon: CheckCircleIcon },
                      { label: "Unpaid Visits", value: overallSummary.unpaidCount, color: "#f59e0b", icon: CancelIcon },
                    ].map((stat) => (
                      <Card
                        key={stat.label}
                        sx={{
                          bgcolor: alpha(stat.color, 0.05),
                          borderLeft: `4px solid ${stat.color}`,
                          boxShadow: "none",
                        }}
                      >
                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                          <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                            <stat.icon sx={{ fontSize: 16, color: stat.color }} />
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              {stat.label}
                            </Typography>
                          </Stack>
                          <Typography variant="h6" fontWeight={700} sx={{ color: stat.color }}>
                            {stat.value}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>

                  {/* Collection Rate */}
                  {overallSummary.totalFee > 0 && (
                    <Box
                      sx={{
                        mt: 3,
                        p: 2,
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.info.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2" fontWeight={600} color="text.secondary">
                          Collection Rate
                        </Typography>
                        <Typography variant="h6" fontWeight={700} color="info.main">
                          {((overallSummary.totalPaid / overallSummary.totalFee) * 100).toFixed(1)}%
                        </Typography>
                      </Stack>
                      <Box
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: alpha(theme.palette.info.main, 0.1),
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            height: "100%",
                            width: `${(overallSummary.totalPaid / overallSummary.totalFee) * 100}%`,
                            background: `linear-gradient(90deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                            borderRadius: 4,
                            transition: "width 0.5s ease",
                          }}
                        />
                      </Box>
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Paper>

            {/* Quick Stats Cards */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                gap: 2,
              }}
            >
              {[
                {
                  label: "Last Payment",
                  value: lastPaidAmount ? `₹${lastPaidAmount}` : "—",
                  color: "#6366f1",
                  icon: PaymentIcon,
                },
                {
                  label: "Avg. Fee/Visit",
                  value:
                    overallSummary.visits > 0
                      ? `₹${Math.round(overallSummary.totalFee / overallSummary.visits)}`
                      : "—",
                  color: "#ec4899",
                  icon: CalendarTodayIcon,
                },
                {
                  label: "This Month",
                  value: `${monthSummary.visits} visits`,
                  color: "#8b5cf6",
                  icon: CalendarTodayIcon,
                },
              ].map((stat) => (
                <Card
                  key={stat.label}
                  sx={{
                    background: `linear-gradient(135deg, ${alpha(stat.color, 0.05)} 0%, ${alpha(
                      stat.color,
                      0.02
                    )} 100%)`,
                    border: `1px solid ${alpha(stat.color, 0.1)}`,
                    boxShadow: "none",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: `0 8px 20px ${alpha(stat.color, 0.15)}`,
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {stat.label}
                      </Typography>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 2,
                          background: `linear-gradient(135deg, ${stat.color} 0%, ${alpha(
                            stat.color,
                            0.8
                          )} 100%)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <stat.icon sx={{ color: "#fff", fontSize: 18 }} />
                      </Box>
                    </Stack>
                    <Typography variant="h6" fontWeight={700} sx={{ color: stat.color }}>
                      {stat.value}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>

            {/* NEW: Un-visit by Date (Global) */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                background: alpha("#fff", 0.9),
                backdropFilter: "blur(10px)",
                border: `1px solid ${alpha(theme.palette.error.main, 0.15)}`,
              }}
            >
              <Stack direction="row" alignItems="center" gap={1.5} mb={2}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CancelIcon sx={{ color: "#fff", fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Un-visit by Date
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Remove visit & payment for a specific date
                  </Typography>
                </Box>
              </Stack>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr auto" }, gap: 1.5 }}>
                <TextField
                  type="date"
                  label="Select Date"
                  size="small"
                  value={unvisitDate}
                  onChange={(e) => setUnvisitDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ bgcolor: "#fff" }}
                />
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleUnvisitByDate}
                  sx={{
                    borderWidth: 2,
                    "&:hover": { borderWidth: 2, bgcolor: alpha(theme.palette.error.main, 0.05) },
                    height: 40,
                  }}
                >
                  Un-visit
                </Button>
              </Box>
            </Paper>
          </Stack>
        </Box>
      </Box>
    </Fade>
  );
};

export default CalendarView;
