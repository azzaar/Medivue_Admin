"use client";

import React, { useEffect, useState } from "react";
import { RaRecord } from "react-admin";
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField as MuiTextField,
  MenuItem,
  IconButton,
  Tooltip,
  Button,
  Divider,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import RestartAltIcon from "@mui/icons-material/RestartAlt";


// ===== Your existing app imports =====





// ========= Inline Doctor Leave / Attendance screens =========
// (So you don’t need extra files. Resource name == "doctors-leave" -> /doctors-leave on server)

import {
  useDataProvider,
  useNotify,
} from "react-admin";

type Status = "present" | "leave";

interface AttendanceRow extends RaRecord {
  id: string;
  doctorId: string;
  doctorName: string;
  date: string; // ISO
  status: Status;
}

interface LeaveRow extends RaRecord {
  id: string;
  doctorId: string;
  date: string; // ISO
  status: Status;
  note?: string;
}

interface Choice {
  id: string;
  name: string;
}

const months = [
  "All",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const toUTCDateOnly = (isoLike: string): string => {
  const dateObj = new Date(isoLike);
  if (isNaN(dateObj.getTime())) return "-";
  return dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
};

type TabKey = "attendance" | "history";

export const DoctorLeaveList: React.FC = () => {
  const dp = useDataProvider();
  const notify = useNotify();

  const now = new Date();
  const [tab, setTab] = useState<TabKey>("attendance");
  const [month, setMonth] = useState<string>("All");
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [doctor, setDoctor] = useState<string>("");

  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [doctorChoices, setDoctorChoices] = useState<Choice[]>([]);

  // Load all doctors once (backend supports ?all=true to ignore pagination)
  useEffect(() => {
    (async () => {
      try {
        const res = await dp.getList<Choice>("doctors", {
          pagination: { page: 1, perPage: 1 },
          sort: { field: "name", order: "ASC" },
          filter: { all: true },
        });
        const rows =
          res.data?.map((r) => ({
            id: r.id,
            name: (r as unknown as { name: string }).name,
          })) ?? [];
        setDoctorChoices(rows);
      } catch (e) {
        const err = e as Error;
        notify(err.message || "Failed to load doctors", { type: "error" });
      }
    })();
  }, [dp, notify]);

  // Fetch per tab
  useEffect(() => {
    (async () => {
      try {
        const m = month === "All" ? "" : month;
        if (tab === "attendance") {
          const res = await dp.getList<AttendanceRow>(
            "doctors-leave/attendance",
            {
              pagination: { page: 1, perPage: 100000 },
              sort: { field: "date", order: "ASC" },
              filter: { mode: "daily", month: m, year, doctorId: doctor },
            }
          );
          setAttendance(res.data ?? []);
        } else {
          const filters: Record<string, string> = {};
          if (doctor) filters.doctorId = doctor;
          if (month !== "All") {
            const y = Number(year);
            const mo = Number(month);
            const start = new Date(Date.UTC(y, mo - 1, 1)).toISOString();
            const end = new Date(Date.UTC(y, mo, 0)).toISOString();
            filters.start = start;
            filters.end = end;
          }
          const res = await dp.getList<LeaveRow>("doctors-leave", {
            pagination: { page: 1, perPage: 100000 },
            sort: { field: "date", order: "ASC" },
            filter: filters,
          });
          setLeaves(res.data ?? []);
        }
      } catch (e) {
        const err = e as Error;
        notify(err.message || "Failed to load data", { type: "error" });
      }
    })();
  }, [dp, notify, tab, month, year, doctor]);

  const resetFilters = () => {
    setMonth("All");
    setYear(String(now.getFullYear()));
    setDoctor("");
  };

  const downloadCSV = () => {
    let csv = "";
    const q = (arr: Array<string | number>) =>
      arr.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");

    if (tab === "attendance") {
      csv += q(["Date", "Doctor", "Status"]) + "\n";
      attendance.forEach((r) => {
        csv +=
          q([toUTCDateOnly(r.date), r.doctorName || r.doctorId, r.status]) +
          "\n";
      });
    } else {
      csv += q(["Date", "Doctor", "Note"]) + "\n";
      leaves.forEach((r) => {
        const doc =
          doctorChoices.find((d) => d.id === r.doctorId)?.name ?? r.doctorId;
        csv += q([toUTCDateOnly(r.date), doc, r.note ?? ""]) + "\n";
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      tab === "attendance"
        ? "doctor-attendance.csv"
        : "doctor-leaves.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteLeave = async (id: string) => {
    try {
      await dp.delete<LeaveRow>("doctors-leave", { id });
      setLeaves((prev) => prev.filter((x) => x.id !== id));
      notify("Leave removed", { type: "info" });
    } catch (e) {
      const err = e as Error;
      notify(err.message || "Failed to remove", { type: "error" });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          Doctor Leave / Attendance
        </Typography>
        <Box>
          <Tooltip title="Download CSV">
            <IconButton color="primary" onClick={downloadCSV}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset">
            <IconButton onClick={resetFilters}>
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Divider sx={{ mb: 2 }} />

      <Tabs value={tab} onChange={(_, v: TabKey) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Attendance (By Day)" value="attendance" />
        <Tab label="Leave History" value="history" />
      </Tabs>

      {/* Filters */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 2,
          borderRadius: 3,
        }}
      >
        <MuiTextField
          select
          label="Month"
          size="small"
          value={month}
          onChange={(e) => setMonth(String(e.target.value))}
        >
          {months.map((m, i) => (
            <MenuItem key={m} value={i === 0 ? "All" : String(i)}>
              {m}
            </MenuItem>
          ))}
        </MuiTextField>
        <MuiTextField
          label="Year"
          type="number"
          size="small"
          value={year}
          onChange={(e) => setYear(String(e.target.value))}
        />
        <MuiTextField
          select
          label="Doctor"
          size="small"
          value={doctor}
          onChange={(e) => setDoctor(String(e.target.value))}
        >
          <MenuItem value="">All</MenuItem>
          {doctorChoices.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.name}
            </MenuItem>
          ))}
        </MuiTextField>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: 3 }}>
        {tab === "attendance" ? (
          <>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Daily Attendance
            </Typography>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow
                  sx={{ "& th": { bgcolor: "#fafafa", fontWeight: 600 } }}
                >
                  <TableCell>Date</TableCell>
                  <TableCell>Doctor</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendance.length ? (
                  attendance.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{toUTCDateOnly(r.date)}</TableCell>
                      <TableCell>{r.doctorName || r.doctorId}</TableCell>
                      <TableCell
                        style={{
                          color:
                            r.status === "present" ? "#2e7d32" : "#ed6c02",
                        }}
                      >
                        {r.status === "present" ? "Present" : "Leave"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      align="center"
                      sx={{ py: 5, color: "text.secondary" }}
                    >
                      No records.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </>
        ) : (
          <>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Leave History
              </Typography>
              <Button variant="contained" href="#/doctors-leave/create">
                New Leave
              </Button>
            </Box>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow
                  sx={{ "& th": { bgcolor: "#fafafa", fontWeight: 600 } }}
                >
                  <TableCell>Date</TableCell>
                  <TableCell>Doctor</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaves.length ? (
                  leaves.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{toUTCDateOnly(r.date)}</TableCell>
                      <TableCell>
                        {doctorChoices.find((d) => d.id === r.doctorId)?.name ??
                          r.doctorId}
                      </TableCell>
                      <TableCell>{r.note || "—"}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Delete">
                          <IconButton
                            onClick={() => handleDeleteLeave(r.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      align="center"
                      sx={{ py: 5, color: "text.secondary" }}
                    >
                      No leaves yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </>
        )}
      </Paper>
    </Box>
  );
};


