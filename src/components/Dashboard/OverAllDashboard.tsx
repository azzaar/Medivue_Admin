// src/dashboard/ClinicalFinanceReport.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Paper, Typography, Card, CardContent, TextField, MenuItem,
  IconButton, Tooltip, Fade, Skeleton, Stack, Divider, Chip, Alert
} from "@mui/material";
import { useDataProvider, useNotify } from "react-admin";
import {
  ResponsiveContainer, Line, CartesianGrid, XAxis, YAxis,
  Tooltip as RTooltip, Legend, BarChart, Bar, PieChart, Pie, Cell,
  ComposedChart, Area} from "recharts";
import dayjs from "dayjs";
import Grid from '@mui/material/GridLegacy';

// lucide-react
import {
  Calendar as CalendarIcon,
  Wallet as WalletIcon,
  Activity as ActivityIcon,
  Stethoscope as StethoscopeIcon,
  Layers as LayersIcon,
  Banknote as BanknoteIcon,
  Download as DownloadIcon,
  RotateCcw as ResetIcon,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  PieChart as PieChartIcon,
  Layers
} from "lucide-react";

type PaymentFilter = "" | "cash" | "upi" | "card" | "bank";

interface PatientDailyRow {
  id: string;
  date: string;
  visits: number;
  totalPaid: number;
  totalDue: number;
  totalFee: number;
}

interface DoctorRow {
  id: string;
  visitedDoctor: string | null | undefined;
  totalPaid: number;
  totalDue: number;
  totalFee: number;
  count: number;
}

interface Doctor {
  id: string;
  name: string;
  salary?: number;
  specialization?: string;
}
interface EmbeddedDoctorRef {
  _id: string;
  name: string;
  specialization?: string;
}
interface ExpenseRow {
  id: string;
  title: string;
  amount: number;
  doctorId : EmbeddedDoctorRef;
  date: string;
  paymentMethod?: PaymentFilter | string;
  status?: string;
  type?: string;
  category?: string;
  doctorName?: string;
}

interface MonthlyBreakdownRow {
  month: number;
  year: number;
  totalAmount: number;
  count: number;
}

/** ---------- Utils ---------- */
const months = [
  "All","January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const INR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

const COLORS = {
  primary: "#1976d2",
  secondary: "#dc004e",
  success: "#2e7d32",
  warning: "#ed6c02",
  info: "#0288d1",
  purple: "#7e57c2",
  pink: "#e91e63",
  teal: "#00897b",
  amber: "#f57c00",
  indigo: "#3949ab",
};

const CHART_COLORS = [
  COLORS.primary, COLORS.success, COLORS.warning, COLORS.info,
  COLORS.purple, COLORS.pink, COLORS.teal, COLORS.amber
];

const soft = {
  blueBg: "#E3F2FD",
  blue: "#1976d2",
  greenBg: "#E8F5E9",
  green: "#2e7d32",
  purpleBg: "#F3E5F5",
  purple: "#7e57c2",
  orangeBg: "#FFF3E0",
  orange: "#f57c00",
  pinkBg: "#FCE4EC",
  pink: "#e91e63",
  grayBg: "#F5F5F5",
};

function monthLabel(m: number) {
  return months[m]?.slice(0, 3) || "";
}


/** ---------- Custom Tooltip ---------- */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  
  return (
    <Paper sx={{ p: 1.5, boxShadow: 3, minWidth: 150 }}>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
        {label}
      </Typography>
      {payload.map((entry, index: number) => (
        <Stack key={index} direction="row" justifyContent="space-between" spacing={2}>
          <Typography variant="body2" sx={{ color: entry.color }}>
            {entry.name}:
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {entry.name.toLowerCase().includes('visit') || entry.name.toLowerCase().includes('count') 
              ? fmt(entry.value) 
              : `₹${fmt(entry.value)}`}
          </Typography>
        </Stack>
      ))}
    </Paper>
  );
};

