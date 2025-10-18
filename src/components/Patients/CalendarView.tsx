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
  Divider,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Chip,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/DeleteOutline";

interface CalendarViewProps {
  patientId: string;
}

interface PaymentRecord {
  id: number | string;
  date: string; // ISO; API uses UTC midnight (YYYY-MM-DDT00:00:00.000Z)
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

// Canonical day key: UTC midnight ISO for the local date shown in the UI
const dayKeyUTC = (d: Date) =>
  new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();

type PaymentMap = Record<
  string,
  { fee: number; paid: number; paymentType?: "cash" | "upi"; visitedDoctor?: string }
>;

const DEFAULT_FEE = 300;

const CalendarView: React.FC<CalendarViewProps> = ({ patientId }) => {
  const notify = useNotify();
  const refresh = useRefresh();
  const dataProvider = useDataProvider();

  const { data, isLoading, error } = useGetOne<Patient>("patients", {
    id: patientId,
  });

  // Auth / role info
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [linkedDoctorId, setLinkedDoctorId] = useState<string | null>(null);

  // Doctors list (for admin selector)
  const [doctorChoices, setDoctorChoices] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const role = localStorage.getItem("role"); // "admin" | "doctor" | ...
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

  // VISITS as **UTC keys** (strings)
  const [visitedKeys, setVisitedKeys] = useState<string[]>([]);
  const [payments, setPayments] = useState<PaymentMap>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Editor fields
  const [fee, setFee] = useState<number>(DEFAULT_FEE);
  const [status, setStatus] = useState<"Paid" | "Unpaid">("Unpaid");
  const [paymentType, setPaymentType] = useState<"cash" | "upi">("upi");
  const [visitedDoctor, setVisitedDoctor] = useState<string>("");

  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());

  /** Load visited days -> normalize to UTC keys */
  useEffect(() => {
    if (data?.visitedDays) {
      const keys = data.visitedDays.map((s) => dayKeyUTC(new Date(s)));
      setVisitedKeys(Array.from(new Set(keys)));
    }
  }, [data]);

  /** Load payments (map keyed by UTC midnight ISO) */
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
          const k = new Date(row.date).toISOString(); // already UTC midnight
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

  /** Compute patient's last paid amount (latest payment with paid > 0). */
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

  /** Sets for fast membership tests */
  const visitedKeySet = useMemo(() => new Set(visitedKeys), [visitedKeys]);
  const paymentKeySet = useMemo(() => new Set(Object.keys(payments)), [payments]);
  const allKeySet = useMemo(
    () => new Set([...visitedKeys, ...Array.from(paymentKeySet)]),
    [visitedKeys, paymentKeySet]
  );

  /** Helper predicates (by key) */
  const hasVisit = (key: string) => visitedKeySet.has(key);
  const hasAnyActivity = (key: string) => visitedKeySet.has(key) || paymentKeySet.has(key);

  /** Month filtering using LOCAL month (matches calendar UI) */
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

