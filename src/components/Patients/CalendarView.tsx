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
  id: number
  date: string;
  fee: number;
  paid: number;
}

interface Patient {
  id: string;
  name: string;
  visitedDays: string[];
  payments?: PaymentRecord[];
}

type PaymentMap = Record<string, { fee: number; paid: number }>;

const DEFAULT_FEE = 300;
const startOfDayISO = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const CalendarView: React.FC<CalendarViewProps> = ({ patientId }) => {
  const notify = useNotify();
  const refresh = useRefresh();
  const dataProvider = useDataProvider();

  const { data, isLoading, error } = useGetOne<Patient>("patients", { id: patientId });

  const [visitedDates, setVisitedDates] = useState<Date[]>([]);
  const [payments, setPayments] = useState<PaymentMap>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [fee, setFee] = useState<number>(DEFAULT_FEE);
  const [status, setStatus] = useState<"Paid" | "Unpaid">("Unpaid");
  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());

  /** 🔹 Derived values are placed before early returns to fix hook order */
  const monthVisits = useMemo(
    () =>
      visitedDates.filter(
        (d) =>
          d.getMonth() === activeStartDate.getMonth() &&
          d.getFullYear() === activeStartDate.getFullYear()
      ),
    [visitedDates, activeStartDate]
  );

  const monthLabel = useMemo(
    () =>
      activeStartDate.toLocaleString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [activeStartDate]
  );

  const monthAgg = useMemo(() => {
    let visits = 0,
      paidVisits = 0,
      feeSum = 0,
      paidSum = 0;

    for (const d of monthVisits) {
      visits++;
      const key = startOfDayISO(d);
      const p = payments[key];
      if (p) {
        feeSum += p.fee;
        paidSum += p.paid;
        if (p.paid >= p.fee) paidVisits++;
      }
    }

    return {
      visits,
      paidVisits,
      unpaidVisits: visits - paidVisits,
      fee: feeSum,
      paid: paidSum,
      due: Math.max(0, feeSum - paidSum),
    };
  }, [monthVisits, payments]);

  const overall = useMemo(() => {
    const visits = visitedDates.length;
    let paidVisits = 0,
      feeSum = 0,
      paidSum = 0;

    for (const d of visitedDates) {
      const key = startOfDayISO(d);
      const p = payments[key];
      if (p) {
        feeSum += p.fee;
        paidSum += p.paid;
        if (p.paid >= p.fee) paidVisits++;
      }
    }

    return {
      visits,
      paidVisits,
      unpaidVisits: visits - paidVisits,
      fee: feeSum,
      paid: paidSum,
      due: Math.max(0, feeSum - paidSum),
    };
  }, [visitedDates, payments]);

  /** 🔹 Load visited days */
  useEffect(() => {
    if (data?.visitedDays) {
      setVisitedDates(data.visitedDays.map((d) => new Date(d)));
    }
  }, [data]);

  /** 🔹 Load payment list */
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
          map[row.date] = {
            fee: Number(row.fee || 0),
            paid: Number(row.paid || 0),
          };
        });
        setPayments(map);
      } catch {
        // silently ignore if not available
      }
    };
    loadPayments();
  }, [dataProvider, patientId]);

  if (isLoading) return <Loading />;
  if (error)
    return (
      <Paper sx={{ p: 2 }}>
        <Typography color="error">
          Error loading visits: {error.message}
        </Typography>
      </Paper>
    );

  const isVisited = (d: Date) => visitedDates.some((x) => sameDay(x, d));

  /** 🔹 Handle click on date cell */
  const handleDayClick = (date: Date, evt: React.MouseEvent<HTMLButtonElement>) => {
    if (evt.detail === 2) {
      const already = isVisited(date);
      const action = already ? "unmark-visit" : "mark-visit";
      dataProvider
        .create(`patients/${patientId}/${action}`, {
          data: { visitDate: date.toISOString() },
        })
        .then(() => {
          if (already) {
            const key = startOfDayISO(date);
            setVisitedDates((prev) => prev.filter((d) => !sameDay(d, date)));
            setPayments((p) => {
              const copy = { ...p };
              delete copy[key];
              return copy;
            });
            notify("Unmarked visit & removed payment", { type: "success" });
          } else {
            setVisitedDates((prev) => [...prev, new Date(date)]);
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

    const key = startOfDayISO(date);
    const pay = payments[key];
    const f = pay?.fee ?? DEFAULT_FEE;
    setSelectedDate(date);
    setFee(f);
    setStatus(pay && pay.paid >= f ? "Paid" : "Unpaid");
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    const key = startOfDayISO(selectedDate);
    const already = isVisited(selectedDate);
    const paid = status === "Paid" ? fee : 0;

    try {
      if (!already) {
        await dataProvider.create(`patients/${patientId}/mark-visit`, {
          data: { visitDate: key },
        });
        setVisitedDates((prev) => [...prev, new Date(selectedDate)]);
      }
      await dataProvider.create(`patients/${patientId}/visit-payment`, {
        data: { date: key, fee, paid },
      });
      setPayments((p) => ({ ...p, [key]: { fee, paid } }));
      notify(already ? "Payment updated" : "Visit marked & payment saved", {
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
    const key = startOfDayISO(selectedDate);
    if (!isVisited(selectedDate)) {
      notify("No visit marked for this date.", { type: "info" });
      return;
    }
    try {
      await dataProvider.create(`patients/${patientId}/unmark-visit`, {
        data: { visitDate: key },
      });
      setVisitedDates((prev) => prev.filter((d) => !sameDay(d, selectedDate)));
      setPayments((p) => {
        const copy = { ...p };
        delete copy[key];
        return copy;
      });
      notify("Unmarked visit & removed payment", { type: "success" });
      setSelectedDate(null);
      refresh();
    } catch {
      notify("Failed to unmark visit", { type: "warning" });
    }
  };

  const tileContent = ({
    date,
    view,
  }: {
    date: Date;
    view: string;
  }): React.ReactNode => {
    if (view !== "month") return null;
    if (!isVisited(date)) return null;
    const key = startOfDayISO(date);
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

  const onMonthChange = (p: { activeStartDate: Date }) => {
    if (p?.activeStartDate) setActiveStartDate(p.activeStartDate);
  };

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

            {!isVisited(selectedDate) ? (
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
            <TableCell align="right">{monthAgg.visits}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Paid</TableCell>
            <TableCell align="right" sx={{ color: "success.main" }}>
              {monthAgg.paidVisits}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Unpaid</TableCell>
            <TableCell align="right" sx={{ color: "warning.main" }}>
              {monthAgg.unpaidVisits}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Total Fee</TableCell>
            <TableCell align="right">{monthAgg.fee}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Total Paid</TableCell>
            <TableCell align="right" sx={{ color: "success.main" }}>
              {monthAgg.paid}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Total Due</TableCell>
            <TableCell align="right" sx={{ color: monthAgg.due > 0 ? "error.main" : "text.secondary" }}>
              {monthAgg.due}
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
            <TableCell align="right">{overall.visits}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Paid</TableCell>
            <TableCell align="right" sx={{ color: "success.main" }}>
              {overall.paidVisits}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Unpaid</TableCell>
            <TableCell align="right" sx={{ color: "warning.main" }}>
              {overall.unpaidVisits}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Total Fee</TableCell>
            <TableCell align="right">{overall.fee}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Total Paid</TableCell>
            <TableCell align="right" sx={{ color: "success.main" }}>
              {overall.paid}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Total Due</TableCell>
            <TableCell align="right" sx={{ color: overall.due > 0 ? "error.main" : "text.secondary" }}>
              {overall.due}
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
