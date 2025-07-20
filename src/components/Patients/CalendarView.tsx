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
} from "react-admin";
import { Box, Button, Paper, Stack, Typography, Divider } from "@mui/material";
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

  // load existing visits
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

  // handle single vs double click
  const handleClickDay = (
    date: Date,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (event.detail === 2) {
      // double‑click: toggle mark/unmark
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
        .catch((err: any) =>
          notify(err.message || "Error toggling visit", { type: "warning" })
        );
    } else {
      // single‑click: just select
      setSelection(date);
    }
  };

  // one‑day batch
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
      .catch((err: any) =>
        notify(err.message || "Error", { type: "warning" })
      );
  };

  // green dot styling
  const tileClassName = ({
    date,
    view,
  }: {
    date: Date;
    view: string;
  }) => {
    if (
      view === "month" &&
      visitedDates.some((d) => d.toDateString() === date.toDateString())
    ) {
      return "visitedDay";
    }
    return null;
  };

  return (
    <Paper sx={{ p: 2, maxWidth: 400, mx: "auto" }}>
      <Typography variant="h6" gutterBottom>
        {data.name} — Visits
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Calendar
        onClickDay={handleClickDay}
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
            (Double‑click a day to toggle)
          </Typography>
        </Box>
      )}

      <style>{`
        /* green circle for visited days */
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