  /** Early returns */
  if (isLoading) return <Loading />;
  if (error)
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography color="error">Error loading visits: {error.message}</Typography>
      </Paper>
    );

  /** Event handlers */

  // Single click opens editor (double-click behavior removed)
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
      if (!alreadyVisited) {
        await dataProvider.create(`patients/${patientId}/mark-visit`, {
          data: { visitDate: key },
        });
        setVisitedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
      }

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

    if (!hasVisit(key)) {
      notify("No visit marked for this date.", { type: "info" });
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
      notify("Unmarked visit & removed payment", { type: "success" });
      setSelectedDate(null);
      refresh();
    } catch {
      notify("Failed to unmark visit", { type: "warning" });
    }
  };

  /** Calendar rendering helpers */
  const tileContent = ({ date, view }: { date: Date; view: string }): React.ReactNode => {
    if (view !== "month") return null;
    const key = dayKeyUTC(date);

    if (!hasAnyActivity(key)) return null;

    const pay = payments[key];
    const fullyPaid = pay ? pay.paid >= pay.fee : false;
    const color = fullyPaid ? "#2e7d32" : "#ed6c02";

    return (
      <span
        style={{
          display: "inline-block",
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          marginLeft: 4,
          marginTop: 2,
        }}
      />
    );
  };

  const onMonthChange = (p: { activeStartDate: Date | null }) => {
    if (p?.activeStartDate) setActiveStartDate(p.activeStartDate);
  };

  /** Render */
  return (
    <Paper
      sx={{
        p: { xs: 2, sm: 3 },
        maxWidth: 900,
        mx: "auto",
      }}
    >
      <Typography variant="h6" fontWeight={600} gutterBottom noWrap sx={{ mb: 1 }}>
        {data?.name ?? "Patient"} — Visit & Payment Tracker
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {/* Responsive: stack column on xs/sm, row on md+ */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 2, md: 3 }}
        alignItems={{ xs: "stretch", md: "flex-start" }}
        sx={{ width: "100%" }}
      >
        {/* Calendar wraps and scales */}
        <Box
          sx={{
            flex: { md: "0 0 360px" },
            width: { xs: "100%", md: 360 },
            "& .react-calendar": {
              width: "100%",
              borderRadius: 2,
              border: "1px solid #e0e0e0",
              overflow: "hidden",
            },
            "& .react-calendar__tile": {
              p: 0.5,
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

        {selectedDate && (
          <Box
            sx={{
              flex: 1,
              border: "1px solid #e0e0e0",
              borderRadius: 2,
              bgcolor: "#fafafa",
              p: 2,
              minWidth: { xs: "100%", md: 0 },
            }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              {selectedDate.toLocaleDateString()}
            </Typography>

            {/* Responsive field stack */}
            <Stack
              direction="column"
              spacing={2}
              alignItems="stretch"
              sx={{ mt: 2 }}
            >
              <TextField
                label="Amount"
                type="number"
                size="small"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                fullWidth
                inputProps={{ min: 0 }}
              />

              {/* Payment Type */}
              <TextField
                select
                label="Payment Type"
                size="small"
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as "cash" | "upi")}
                fullWidth
              >
                <MenuItem value="upi">UPI</MenuItem>
                <MenuItem value="cash">Cash</MenuItem>
              </TextField>

              {/* Visited Doctor */}
              {isAdmin ? (
                <TextField
                  select
                  label="Visited Doctor"
                  size="small"
                  value={visitedDoctor}
                  onChange={(e) => setVisitedDoctor(e.target.value)}
                  fullWidth
                >
                  {doctorChoices.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <Chip
                  label={`Doctor: ${
                    doctorChoices.find((d) => d.id === linkedDoctorId)?.name || "You"
                  }`}
                  sx={{ height: 32, maxWidth: "100%" }}
                />
              )}

              {/* Paid/Unpaid */}
              <TextField
                select
                label="Payment"
                size="small"
                value={status}
                onChange={(e) => setStatus(e.target.value as "Paid" | "Unpaid")}
                fullWidth
              >
                <MenuItem value="Paid">✅ Paid</MenuItem>
                <MenuItem value="Unpaid">❌ Unpaid</MenuItem>
              </TextField>

              {/* Buttons: wrap on small screens */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                useFlexGap
                flexWrap="wrap"
              >
                <Button variant="contained" onClick={handleSave} sx={{ minWidth: 180 }}>
                  {hasVisit(dayKeyUTC(selectedDate)) ? "Save Payment" : "Save (Mark + Payment)"}
                </Button>
                {hasVisit(dayKeyUTC(selectedDate)) && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleUnmark}
                    sx={{ minWidth: 220 }}
                  >
                    Unmark & Remove Payment
                  </Button>
                )}
              </Stack>

              <Typography variant="caption" display="block" mt={0.5} color="text.secondary">
                Tap a day to edit its visit/payment.
              </Typography>
            </Stack>
          </Box>
        )}
      </Stack>

      {/* Month Summary */}
      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle2" fontWeight={700}>
        {monthLabel} Summary
      </Typography>
      {/* Make table horizontally scrollable on small screens */}
      <Box sx={{ mt: 1, overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 420 }}>
          <TableBody>
            <TableRow>
              <TableCell>Visits</TableCell>
              <TableCell align="right">{monthKeys.length}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Paid</TableCell>
              <TableCell align="right" sx={{ color: "success.main" }}>
                {
                  monthKeys.filter((k) => {
                    const p = payments[k];
                    return p && p.paid >= p.fee;
                  }).length
                }
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Unpaid</TableCell>
              <TableCell align="right" sx={{ color: "warning.main" }}>
                {
                  monthKeys.filter((k) => {
                    const p = payments[k];
                    return !(p && p.paid >= p.fee);
                  }).length
                }
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Total Fee</TableCell>
              <TableCell align="right">
                {monthKeys.reduce((acc, k) => acc + (payments[k]?.fee ?? 0), 0)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Total Paid</TableCell>
              <TableCell align="right" sx={{ color: "success.main" }}>
                {monthKeys.reduce((acc, k) => acc + (payments[k]?.paid ?? 0), 0)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Total Due</TableCell>
              <TableCell
                align="right"
                sx={{
                  color:
                    monthKeys.reduce(
                      (acc, k) => acc + ((payments[k]?.fee ?? 0) - (payments[k]?.paid ?? 0)),
                      0
                    ) > 0
                      ? "error.main"
                      : "text.secondary",
                }}
              >
                {
                  monthKeys.reduce(
                    (acc, k) => acc + ((payments[k]?.fee ?? 0) - (payments[k]?.paid ?? 0)),
                    0
                  )
                }
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>

      {/* Overall Summary */}
      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle2" fontWeight={700}>
        Overall Summary
      </Typography>
      <Box sx={{ mt: 1, overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 420 }}>
          <TableBody>
            <TableRow>
              <TableCell>Total Visits</TableCell>
              <TableCell align="right">{Array.from(allKeySet).length}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Paid</TableCell>
              <TableCell align="right" sx={{ color: "success.main" }}>
                {
                  Array.from(allKeySet).filter((k) => {
                    const p = payments[k];
                    return p && p.paid >= p.fee;
                  }).length
                }
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Unpaid</TableCell>
              <TableCell align="right" sx={{ color: "warning.main" }}>
                {
                  Array.from(allKeySet).filter((k) => {
                    const p = payments[k];
                    return !(p && p.paid >= p.fee);
                  }).length
                }
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Total Fee</TableCell>
              <TableCell align="right">
                {Array.from(allKeySet).reduce((acc, k) => acc + (payments[k]?.fee ?? 0), 0)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Total Paid</TableCell>
              <TableCell align="right" sx={{ color: "success.main" }}>
                {Array.from(allKeySet).reduce((acc, k) => acc + (payments[k]?.paid ?? 0), 0)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Total Due</TableCell>
              <TableCell
                align="right"
                sx={{
                  color:
                    Array.from(allKeySet).reduce(
                      (acc, k) => acc + ((payments[k]?.fee ?? 0) - (payments[k]?.paid ?? 0)),
                      0
                    ) > 0
                      ? "error.main"
                      : "text.secondary",
                }}
              >
                {
                  Array.from(allKeySet).reduce(
                    (acc, k) => acc + ((payments[k]?.fee ?? 0) - (payments[k]?.paid ?? 0)),
                    0
                  )
                }
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
};

export default CalendarView;
