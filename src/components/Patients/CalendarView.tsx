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
import PaidIcon from "@mui/icons-material/CheckCircle";
import UnpaidIcon from "@mui/icons-material/ErrorOutline";
import DeleteIcon from "@mui/icons-material/DeleteOutline";

interface CalendarViewProps {
  patientId: string;
}

interface PaymentRecord {
  id: number | string;
  date: string; // ISO string; API uses UTC midnight (YYYY-MM-DDT00:00:00.000Z)
  fee: number;
  paid: number;
}

interface Patient {
  id: string;
  name: string;
  visitedDays: string[]; // ISO strings (any time)
}

// Canonical day key: UTC midnight ISO for the local date shown in the UI
const dayKeyUTC = (d: Date) =>
  new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();

type PaymentMap = Record<string, { fee: number; paid: number }>;

const DEFAULT_FEE = 300;

const CalendarView: React.FC<CalendarViewProps> = ({ patientId }) => {
  const notify = useNotify();
  const refresh = useRefresh();
  const dataProvider = useDataProvider();

  const { data, isLoading, error } = useGetOne<Patient>("patients", {
    id: patientId,
  });

  // Store VISITS as **UTC keys** (strings), not Date objects → no tz drift
  const [visitedKeys, setVisitedKeys] = useState<string[]>([]);
  const [payments, setPayments] = useState<PaymentMap>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [fee, setFee] = useState<number>(DEFAULT_FEE);
  const [status, setStatus] = useState<"Paid" | "Unpaid">("Unpaid");
  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());

  /** Load visited days -> normalize to UTC keys */
  useEffect(() => {
    if (data?.visitedDays) {
      const keys = data.visitedDays.map((s) => dayKeyUTC(new Date(s)));
      // ensure unique
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
          map[k] = { fee: Number(row.fee || 0), paid: Number(row.paid || 0) };
        });
        setPayments(map);
      } catch {
        // ignore if endpoint not available
      }
    };
    loadPayments();
  }, [dataProvider, patientId]);

  /** Sets for fast membership tests */
  const visitedKeySet = useMemo(() => new Set(visitedKeys), [visitedKeys]);
  const paymentKeySet = useMemo(
    () => new Set(Object.keys(payments)),
    [payments]
  );
  const allKeySet = useMemo(
    () => new Set([...visitedKeys, ...Array.from(paymentKeySet)]),
    [visitedKeys, paymentKeySet]
  );

  /** Helper predicates (by key) */
  const hasVisit = (key: string) => visitedKeySet.has(key);
  const hasAnyActivity = (key: string) =>
    visitedKeySet.has(key) || paymentKeySet.has(key);

  /** Month filtering using LOCAL month (matches calendar UI) */
  const monthKeys = useMemo(() => {
    const targetMonth = activeStartDate.getMonth();
    const targetYear = activeStartDate.getFullYear();
    return Array.from(allKeySet).filter((k) => {
      const dLocal = new Date(k); // new Date(UTC ISO) renders to local time (same calendar day)
      return (
        dLocal.getMonth() === targetMonth && dLocal.getFullYear() === targetYear
      );
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
      <Paper sx={{ p: 2 }}>
        <Typography color="error">
          Error loading visits: {error.message}
        </Typography>
      </Paper>
    );

  /** Event handlers */
  const handleDayClick = (
    date: Date,
    evt: React.MouseEvent<HTMLButtonElement>
  ) => {
    const key = dayKeyUTC(date);

    // Double-click toggles actual visit status
    if (evt.detail === 2) {
      const already = hasVisit(key);
      const action = already ? "unmark-visit" : "mark-visit";

      dataProvider
        .create(`patients/${patientId}/${action}`, { data: { visitDate: key } })
        .then(() => {
          if (already) {
            setVisitedKeys((prev) => prev.filter((k) => k !== key));
            setPayments((p) => {
              const c = { ...p };
              delete c[key]; // remove any payment for that visit day
              return c;
            });
            notify("Unmarked visit & removed payment", { type: "success" });
          } else {
            setVisitedKeys((prev) =>
              prev.includes(key) ? prev : [...prev, key]
            );
            notify("Marked visit", { type: "success" });
          }
          setSelectedDate(null);
          refresh();
        })
        .catch((err) => {
          const msg =
            err instanceof HttpError
              ? err.message
              : (err as Error)?.message || "Failed";
          notify(msg, { type: "warning" });
        });

      return;
    }

    // Single click opens editor
    const pay = payments[key];
    const f = pay?.fee ?? DEFAULT_FEE;
    setSelectedDate(date);
    setFee(f);
    setStatus(pay && pay.paid >= f ? "Paid" : "Unpaid");
  };

  const handleSave = async () => {
    if (!selectedDate) return;

    const key = dayKeyUTC(selectedDate);
    const alreadyVisited = hasVisit(key);
    const paidAmount = status === "Paid" ? fee : 0;

    try {
      if (!alreadyVisited) {
        await dataProvider.create(`patients/${patientId}/mark-visit`, {
          data: { visitDate: key },
        });
        setVisitedKeys((prev) =>
          prev.includes(key) ? prev : [...prev, key]
        );
      }

      await dataProvider.create(`patients/${patientId}/visit-payment`, {
        data: { date: key, fee, paid: paidAmount },
      });

      setPayments((p) => ({ ...p, [key]: { fee, paid: paidAmount } }));
      notify(
        alreadyVisited ? "Payment updated" : "Visit marked & payment saved",
        { type: "success" }
      );
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
  const tileContent = ({
    date,
    view,
  }: {
    date: Date;
    view: string;
  }): React.ReactNode => {
    if (view !== "month") return null;
    const key = dayKeyUTC(date);

    // show dot if the day has either a visit or a payment
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
    <Paper sx={{ p: 3, maxWidth: 720, mx: "auto" }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {data?.name ?? "Patient"} — Visit & Payment Tracker
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Calendar
        onClickDay={handleDayClick}
        prevLabel={<ChevronLeftIcon />}
        nextLabel={<ChevronRightIcon />}
        tileContent={tileContent}
        onActiveStartDateChange={onMonthChange}
      />

      {selectedDate && (
        <Box mt={3} p={2} border="1px solid #ddd" borderRadius={2} bgcolor="#fafafa">
          <Typography variant="subtitle1" fontWeight={600}>
            {selectedDate.toLocaleDateString()}
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" mt={2}>
            <TextField
              label="Amount"
              type="number"
              size="small"
              value={fee}
              onChange={(e) => setFee(Number(e.target.value))}
              sx={{ width: { xs: "100%", sm: 180 } }}
            />
            <TextField
              select
              label="Payment"
              size="small"
              value={status}
              onChange={(e) => setStatus(e.target.value as "Paid" | "Unpaid")}
              sx={{ width: { xs: "100%", sm: 180 } }}
            >
              <MenuItem value="Paid">✅ Paid</MenuItem>
              <MenuItem value="Unpaid">❌ Unpaid</MenuItem>
            </TextField>

            {!hasVisit(dayKeyUTC(selectedDate)) ? (
              <Button variant="contained" onClick={handleSave}>
                Save (Mark + Payment)
              </Button>
            ) : (
              <>
                <Button variant="contained" onClick={handleSave}>
                  Save Payment
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleUnmark}
                >
                  Unmark & Remove Payment
                </Button>
              </>
            )}
            <Button variant="text" onClick={() => setSelectedDate(null)}>
              Close
            </Button>
          </Stack>

          <Typography variant="caption" display="block" mt={1}>
            Double-click a day to toggle visit instantly.
          </Typography>
        </Box>
      )}

      {/* Month Summary */}
      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle2" fontWeight={700}>
        {monthLabel} Summary
      </Typography>
      <Table size="small" sx={{ mt: 1 }}>
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
                  monthKeys.reduce((acc, k) => acc + ((payments[k]?.fee ?? 0) - (payments[k]?.paid ?? 0)), 0) > 0
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

      {/* Overall Summary */}
      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle2" fontWeight={700}>
        Overall Summary
      </Typography>
      <Table size="small" sx={{ mt: 1 }}>
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

      <Divider sx={{ my: 3 }} />
      <Stack direction="row" spacing={1}>
        <Chip icon={<PaidIcon />} label="Paid Visit" color="success" variant="outlined" />
        <Chip icon={<UnpaidIcon />} label="Unpaid Visit" color="warning" variant="outlined" />
      </Stack>
    </Paper>
  );
};

export default CalendarView;
