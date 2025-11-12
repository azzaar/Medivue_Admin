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
  Autocomplete,
  Drawer,
  useMediaQuery,
  FormControlLabel,
  Switch,
  Fab,
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
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import SaveAltIcon from "@mui/icons-material/SaveAlt";

interface CalendarViewProps {
  patientId: string;
}

interface PaymentRecord {
  id: number | string;
  date: string;
  fee: number;
  paid: number;
  paymentType?: "cash" | "upi" | "card" | "bank";
  visitedDoctor?: string;
  time?: string; // HH:mm format
}

interface Patient {
  id: string;
  name: string;
  visitedDays: string[];
}

interface Doctor {
  id: string;
  name: string;
}

const dayKeyUTC = (d: Date) =>
  new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();

type PaymentMap = Record<
  string,
  { fee: number; paid: number; paymentType?: "cash" | "upi" | "card" | "bank"; visitedDoctor?: string; time?: string }
>;

const DEFAULT_FEE = 300;

const CalendarViewImproved: React.FC<CalendarViewProps> = ({ patientId }) => {
  const theme = useTheme();
  const notify = useNotify();
  const refresh = useRefresh();
  const dataProvider = useDataProvider();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { data, isLoading, error } = useGetOne<Patient>("patients", {
    id: patientId,
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [linkedDoctorId, setLinkedDoctorId] = useState<string | null>(null);
  const [doctorChoices, setDoctorChoices] = useState<Doctor[]>([]);
  const [visitedKeys, setVisitedKeys] = useState<string[]>([]);
  const [payments, setPayments] = useState<PaymentMap>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [fee, setFee] = useState<number>(DEFAULT_FEE);
  const [status, setStatus] = useState<"Paid" | "Unpaid">("Unpaid");
  const [paymentType, setPaymentType] = useState<"cash" | "upi" | "card" | "bank">("upi");
  const [visitedDoctor, setVisitedDoctor] = useState<string>("");
  const [visitTime, setVisitTime] = useState<string>("10:00");
  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());
  const [showMonthSummary, setShowMonthSummary] = useState(false);
  const [showOverallSummary, setShowOverallSummary] = useState(false);

  // NEW: Multi-select mode
  const [multiSelectMode, setMultiSelectMode] = useState<boolean>(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  // NEW: Doctor filter/search
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<Doctor | null>(null);

  // Un-visit date state
  const [unvisitDate, setUnvisitDate] = useState<string>("");

  useEffect(() => {
    const role = localStorage.getItem("role");
    const docId = localStorage.getItem("linkedDoctorId");
    setIsAdmin(role === "admin" || role === "superAdmin");
    setLinkedDoctorId(docId && docId !== "null" ? docId : null);

    if (role === "admin" || role === "superAdmin") {
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
            paymentType: (row.paymentType as "cash" | "upi" | "card" | "bank") ?? "upi",
            visitedDoctor: row.visitedDoctor ?? "",
            time: row.time ?? "10:00",
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

  // Filtered keys based on doctor filter
  const filteredKeySet = useMemo(() => {
    if (!selectedDoctorFilter) return allKeySet;
    const filtered = new Set<string>();
    Array.from(allKeySet).forEach((key) => {
      const pay = payments[key];
      if (pay?.visitedDoctor === selectedDoctorFilter.id) {
        filtered.add(key);
      }
    });
    return filtered;
  }, [allKeySet, payments, selectedDoctorFilter]);

  const monthKeys = useMemo(() => {
    const targetMonth = activeStartDate.getMonth();
    const targetYear = activeStartDate.getFullYear();
    return Array.from(filteredKeySet).filter((k) => {
      const dLocal = new Date(k);
      return dLocal.getMonth() === targetMonth && dLocal.getFullYear() === targetYear;
    });
  }, [filteredKeySet, activeStartDate]);

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
    const allKeys = Array.from(filteredKeySet);
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
  }, [filteredKeySet, payments]);

  if (isLoading) return <Loading />;
  if (error)
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography color="error">Error loading visits: {error.message}</Typography>
      </Paper>
    );

  const handleDayClick = (date: Date) => {
    if (multiSelectMode) {
      const alreadySelected = selectedDates.some(
        (d) => dayKeyUTC(d) === dayKeyUTC(date)
      );
      if (alreadySelected) {
        setSelectedDates(selectedDates.filter((d) => dayKeyUTC(d) !== dayKeyUTC(date)));
      } else {
        setSelectedDates([...selectedDates, date]);
      }
    } else {
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
      setPaymentType((pay?.paymentType as "cash" | "upi" | "card" | "bank") ?? "upi");
      setVisitTime(pay?.time ?? "10:00");

      if (isAdmin) {
        setVisitedDoctor(pay?.visitedDoctor ?? "");
      } else {
        setVisitedDoctor(linkedDoctorId ?? "");
      }

      if (isMobile) {
        setDrawerOpen(true);
      }
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
          time: visitTime,
        },
      });

      setPayments((p) => ({
        ...p,
        [key]: {
          fee,
          paid: paidAmount,
          paymentType,
          visitedDoctor: finalVisitedDoctor,
          time: visitTime,
        },
      }));

      notify(alreadyVisited ? "Payment updated" : "Visit marked & payment saved", {
        type: "success",
      });
      setSelectedDate(null);
      setDrawerOpen(false);
      refresh();
    } catch (err) {
      const msg =
        err instanceof HttpError ? err.message : (err as Error)?.message || "Failed";
      notify(msg, { type: "warning" });
    }
  };

  const handleBulkSave = async () => {
    if (selectedDates.length === 0) {
      notify("Please select at least one date", { type: "warning" });
      return;
    }

    const finalVisitedDoctor = isAdmin ? visitedDoctor : linkedDoctorId ?? "";
    if (!finalVisitedDoctor) {
      notify("Doctor is required", { type: "warning" });
      return;
    }

    const paidAmount = status === "Paid" ? fee : 0;

    try {
      const promises = selectedDates.map((date) => {
        const key = dayKeyUTC(date);
        return dataProvider.create(`patients/${patientId}/visit-payment`, {
          data: {
            date: key,
            fee,
            paid: paidAmount,
            paymentType,
            visitedDoctor: finalVisitedDoctor,
            time: visitTime,
          },
        });
      });

      await Promise.all(promises);

      const newPayments = { ...payments };
      selectedDates.forEach((date) => {
        const key = dayKeyUTC(date);
        newPayments[key] = {
          fee,
          paid: paidAmount,
          paymentType,
          visitedDoctor: finalVisitedDoctor,
          time: visitTime,
        };
      });

      setPayments(newPayments);
      notify(`${selectedDates.length} visits saved successfully`, { type: "success" });
      setSelectedDates([]);
      setMultiSelectMode(false);
      setDrawerOpen(false);
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
      setDrawerOpen(false);
      refresh();
    } catch {
      notify("Failed to un-visit", { type: "warning" });
    }
  };

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

    const isSelected = selectedDates.some((d) => dayKeyUTC(d) === key);

    if (!hasAnyActivity(key) && !isSelected) return null;

    const pay = payments[key];
    const fullyPaid = pay ? pay.paid >= pay.fee : false;

    return (
      <Box
        sx={{
          position: "absolute",
          top: 4,
          right: 4,
          display: "flex",
          gap: 0.5,
        }}
      >
        {isSelected && (
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: theme.palette.primary.main,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckBoxIcon sx={{ color: "#fff", fontSize: 12 }} />
          </Box>
        )}
        {hasAnyActivity(key) && (
          <Box
            sx={{
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
        )}
      </Box>
    );
  };

  const onMonthChange = (p: { activeStartDate: Date | null }) => {
    if (p?.activeStartDate) setActiveStartDate(p.activeStartDate);
  };

  const EditorContent = (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {multiSelectMode
              ? `${selectedDates.length} dates selected`
              : selectedDate
              ? selectedDate.toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "Select a date"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {multiSelectMode
              ? "Bulk visit entry mode"
              : selectedDate && hasVisit(dayKeyUTC(selectedDate))
              ? "Edit visit payment details"
              : "Add new visit and payment"}
          </Typography>
        </Box>
        {!multiSelectMode && selectedDate && (
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
        )}
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
          onChange={(e) => setPaymentType(e.target.value as "cash" | "upi" | "card" | "bank")}
          fullWidth
          sx={{ bgcolor: "#fff" }}
        >
          <MenuItem value="upi">💳 UPI</MenuItem>
          <MenuItem value="cash">💵 Cash</MenuItem>
          <MenuItem value="card">💳 Card</MenuItem>
          <MenuItem value="bank">🏦 Bank</MenuItem>
        </TextField>

        <TextField
          label="Visit Time"
          type="time"
          size="small"
          value={visitTime}
          onChange={(e) => setVisitTime(e.target.value)}
          fullWidth
          sx={{ bgcolor: "#fff" }}
          InputProps={{
            startAdornment: (
              <AccessTimeIcon sx={{ mr: 1, color: "text.secondary", fontSize: 20 }} />
            ),
          }}
          InputLabelProps={{ shrink: true }}
        />

        {isAdmin ? (
          <Autocomplete
            value={doctorChoices.find((d) => d.id === visitedDoctor) || null}
            onChange={(_, newValue) => setVisitedDoctor(newValue?.id ?? "")}
            options={doctorChoices}
            getOptionLabel={(option) => option.name}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Visited Doctor"
                size="small"
                sx={{ bgcolor: "#fff" }}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <LocalHospitalIcon sx={{ mr: 1, color: "text.secondary", fontSize: 20 }} />
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
            fullWidth
          />
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
          onClick={multiSelectMode ? handleBulkSave : handleSave}
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            "&:hover": {
              boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
            },
          }}
        >
          {multiSelectMode
            ? `Save ${selectedDates.length} Visits`
            : selectedDate && hasVisit(dayKeyUTC(selectedDate))
            ? "Update Payment"
            : "Save Visit"}
        </Button>

        {!multiSelectMode && selectedDate && hasAnyActivity(dayKeyUTC(selectedDate)) && (
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
    </>
  );

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
          <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" gap={2} flexWrap="wrap">
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

            {/* Multi-select toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={multiSelectMode}
                  onChange={(e) => {
                    setMultiSelectMode(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedDates([]);
                    }
                    setSelectedDate(null);
                  }}
                  color="primary"
                />
              }
              label={
                <Stack direction="row" alignItems="center" gap={0.5}>
                  <CheckBoxIcon fontSize="small" />
                  <Typography variant="body2" fontWeight={600}>
                    Multi-select
                  </Typography>
                </Stack>
              }
            />
          </Stack>

          {/* Doctor Filter */}
          {isAdmin && (
            <Box mt={2}>
              <Autocomplete
                value={selectedDoctorFilter}
                onChange={(_, newValue) => setSelectedDoctorFilter(newValue)}
                options={doctorChoices}
                getOptionLabel={(option) => option.name}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Filter by doctor..."
                    size="small"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                      endAdornment: (
                        <>
                          {selectedDoctorFilter && (
                            <IconButton
                              size="small"
                              onClick={() => setSelectedDoctorFilter(null)}
                              edge="end"
                              sx={{ mr: 1 }}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          )}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                fullWidth
              />
            </Box>
          )}
        </Paper>

        {/* Main Content */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: isMobile ? "1fr" : "420px 1fr" },
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
                {multiSelectMode ? "Select Multiple Dates" : "Select Visit Date"}
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
                  minWidth: 44,
                  minHeight: 44,
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
                  height: { xs: 56, sm: 48 },
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
            <Stack direction="row" spacing={2} mt={2} justifyContent="center" flexWrap="wrap">
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
              {multiSelectMode && (
                <Stack direction="row" alignItems="center" gap={0.5}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: theme.palette.primary.main,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CheckBoxIcon sx={{ color: "#fff", fontSize: 8 }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Selected
                  </Typography>
                </Stack>
              )}
            </Stack>

            {multiSelectMode && selectedDates.length > 0 && (
              <Box mt={2}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<CloseIcon />}
                  onClick={() => setSelectedDates([])}
                  size="small"
                >
                  Clear {selectedDates.length} selected
                </Button>
              </Box>
            )}
          </Paper>

          {/* Right Column */}
          <Stack spacing={3}>
            {/* Editor - Desktop */}
            {!isMobile && (selectedDate || (multiSelectMode && selectedDates.length > 0)) && (
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
                  {EditorContent}
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

            {/* Un-visit by Date */}
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

        {/* Mobile Drawer */}
        {isMobile && (
          <>
            <Drawer
              anchor="bottom"
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              PaperProps={{
                sx: {
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  maxHeight: "90vh",
                  p: 3,
                },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.text.primary, 0.2),
                  mx: "auto",
                  mb: 3,
                }}
              />
              {EditorContent}
            </Drawer>

            {/* FAB for multi-select */}
            {multiSelectMode && selectedDates.length > 0 && (
              <Fab
                variant="extended"
                color="primary"
                onClick={() => setDrawerOpen(true)}
                sx={{
                  position: "fixed",
                  bottom: 24,
                  right: 24,
                  boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
                }}
              >
                <SaveAltIcon sx={{ mr: 1 }} />
                Save {selectedDates.length} Visits
              </Fab>
            )}
          </>
        )}
      </Box>
    </Fade>
  );
};

export default CalendarViewImproved;
