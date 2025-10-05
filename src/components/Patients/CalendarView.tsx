// src/CalendarView.tsx
import React, { useState, useEffect } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

interface CalendarViewProps {
  patientId: string;
}

const CalendarView: React.FC<CalendarViewProps> = ({ patientId }) => {
  const notify = useNotify();
  const refresh = useRefresh();
  const dataProvider = useDataProvider();
  const { data, isLoading, error } = useGetOne("patients", {
    id: patientId,
  });

  const [visitedDates, setVisitedDates] = useState<Date[]>([]);
  const [selection, setSelection] = useState<Date | null>(null);
  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());

  useEffect(() => {
    if (data?.visitedDays) {
      setVisitedDates(data.visitedDays.map((d: string) => new Date(d)));
    }
  }, [data]);

  if (isLoading) return <Loading />;
  if (error)
    return (
      <Paper sx={{ p: 2 }}>
        <Typography color="error">
          Error loading visits: {error.message}
        </Typography>
      </Paper>
    );

  // Handle double-click mark/unmark
  const handleClickDay = (
    date: Date,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (event.detail === 2) {
      const iso = date.toISOString();
      const already = visitedDates.some((d) => d.toISOString() === iso);
      const action = already ? "unmark-visit" : "mark-visit";
      dataProvider
        .create(`patients/${patientId}/${action}`, { data: { visitDate: iso } })
        .then(() => {
          notify(already ? "Unmarked visit" : "Marked visit", { type: "info" });
          refresh();
          setSelection(null);
        })
        .catch((err: unknown) => {
          if (err instanceof HttpError) return notify(err.message, { type: "warning" });
          if (err instanceof Error) return notify(err.message, { type: "warning" });
        });
    } else {
      setSelection(date);
    }
  };

  // Single selection mark/unmark
  const batchSingle = (mark: boolean) => {
    if (!selection) return;
    const iso = selection.toISOString();
    const action = mark ? "mark-visit" : "unmark-visit";
    dataProvider
      .create(`patients/${patientId}/${action}`, { data: { visitDate: iso } })
      .then(() => {
        notify(mark ? "Marked visit" : "Unmarked visit", { type: "info" });
        refresh();
        setSelection(null);
      })
      .catch((err: unknown) => {
        if (err instanceof HttpError) return notify(err.message, { type: "warning" });
        if (err instanceof Error) return notify(err.message, { type: "warning" });
      });
  };

  // Calendar month navigation
  const handleActiveStartDateChange = (payload: { activeStartDate: Date }) => {
    if (payload?.activeStartDate) setActiveStartDate(payload.activeStartDate);
  };

  // Green highlight for visited days
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (
      view === "month" &&
      visitedDates.some((d) => d.toDateString() === date.toDateString())
    ) {
      return "visitedDay";
    }
    return null;
  };

  // Filter visits for the active month
  const monthVisits = visitedDates
    .filter(
      (d) =>
        d.getMonth() === activeStartDate.getMonth() &&
        d.getFullYear() === activeStartDate.getFullYear()
    )
    .sort((a, b) => a.getTime() - b.getTime());

  const monthLabel = activeStartDate.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  // --- Summary calculations ---
  const totalVisits = visitedDates.length;

  // Group visits by month-year for summary
  const monthlySummary: Record<string, number> = {};
  visitedDates.forEach((d) => {
    const key = `${d.toLocaleString("default", {
      month: "long",
    })} ${d.getFullYear()}`;
    monthlySummary[key] = (monthlySummary[key] || 0) + 1;
  });

  const sortedMonthlySummary = Object.entries(monthlySummary).sort(
    ([aMonth], [bMonth]) => {
      const aDate = new Date(aMonth);
      const bDate = new Date(bMonth);
      return aDate.getTime() - bDate.getTime();
    }
  );

  return (
    <Paper sx={{ p: 2, maxWidth: 450, mx: "auto" }}>
      <Typography variant="h6" gutterBottom>
        {data.name} — Visits
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {/* Calendar */}
      <Calendar
        onClickDay={handleClickDay}
        onActiveStartDateChange={handleActiveStartDateChange}
        tileClassName={tileClassName}
        prevLabel={<ChevronLeftIcon />}
        nextLabel={<ChevronRightIcon />}
        navigationLabel={({ label }) => (
          <Typography variant="subtitle1" align="center">
            {label}
          </Typography>
        )}
        showNeighboringMonth={false}
      />

      {/* Selection Controls */}
      {selection && (
        <Box mt={2}>
          <Typography>Selected: {selection.toLocaleDateString()}</Typography>
          <Stack direction="row" spacing={1} mt={1}>
            <Button
              size="small"
              variant="contained"
              onClick={() => batchSingle(true)}
            >
              Mark
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => batchSingle(false)}
            >
              Unmark
            </Button>
            <Button size="small" onClick={() => setSelection(null)}>
              Clear
            </Button>
          </Stack>
          <Typography variant="caption" display="block" mt={1}>
            (Double-click a day to toggle)
          </Typography>
        </Box>
      )}

      {/* This Month Summary */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2">
        {monthLabel} — Visited Days ({monthVisits.length})
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {monthVisits.length
          ? monthVisits.map((d) => d.toLocaleDateString()).join(", ")
          : "No visits this month."}
      </Typography>

      {/* Total Summary */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2">Total Visits Recorded: {totalVisits}</Typography>

      {/* Month-based Summary Table */}
      {sortedMonthlySummary.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Month-wise Visit Summary
          </Typography>
          <Table size="small">
            <TableBody>
              {sortedMonthlySummary.map(([month, count]) => (
                <TableRow key={month}>
                  <TableCell sx={{ borderBottom: "none" }}>
                    <Typography variant="body2">{month}</Typography>
                  </TableCell>
                  <TableCell
                    sx={{ borderBottom: "none" }}
                    align="right"
                  >
                    <Typography variant="body2" fontWeight="bold">
                      {count}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      <style>{`
        .visitedDay {
          background: #4caf50 !important;
          color: white !important;
          border-radius: 50% !important;
        }
      `}</style>
    </Paper>
  );
};

export default CalendarView;