/** ---------- Component ---------- */
const ClinicalFinanceReport: React.FC = () => {
  const dataProvider = useDataProvider();
  const notify = useNotify();

  const now = dayjs();
  const [month, setMonth] = useState<string>("All");
  const [year, setYear] = useState<string>(String(now.year()));
  const [loading, setLoading] = useState(true);

  const [patientDaily, setPatientDaily] = useState<PatientDailyRow[]>([]);
  const [byDoctor, setByDoctor] = useState<DoctorRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [monthly, setMonthly] = useState<MonthlyBreakdownRow[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // --- fetch ---
  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const dayParam = "";
        const monthParam = month === "All" ? "" : month;

        const [dRes, docRes, expRes, mbRes, doctorsRes] = await Promise.all([
          dataProvider.getList<PatientDailyRow>("patients/payment-summary", {
            pagination: { page: 1, perPage: 10000 },
            sort: { field: "date", order: "ASC" },
            filter: { mode: "daily", day: dayParam, month: monthParam, year },
          }),
          dataProvider.getList<DoctorRow>("patients/payment-summary", {
            pagination: { page: 1, perPage: 10000 },
            sort: { field: "visitedDoctor", order: "ASC" },
            filter: { mode: "byDoctor", day: dayParam, month: monthParam, year },
          }),
          dataProvider.getList<ExpenseRow>("expenses", {
            pagination: { page: 1, perPage: 100000 },
            sort: { field: "date", order: "DESC" },
            filter: { month: monthParam || undefined, year },
          }),
          dataProvider.getList("expenses/monthly-breakdown", {
            pagination: { page: 1, perPage: 100 },
            sort: { field: "month", order: "ASC" },
            filter: { year },
          }),
          dataProvider.getList<Doctor>("doctors", {
            pagination: { page: 1, perPage: 1000 },
            sort: { field: "name", order: "ASC" },
            filter: {},
          })
        ]);

        if (!alive) return;
        setPatientDaily(dRes.data ?? []);
        setByDoctor(docRes.data ?? []);
        setExpenses(expRes.data ?? []);
        setMonthly(mbRes.data ?? []);
        setDoctors(doctorsRes.data ?? []);
      } catch (e) {
        notify((e as Error).message || "Failed to load dashboard", { type: "error" });
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => { alive = false; };
  }, [dataProvider, notify, month, year]);

  /** ---------- Derived Calculations ---------- */
  const patientKPI = useMemo(() => {
    const visits = patientDaily.reduce((s, r) => s + (r.visits || 0), 0);
    const paid = patientDaily.reduce((s, r) => s + (r.totalPaid || 0), 0);
    const due = patientDaily.reduce((s, r) => s + (r.totalDue || 0), 0);
    const fee = paid + due;
    const topDoc = [...byDoctor].sort((a, b) => (b.totalPaid - a.totalPaid))[0];
    
    return {
      visits, paid, due, fee,
      topDocName: topDoc?.visitedDoctor || "—",
      topDocIncome: topDoc?.totalPaid || 0,
      avgPerVisit: visits > 0 ? fee / visits : 0,
      collectionRate: fee > 0 ? (paid / fee) * 100 : 0,
    };
  }, [patientDaily, byDoctor]);

  const expenseKPI = useMemo(() => {
    const totalSpend = expenses.reduce((s, x) => s + (x.amount || 0), 0);
    const avgPerTransaction = expenses.length > 0 ? totalSpend / expenses.length : 0;
    return { totalSpend, avgPerTransaction, count: expenses.length };
  }, [expenses]);

  const netProfit = useMemo(() => {
    return patientKPI.paid - expenseKPI.totalSpend;
  }, [patientKPI.paid, expenseKPI.totalSpend]);

  const profitMargin = useMemo(() => {
    return patientKPI.paid > 0 ? (netProfit / patientKPI.paid) * 100 : 0;
  }, [netProfit, patientKPI.paid]);

  // Combine income and expenses for comparison
  const incomeVsExpenses = useMemo(() => {
    const incomeByMonth = new Map<string, number>();
    patientDaily.forEach(d => {
      const monthKey = dayjs(d.date).format("MMM");
      incomeByMonth.set(monthKey, (incomeByMonth.get(monthKey) || 0) + d.totalPaid);
    });

    const expenseByMonth = new Map<string, number>();
    monthly.forEach(m => {
      const monthKey = monthLabel(m.month);
      expenseByMonth.set(monthKey, m.totalAmount);
    });

    return Array.from({ length: 12 }, (_, i) => {
      const monthKey = monthLabel(i + 1);
      return {
        month: monthKey,
        income: incomeByMonth.get(monthKey) || 0,
        expenses: expenseByMonth.get(monthKey) || 0,
        profit: (incomeByMonth.get(monthKey) || 0) - (expenseByMonth.get(monthKey) || 0),
      };
    });
  }, [patientDaily, monthly]);

  const patientDailySeries = useMemo(() => {
    return patientDaily.map(d => ({
      label: dayjs(d.date).format("DD MMM"),
      visits: d.visits,
      income: d.totalPaid,
      due: d.totalDue,
      total: d.totalFee,
    }));
  }, [patientDaily]);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    expenses.forEach(e => {
      const key = (e.category || e.type || "Other").toString();
      m.set(key, (m.get(key) || 0) + (e.amount || 0));
    });
    return Array.from(m.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [expenses]);

  const byPayment = useMemo(() => {
    const m = new Map<string, number>();
    expenses.forEach(e => {
      const key = (e.paymentMethod || "unspecified").toString();
      m.set(key, (m.get(key) || 0) + (e.amount || 0));
    });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [expenses]);

const doctorMap = new Map<string, Doctor>(doctors.map(d => [d.id, d]));
const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const isEmbeddedDoctorRef = (v: unknown): v is EmbeddedDoctorRef =>
  !!v &&
  typeof v === "object" &&
  "_id" in (v as Record<string, unknown>) &&
  typeof (v as EmbeddedDoctorRef)._id === "string";

const getDoctorIdFromExpense = (exp: ExpenseRow): string | null => {
  const raw = exp.doctorId;
  if (isNonEmptyString(raw)) return raw;
  if (isEmbeddedDoctorRef(raw)) return raw._id;
  return null;
};

const getDoctorNameFromId = (id: string | null | undefined): string => {
  if (!isNonEmptyString(id)) return "—";
  return doctorMap.get(id)?.name ?? id; // fall back to id if name unknown
};

const getDoctorSpecFromId = (id: string | null | undefined): string =>
  isNonEmptyString(id) ? (doctorMap.get(id)?.specialization ?? "") : "";

const doctorSalaries = new Map<string, number>();

for (const exp of expenses) {
  if (exp.type === "salary") {
    const id = getDoctorIdFromExpense(exp);
    if (id) {
      doctorSalaries.set(id, (doctorSalaries.get(id) ?? 0) + (exp.amount || 0));
    }
  }
}


const topDoctors = [...byDoctor]
  .map(d => {
    const docId = isNonEmptyString(d.visitedDoctor) ? d.visitedDoctor : null;
    const salary = docId ? (doctorSalaries.get(docId) ?? 0) : 0;

    const totalFee = d.totalFee || 0;
    const income = d.totalPaid || 0;
    const due = d.totalDue || 0;

    const profitGenerated = income - salary;
    const profitMarginPercent = income > 0 ? (profitGenerated / income) * 100 : 0;
    const roi = salary > 0 ? (profitGenerated / salary) * 100 : 0;
    const collectionRate = totalFee > 0 ? (income / totalFee) * 100 : 0;

    return {
      id: docId ?? "unknown",
      name: getDoctorNameFromId(docId),
      specialization: getDoctorSpecFromId(docId),
      totalFee,
      income,
      due,
      visits: d.count || 0,
      salary,
      profitGenerated,
      profitMarginPercent,
      roi,
      collectionRate,
      avgPerVisit: (d.count || 0) > 0 ? totalFee / d.count : 0,
      isProfitable: profitGenerated > 0,
      hasSalary: salary > 0,
    };
  })
  // push unknowns to bottom, then sort by revenue
  .sort((a, b) => {
    if (a.id === "unknown" && b.id !== "unknown") return 1;
    if (b.id === "unknown" && a.id !== "unknown") return -1;
    return b.totalFee - a.totalFee;
  })
  .slice(0, 15);

  const periodLabel = useMemo(() => {
    const mLabel = month === "All" ? "All Months" : months[parseInt(month, 10)];
    return `${mLabel}, ${year}`;
  }, [month, year]);

  /** ---------- Download Enhanced CSV ---------- */
  const escapeCSV = (val: string | number) => `"${String(val ?? "").replace(/"/g, '""')}"`;

  const downloadAll = () => {
    const lines: string[] = [];
    lines.push(`"Clinical & Financial Report - ${periodLabel}"`);
    lines.push(`"Generated: ${dayjs().format('DD-MM-YYYY HH:mm')}"`);
    lines.push("");

    lines.push('"=== FINANCIAL OVERVIEW ==="');
    lines.push(`"Total Income",${fmt(patientKPI.paid)}`);
    lines.push(`"Total Expenses",${fmt(expenseKPI.totalSpend)}`);
    lines.push(`"Net Profit",${fmt(netProfit)}`);
    lines.push(`"Profit Margin","${profitMargin.toFixed(2)}%"`);
    lines.push("");

    lines.push('"=== PATIENT METRICS ==="');
    lines.push(`"Total Visits",${patientKPI.visits}`);
    lines.push(`"Total Fee",${fmt(patientKPI.fee)}`);
    lines.push(`"Amount Paid",${fmt(patientKPI.paid)}`);
    lines.push(`"Amount Due",${fmt(patientKPI.due)}`);
    lines.push(`"Collection Rate","${patientKPI.collectionRate.toFixed(2)}%"`);
    lines.push(`"Avg Per Visit",${fmt(patientKPI.avgPerVisit)}`);
    lines.push("");

    lines.push('"=== TOP DOCTORS (BY REVENUE) ==="');
    lines.push('"Doctor Name","Specialization","Total Fee","Income","Due","Collection %","Salary","Profit","Profit %","ROI %","Visits","Avg/Visit"');
    topDoctors.forEach(d => {
      lines.push([
        escapeCSV(d.name),
        escapeCSV(d.specialization),
        fmt(d.totalFee),
        fmt(d.income),
        fmt(d.due),
        `"${d.collectionRate.toFixed(1)}%"`,
        fmt(d.salary),
        fmt(d.profitGenerated),
        `"${d.profitMarginPercent.toFixed(1)}%"`,
        `"${d.roi.toFixed(1)}%"`,
        d.visits,
        fmt(d.avgPerVisit)
      ].join(","));
    });
    lines.push("");

    lines.push('"=== EXPENSE BREAKDOWN ==="');
    lines.push(`"Total Spend",${fmt(expenseKPI.totalSpend)}`);
    lines.push(`"Transactions",${expenseKPI.count}`);
    lines.push(`"Avg Per Transaction",${fmt(expenseKPI.avgPerTransaction)}`);
    lines.push("");
    lines.push('"Category","Amount"');
    byCategory.forEach(r => lines.push(`${escapeCSV(r.name)},${fmt(r.total)}`));
    lines.push("");

    lines.push('"=== MONTHLY COMPARISON ==="');
    lines.push('"Month","Income","Expenses","Profit"');
    incomeVsExpenses.forEach(r => {
      lines.push(`"${r.month}",${fmt(r.income)},${fmt(r.expenses)},${fmt(r.profit)}`);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clinical-finance-${dayjs().format('DD-MM-YYYY')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** ---------- Render ---------- */
  return (
    <Fade in timeout={400}>
      <Box sx={{ p: { xs: 2, md: 3 }, pb: 6, bgcolor: "#fafafa", minHeight: "100vh" }}>
        {/* Enhanced Header */}
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2}>
            <Box>
              <Typography variant="h4" fontWeight={800} color="white" gutterBottom>
                📊 Clinical & Financial Analytics
              </Typography>
              <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.9)" }}>
                {periodLabel}
              </Typography>
            </Box>
            
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <TextField
                select size="small" label="" value={month}
                onChange={(e) => setMonth(String(e.target.value))}
                sx={{ width: 100, bgcolor: "white", borderRadius: 1 }}
              >
                {months.map((m, i) => (
                  <MenuItem key={m} value={i === 0 ? "All" : String(i)}>{m}</MenuItem>
                ))}
              </TextField>
              
              <TextField
                size="small" label="" type="number" value={year}
                onChange={(e) => setYear(String(e.target.value))}
                sx={{ width: 110, bgcolor: "white", borderRadius: 1 }}
              />
              
              <Tooltip title="Reset Filters">
                <IconButton 
                  onClick={() => { setMonth("All"); setYear(String(dayjs().year())); }}
                  sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}
                >
                  <ResetIcon size={20} />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Download Report">
                <IconButton 
                  onClick={downloadAll}
                  sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}
                >
                  <DownloadIcon size={20} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Paper>

        {/* Financial Overview KPIs */}
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <WalletIcon size={22} />
          Financial Overview
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { 
              label: "Total Income", 
              value: `₹${fmt(patientKPI.paid)}`, 
              Icon: TrendingUp, 
              bg: soft.greenBg, 
              color: soft.green,
              subtitle: `${patientKPI.visits} visits`
            },
            { 
              label: "Total Expenses", 
              value: `₹${fmt(expenseKPI.totalSpend)}`, 
              Icon: TrendingDown, 
              bg: soft.orangeBg, 
              color: soft.orange,
              subtitle: `${expenseKPI.count} transactions`
            },
            { 
              label: "Net Profit", 
              value: `₹${fmt(netProfit)}`, 
              Icon: ActivityIcon, 
              bg: netProfit >= 0 ? soft.blueBg : soft.pinkBg, 
              color: netProfit >= 0 ? soft.blue : soft.pink,
              subtitle: `${profitMargin.toFixed(1)}% margin`
            },
            { 
              label: "Collection Rate", 
              value: `${patientKPI.collectionRate.toFixed(1)}%`, 
              Icon: PieChartIcon, 
              bg: soft.purpleBg, 
              color: soft.purple,
              subtitle: `₹${fmt(patientKPI.due)} pending`
            },
          ].map((k, idx) => (
            <Grid item xs={12} sm={6} lg={3} key={idx}>
              <Card sx={{ borderRadius: 3, bgcolor: k.bg, height: "100%", transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)", boxShadow: 4 } }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      {k.label}
                    </Typography>
                    <Box sx={{ p: 1, bgcolor: "rgba(255,255,255,0.5)", borderRadius: 2 }}>
                      <k.Icon size={20} color={k.color} />
                    </Box>
                  </Stack>
                  <Typography variant="h4" sx={{ color: k.color, fontWeight: 800, mb: 0.5 }}>
                    {k.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {k.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Income vs Expenses Comparison */}
        <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }} elevation={2}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <ActivityIcon size={22} color={COLORS.primary} />
            <Typography variant="h6" fontWeight={700}>Income vs Expenses ({year})</Typography>
          </Stack>
          
          <Box sx={{ height: { xs: 300, md: 400 } }}>
            {loading ? <Skeleton variant="rounded" height="100%" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={incomeVsExpenses}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.warning} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.warning} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RTooltip content={<CustomTooltip active={undefined} payload={undefined} label={undefined} />} />
                  <Legend wrapperStyle={{ paddingTop: 20 }} />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    fill="url(#colorIncome)" 
                    stroke={COLORS.success}
                    strokeWidth={2}
                    name="Income"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    fill="url(#colorExpenses)" 
                    stroke={COLORS.warning}
                    strokeWidth={2}
                    name="Expenses"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke={COLORS.primary}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    name="Profit"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Paper>

        {/* Patient Analytics Section */}
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <Users size={22} />
          Patient Analytics
        </Typography>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Daily Trend */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 2.5, borderRadius: 3, height: "100%" }} elevation={2}>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <CalendarIcon size={20} color={COLORS.info} />
                <Typography variant="h6" fontWeight={700}>Daily Income & Visits</Typography>
              </Stack>
              
              <Box sx={{ height: 350 }}>
                {loading ? <Skeleton variant="rounded" height="100%" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={patientDailySeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <RTooltip content={<CustomTooltip active={undefined} payload={undefined} label={undefined} />} />
                      <Legend wrapperStyle={{ paddingTop: 10 }} />
                      <Bar yAxisId="left" dataKey="income" fill={COLORS.success} name="Income" radius={[8, 8, 0, 0]} />
                      <Bar yAxisId="left" dataKey="due" fill={COLORS.warning} name="Due" radius={[8, 8, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="visits" stroke={COLORS.primary} strokeWidth={3} name="Visits" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Patient KPIs */}
          <Grid item xs={12} lg={4}>
            <Stack spacing={2} height="100%">
              <Card sx={{ borderRadius: 3, bgcolor: soft.blueBg, flex: 1 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Total Fee Generated
                    </Typography>
                    <WalletIcon size={20} color={soft.blue} />
                  </Stack>
                  <Typography variant="h4" sx={{ color: soft.blue, fontWeight: 800 }}>
                    ₹{fmt(patientKPI.fee)}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Paid:</Typography>
                    <Typography variant="body2" fontWeight={600} color={soft.green}>₹{fmt(patientKPI.paid)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Due:</Typography>
                    <Typography variant="body2" fontWeight={600} color={soft.orange}>₹{fmt(patientKPI.due)}</Typography>
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ borderRadius: 3, bgcolor: soft.purpleBg, flex: 1 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Avg Per Visit
                    </Typography>
                    <ActivityIcon size={20} color={soft.purple} />
                  </Stack>
                  <Typography variant="h4" sx={{ color: soft.purple, fontWeight: 800 }}>
                    ₹{fmt(patientKPI.avgPerVisit)}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Based on {patientKPI.visits} total visits
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>

        {/* Top Doctors Performance */}
        <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }} elevation={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <StethoscopeIcon size={22} color={COLORS.purple} />
              <Typography variant="h6" fontWeight={700}>Doctor Revenue & Profitability Analysis</Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip 
                label="🟢 Profitable" 
                size="small" 
                sx={{ bgcolor: soft.greenBg, color: soft.green, fontWeight: 600 }}
              />
              <Chip 
                label="🔴 Loss Making" 
                size="small" 
                sx={{ bgcolor: soft.pinkBg, color: soft.pink, fontWeight: 600 }}
              />
              <Chip 
                label="⚪ No Salary Data" 
                size="small" 
                sx={{ bgcolor: soft.grayBg, color: "text.secondary", fontWeight: 600 }}
              />
            </Stack>
          </Stack>
          
          <Box sx={{ height: 450 }}>
            {loading ? <Skeleton variant="rounded" height="100%" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDoctors} layout="vertical" margin={{ left: 120, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 10 }} 
                    width={110}
                  />
                  <RTooltip content={<CustomTooltip active={undefined} payload={undefined} label={undefined} />} />
                  <Legend />
                  <Bar dataKey="totalFee" fill={COLORS.info} name="Total Fee" radius={[0, 8, 8, 0]} />
                  <Bar dataKey="income" fill={COLORS.success} name="Collected" radius={[0, 8, 8, 0]} />
                  <Bar dataKey="salary" fill={COLORS.warning} name="Salary" radius={[0, 8, 8, 0]} />
                  <Bar dataKey="profitGenerated" fill={COLORS.primary} name="Net Profit" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>

          {/* Doctor Performance Table */}
          <Box sx={{ mt: 3, overflowX: "auto" }}>
            <Stack direction="row" sx={{ 
              display: "grid", 
              gridTemplateColumns: "0.3fr 1.3fr 0.9fr 0.9fr 0.9fr 0.7fr 0.9fr 0.9fr 0.7fr 0.7fr 0.6fr", 
              fontWeight: 700, 
              px: 2, 
              py: 1.5, 
              bgcolor: soft.grayBg, 
              borderRadius: 2, 
              mb: 1,
              fontSize: "0.75rem",
              gap: 1
            }}>
              <span>#</span>
              <span>Doctor</span>
              <span style={{ textAlign: "right" }}>Total Fee</span>
              <span style={{ textAlign: "right" }}>Collected</span>
              <span style={{ textAlign: "right" }}>Pending</span>
              <span style={{ textAlign: "right" }}>Coll %</span>
              <span style={{ textAlign: "right" }}>Salary</span>
              <span style={{ textAlign: "right" }}>Profit</span>
              <span style={{ textAlign: "right" }}>Margin</span>
              <span style={{ textAlign: "right" }}>ROI</span>
              <span style={{ textAlign: "center" }}>Status</span>
            </Stack>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="text" sx={{ mx: 2, my: 1 }} />)
            ) : topDoctors.map((doc, idx) => (
              <Stack 
                key={idx}
                direction="row" 
                sx={{ 
                  display: "grid", 
                  gridTemplateColumns: "0.3fr 1.3fr 0.9fr 0.9fr 0.9fr 0.7fr 0.9fr 0.9fr 0.7fr 0.7fr 0.6fr", 
                  px: 2, 
                  py: 1.5, 
                  borderBottom: "1px solid #eee",
                  fontSize: "0.75rem",
                  gap: 1,
                  "&:hover": { bgcolor: "#f9f9f9" },
                  bgcolor: !doc.hasSalary ? "rgba(189, 189, 189, 0.05)" : doc.isProfitable ? "transparent" : "rgba(239, 83, 80, 0.05)"
                }}
              >
                <Chip 
                  label={idx + 1} 
                  size="small" 
                  sx={{ 
                    width: 30, 
                    height: 26, 
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    bgcolor: idx < 3 ? COLORS.primary : soft.grayBg,
                    color: idx < 3 ? "white" : "text.secondary"
                  }} 
                />
                <Stack>
                  <Typography variant="body2" fontWeight={600} fontSize="0.8rem">{doc.name}</Typography>
                  {doc.specialization && (
                    <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
                      {doc.specialization}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
                    {doc.visits} visits • ₹{fmt(doc.avgPerVisit)}/visit
                  </Typography>
                </Stack>
                <Tooltip title="Total revenue generated by this doctor">
                  <Typography variant="body2" sx={{ textAlign: "right", color: soft.blue, fontWeight: 700 }}>
                    ₹{fmt(doc.totalFee)}
                  </Typography>
                </Tooltip>
                <Tooltip title="Amount collected from patients">
                  <Typography variant="body2" sx={{ textAlign: "right", color: soft.green, fontWeight: 600 }}>
                    ₹{fmt(doc.income)}
                  </Typography>
                </Tooltip>
                <Tooltip title="Amount pending from patients">
                  <Typography variant="body2" sx={{ textAlign: "right", color: soft.orange, fontWeight: 600 }}>
                    ₹{fmt(doc.due)}
                  </Typography>
                </Tooltip>
                <Tooltip title="Collection rate: Collected / Total Fee">
                  <Chip 
                    label={`${doc.collectionRate.toFixed(0)}%`}
                    size="small"
                    sx={{
                      bgcolor: doc.collectionRate >= 80 ? soft.greenBg : doc.collectionRate >= 60 ? soft.orangeBg : soft.pinkBg,
                      color: doc.collectionRate >= 80 ? soft.green : doc.collectionRate >= 60 ? soft.orange : soft.pink,
                      fontWeight: 700,
                      fontSize: "0.7rem",
                      height: 22
                    }}
                  />
                </Tooltip>
                <Tooltip title={doc.hasSalary ? "Salary from expenses" : "No salary recorded"}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      textAlign: "right", 
                      color: doc.hasSalary ? soft.orange : "text.disabled",
                      fontWeight: 600,
                      fontStyle: doc.hasSalary ? "normal" : "italic"
                    }}
                  >
                    {doc.hasSalary ? `₹${fmt(doc.salary)}` : "—"}
                  </Typography>
                </Tooltip>
                <Tooltip title="Net profit: Collected - Salary">
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      textAlign: "right", 
                      color: !doc.hasSalary ? "text.disabled" : doc.isProfitable ? soft.green : soft.pink, 
                      fontWeight: 700 
                    }}
                  >
                    {doc.hasSalary ? `₹${fmt(doc.profitGenerated)}` : "—"}
                  </Typography>
                </Tooltip>
                <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                  {doc.hasSalary && (
                    <>
                      {doc.isProfitable ? (
                        <TrendingUp size={12} color={soft.green} />
                      ) : (
                        <TrendingDown size={12} color={soft.pink} />
                      )}
                      <Typography 
                        variant="body2" 
                        fontWeight={600}
                        sx={{ color: doc.isProfitable ? soft.green : soft.pink }}
                      >
                        {doc.profitMarginPercent.toFixed(0)}%
                      </Typography>
                    </>
                  )}
                  {!doc.hasSalary && (
                    <Typography variant="body2" color="text.disabled" fontStyle="italic">
                      —
                    </Typography>
                  )}
                </Stack>
                <Tooltip title="Return on Investment: (Profit / Salary) × 100">
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      textAlign: "right", 
                      fontWeight: 600,
                      color: !doc.hasSalary ? "text.disabled" : doc.roi > 100 ? soft.green : doc.roi > 0 ? soft.blue : soft.pink
                    }}
                  >
                    {doc.hasSalary ? `${doc.roi.toFixed(0)}%` : "—"}
                  </Typography>
                </Tooltip>
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <Chip 
                    label={!doc.hasSalary ? "N/A" : doc.isProfitable ? "✓" : "✗"} 
                    size="small" 
                    sx={{ 
                      bgcolor: !doc.hasSalary ? soft.grayBg : doc.isProfitable ? soft.greenBg : soft.pinkBg,
                      color: !doc.hasSalary ? "text.secondary" : doc.isProfitable ? soft.green : soft.pink,
                      fontWeight: 700,
                      fontSize: "0.7rem",
                      width: 32,
                      height: 22
                    }}
                  />
                </Box>
              </Stack>
            ))}
            {!loading && topDoctors.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>No doctor data available for this period.</Alert>
            )}
          </Box>

          {/* Performance Summary */}
          <Box sx={{ mt: 3, p: 2.5, bgcolor: soft.blueBg, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
              📊 Overall Performance Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4} md={2}>
                <Typography variant="caption" color="text.secondary">Total Doctors</Typography>
                <Typography variant="h6" fontWeight={700}>{topDoctors.length}</Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Typography variant="caption" color="text.secondary">Total Revenue</Typography>
                <Typography variant="h6" fontWeight={700} color={soft.blue}>
                  ₹{fmt(topDoctors.reduce((sum, d) => sum + d.totalFee, 0))}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Typography variant="caption" color="text.secondary">Collected</Typography>
                <Typography variant="h6" fontWeight={700} color={soft.green}>
                  ₹{fmt(topDoctors.reduce((sum, d) => sum + d.income, 0))}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Typography variant="caption" color="text.secondary">Pending</Typography>
                <Typography variant="h6" fontWeight={700} color={soft.orange}>
                  ₹{fmt(topDoctors.reduce((sum, d) => sum + d.due, 0))}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Typography variant="caption" color="text.secondary">Total Salary</Typography>
                <Typography variant="h6" fontWeight={700} color={soft.orange}>
                  ₹{fmt(topDoctors.reduce((sum, d) => sum + d.salary, 0))}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Typography variant="caption" color="text.secondary">Net Profit</Typography>
                <Typography variant="h6" fontWeight={700} color={soft.green}>
                  ₹{fmt(topDoctors.reduce((sum, d) => sum + d.profitGenerated, 0))}
                </Typography>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Profitable</Typography>
                <Typography variant="body1" fontWeight={700} color={soft.green}>
                  {topDoctors.filter(d => d.isProfitable && d.hasSalary).length} doctors
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Loss Making</Typography>
                <Typography variant="body1" fontWeight={700} color={soft.pink}>
                  {topDoctors.filter(d => !d.isProfitable && d.hasSalary).length} doctors
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Avg Collection</Typography>
                <Typography variant="body1" fontWeight={700}>
                  {(topDoctors.reduce((sum, d) => sum + d.collectionRate, 0) / topDoctors.length).toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">No Salary Data</Typography>
                <Typography variant="body1" fontWeight={700} color="text.secondary">
                  {topDoctors.filter(d => !d.hasSalary).length} doctors
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* Expenses Section */}
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <Layers size={22} />
          Expense Analysis
        </Typography>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Expense Categories */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, borderRadius: 3, height: "100%" }} elevation={2}>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <LayersIcon size={20} color={COLORS.warning} />
                <Typography variant="h6" fontWeight={700}>Top Expense Categories</Typography>
              </Stack>
              
              <Box sx={{ height: 350 }}>
                {loading ? <Skeleton variant="rounded" height="100%" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byCategory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10 }} 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RTooltip content={<CustomTooltip active={undefined} payload={undefined} label={undefined} />} />
                      <Bar dataKey="total" name="Amount" radius={[8, 8, 0, 0]}>
                        {byCategory.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Payment Methods Distribution */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, borderRadius: 3, height: "100%" }} elevation={2}>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <BanknoteIcon size={20} color={COLORS.info} />
                <Typography variant="h6" fontWeight={700}>Payment Methods</Typography>
              </Stack>
              
              <Box sx={{ height: 350 }}>
                {loading ? <Skeleton variant="rounded" height="100%" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={byPayment} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={100}
  label={({ name, percent }: { name?: string | number; percent?: number }) =>
    `${String(name ?? "")}: ${(((percent ?? 0) * 100).toFixed(0))}%`
  }                        labelLine={{ stroke: "#999", strokeWidth: 1 }}
                      >
                        {byPayment.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RTooltip content={<CustomTooltip active={undefined} payload={undefined} label={undefined} />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Recent Expenses */}
        <Paper sx={{ p: 3, borderRadius: 3 }} elevation={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <FileText size={22} color={COLORS.secondary} />
              <Typography variant="h6" fontWeight={700}>Recent Expense Transactions</Typography>
            </Stack>
            <Chip 
              label={`${expenses.length} Total`} 
              color="primary" 
              size="small" 
              sx={{ fontWeight: 600 }}
            />
          </Stack>
          
          <Box sx={{ overflowX: "auto" }}>
            <Stack direction="row" sx={{ 
              display: "grid", 
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", 
              fontWeight: 700, 
              px: 2, 
              py: 1.5, 
              bgcolor: soft.grayBg, 
              borderRadius: 2, 
              mb: 1,
              fontSize: "0.875rem"
            }}>
              <span>Title</span>
              <span>Date</span>
              <span>Category</span>
              <span>Payment</span>
              <span style={{ textAlign: "right" }}>Amount</span>
            </Stack>
            
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} variant="text" sx={{ mx: 2, my: 1 }} />)
            ) : expenses.slice(0, 15).map((e) => (
              <Stack 
                key={e.id}
                direction="row" 
                sx={{ 
                  display: "grid", 
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", 
                  px: 2, 
                  py: 1.5, 
                  borderBottom: "1px solid #eee",
                  fontSize: "0.875rem",
                  "&:hover": { bgcolor: "#f9f9f9" }
                }}
              >
                <Typography variant="body2" fontWeight={500}>{e.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {dayjs(e.date).format("DD MMM YYYY")}
                </Typography>
                <Chip 
                  label={e.category || e.type || "Other"} 
                  size="small" 
                  variant="outlined"
                  sx={{ maxWidth: 100 }}
                />
                <Chip 
                  label={(e.paymentMethod || "—").toString().toUpperCase()} 
                  size="small"
                  color="default"
                  sx={{ maxWidth: 80 }}
                />
                <Typography 
                  variant="body2" 
                  sx={{ textAlign: "right", color: soft.orange, fontWeight: 700 }}
                >
                  ₹{fmt(e.amount)}
                </Typography>
              </Stack>
            ))}
            
            {!loading && expenses.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No expense records found for the selected period.
              </Alert>
            )}
          </Box>
        </Paper>

        {/* Summary Footer */}
        <Paper 
          sx={{ 
            mt: 3, 
            p: 3, 
            borderRadius: 3, 
            background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
          }} 
          elevation={3}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>
                  Period Summary
                </Typography>
                <Typography variant="h5" fontWeight={800} color="white">
                  {periodLabel}
                </Typography>
              </Stack>
            </Grid>
            
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                      Total Income
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="white">
                      ₹{fmt(patientKPI.paid)}
                    </Typography>
                  </Stack>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                      Total Expenses
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="white">
                      ₹{fmt(expenseKPI.totalSpend)}
                    </Typography>
                  </Stack>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                      Net Profit
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="white">
                      ₹{fmt(netProfit)}
                    </Typography>
                  </Stack>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                      Profit Margin
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="white">
                      {profitMargin.toFixed(1)}%
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Fade>
  );
};

export default ClinicalFinanceReport;