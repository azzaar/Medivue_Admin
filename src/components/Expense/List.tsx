import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useDataProvider, useNotify } from "react-admin";
import { ExpenseStyles } from "./common";

const EXPENSE_TYPES = [
  { value: "salary", label: "💼 Doctor Salary", needsDoctor: true },
  { value: "referral_commission", label: "🤝 Referral Commission", needsPatient: true },
  { value: "utility", label: "💡 Utility Bills" },
  { value: "rent", label: "🏢 Rent" },
  { value: "maintenance", label: "🔧 Maintenance" },
  { value: "supplies", label: "📦 Medical Supplies" },
  { value: "equipment", label: "⚕️ Equipment" },
  { value: "marketing", label: "📢 Marketing" },
  {value : "purchase" , label : "💵 Purchase"},
  { value: "other", label: "📝 Other" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "💵 Cash" },
  { value: "bank_transfer", label: "🏦 Bank Transfer" },
  { value: "upi", label: "📱 UPI" },
  { value: "check", label: "📄 Check" },
  { value: "card", label: "💳 Card" },
];

const STATUS_OPTIONS = [
  { value: "paid", label: "Paid", color: "#4caf50" },
  { value: "pending", label: "Pending", color: "#ff9800" },
  { value: "cancelled", label: "Cancelled", color: "#f44336" },
];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const ExpenseTracker = () => {
  const dataProvider = useDataProvider();
  const notify = useNotify();

  // === Load Doctors & Patients from API ===
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadDoctors = async () => {
      try {
        setDoctorsLoading(true);
        const res = await dataProvider.getList("doctors", {
          pagination: { page: 1, perPage: 1000 },
          sort: { field: "name", order: "ASC" },
          filter: { q: "" },
        });
        if (mounted) setDoctors(res.data ?? []);
      } catch (e) {
        notify(e?.message || "Failed to load doctors", { type: "error" });
      } finally {
        if (mounted) setDoctorsLoading(false);
      }
    };

    const loadPatients = async () => {
      try {
        const res = await dataProvider.getList("patients", {
          pagination: { page: 1, perPage: 1000 },
          sort: { field: "name", order: "ASC" },
          filter: { q: "" },
        });
        if (mounted) setPatients(res.data ?? []);
      } catch (e) {
        notify(e?.message || "Failed to load patients", { type: "error" });
      }
    };

    loadDoctors();
    loadPatients();
    return () => { mounted = false; };
  }, [dataProvider, notify]);

  // === Filters ===
  const now = new Date();
  const [filters, setFilters] = useState({
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    type: "",
    status: "",
    paymentMethod: "",
    doctorId: "",
  });

  // === Expenses from API ===
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  const safe = (v) => (v === undefined || v === null || v === "" ? undefined : v);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoadingExpenses(true);
      const res = await dataProvider.getList("expenses", {
        pagination: { page: 1, perPage: 500 },
        sort: { field: "date", order: "DESC" },
        filter: {
          month: safe(filters.month),
          year: safe(filters.year),
          type: safe(filters.type),
          status: safe(filters.status),
          paymentMethod: safe(filters.paymentMethod),
          doctorId: safe(filters.doctorId),
        },
      });
      setExpenses(res.data ?? []);
    } catch (e) {
      notify(e?.message || "Failed to fetch expenses", { type: "error" });
    } finally {
      setLoadingExpenses(false);
    }
  }, [dataProvider, filters, notify]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  // === Helpers ===
  const formatCurrency = useCallback(
    (amount) =>
      new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
        .format(Number(amount) || 0),
    []
  );

  const getDoctorName = useCallback(
    (doctorId) => (doctors.find((d) => d.id === doctorId)?.name ?? "Unknown Doctor"),
    [doctors]
  );
  const getPatientName = useCallback(
    (patientId) => (patients.find((p) => p.id === patientId)?.name ?? "Unknown Patient"),
    [patients]
  );
  const getTypeLabel = useCallback(
    (type) => EXPENSE_TYPES.find((t) => t.value === type)?.label || type,
    []
  );

  // === Add / Edit dialog state ===
  const [openDialog, setOpenDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Keep numeric fields as numbers (avoid string→number mixups)
  const [formData, setFormData] = useState({
    type: "other",
    title: "",
    description: "",
    amount: 0,                 // number
    date: new Date().toISOString().split("T")[0],
    doctorId: "",
    referralDoctorId: "",
    referralAmount: 0,         // number
    commissionPercentage: 0,   // number
    paymentMethod: "cash",
    status: "paid",
    category: "",
    notes: "",
  });

  const selectedExpenseType = useMemo(
    () => EXPENSE_TYPES.find((t) => t.value === formData.type),
    [formData.type]
  );

  const handleOpenDialog = useCallback((expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        type: expense.type,
        title: expense.title,
        description: expense.description || "",
        amount: Number(expense.amount) || 0,
        date: (expense.date || "").slice(0, 10),
        doctorId: expense.doctorId || "",
        referralDoctorId: expense.referralDoctorId || "",
        referralAmount: Number(expense.referralAmount) || 0,
        commissionPercentage: Number(expense.commissionPercentage) || 0,
        paymentMethod: expense.paymentMethod,
        status: expense.status,
        category: expense.category || "",
        notes: expense.notes || "",
      });
    } else {
      setEditingExpense(null);
      setFormData({
        type: "other",
        title: "",
        description: "",
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        doctorId: "",
        referralDoctorId: "",
        referralAmount: 0,
        commissionPercentage: 0,
        paymentMethod: "cash",
        status: "paid",
        category: "",
        notes: "",
      });
    }
    setOpenDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setEditingExpense(null);
  }, []);

  // Unified numeric coercion
  const toNum = (v) => {
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : 0;
  };

  const handleFormChange = useCallback(
    (field, value) => {
      setFormData((prev) => {
        const updated = { ...prev };

        // Coerce numeric fields
        if (field === "amount") updated.amount = toNum(value);
        else if (field === "referralAmount") updated.referralAmount = toNum(value);
        else if (field === "commissionPercentage") updated.commissionPercentage = toNum(value);
        else updated[field] = value;

        // Auto-generate salary title on doctor selection
        if (field === "doctorId" && updated.type === "salary" && updated.doctorId) {
          const doc = doctors.find((d) => d.id === updated.doctorId);
          if (doc) {
            const monthName = MONTHS[new Date(updated.date).getMonth()];
            updated.title = `${doc.name} - ${monthName} Salary`;
          }
        }

        // Auto-generate referral commission title on patient selection
        if (field === "referralDoctorId" && updated.type === "referral_commission" && updated.referralDoctorId) {
         const doc = doctors.find(d => d.id === updated.referralDoctorId);
if (doc) updated.title = `Referral Commission - Dr. ${doc.name}`;

        }

        // Auto-calc commission amount = referralAmount * commissionPercentage / 100
        const shouldAutoCalc =
          updated.type === "referral_commission" &&
          toNum(updated.referralAmount) > 0 &&
          toNum(updated.commissionPercentage) > 0;

        if (shouldAutoCalc) {
          const amt = (toNum(updated.referralAmount) * toNum(updated.commissionPercentage)) / 100;
          updated.amount = Math.round(amt); // keep integer currency display; change if you want decimals
        }

        // Reset role-specific fields when type changes
        if (field === "type") {
          if (value !== "salary") updated.doctorId = "";
          if (value !== "referral_commission") {
            updated.referralDoctorId = "";
            updated.referralAmount = 0;
            updated.commissionPercentage = 0;
          }
        }

        return updated;
      });
    },
    [doctors, patients]
  );

  // === Create / Update / Delete via dataProvider ===
  const submitExpense = useCallback(async () => {
    try {
      const payload = {
        ...formData,
        amount: toNum(formData.amount),
        referralAmount: toNum(formData.referralAmount),
        commissionPercentage: toNum(formData.commissionPercentage),
      };

      // Clean empties to please backend validators
      ["doctorId", "referralDoctorId", "category", "notes"].forEach((k) => {
        if (!payload[k]) delete payload[k];
      });
      if (!payload.date) payload.date = new Date().toISOString();

      if (editingExpense) {
        await dataProvider.update("expenses", {
          id: editingExpense.id,
          data: payload,
          previousData: undefined,
        });
        notify("Expense updated", { type: "success" });
      } else {
        await dataProvider.create("expenses", { data: payload });
        notify("Expense created", { type: "success" });
      }
      handleCloseDialog();
      fetchExpenses();
    } catch (e) {
      notify(e?.body?.message || e?.message || "Failed to save expense", { type: "error" });
    }
  }, [dataProvider, formData, editingExpense, handleCloseDialog, fetchExpenses, notify]);

  const deleteExpense = useCallback(
    async (id) => {
      if (!window.confirm("Delete this expense?")) return;
      try {
        await dataProvider.delete("expenses", { id });
        notify("Expense deleted", { type: "success" });
        fetchExpenses();
      } catch (e) {
        notify(e?.message || "Failed to delete expense", { type: "error" });
      }
    },
    [dataProvider, notify, fetchExpenses]
  );

  // === Derived ===
  const filteredExpenses = useMemo(() => expenses, [expenses]);
  const currentMonthTotal = useMemo(
    () => filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [filteredExpenses]
  );
  const summaryByType = useMemo(() => {
  const acc: Record<string, { count: number; total: number }> = {};
  filteredExpenses.forEach(e => {
    acc[e.type] ??= { count: 0, total: 0 };
    acc[e.type].count += 1;
    acc[e.type].total += Number(e.amount) || 0;
  });
  return acc; // <- typed
}, [filteredExpenses]);

  const downloadCSV = useCallback(() => {
    const headers = ["Date", "Type", "Title", "Doctor", "Patient", "Amount", "Payment Method", "Status"];
    const rows = filteredExpenses.map((exp) => [
      (exp.date || "").slice(0, 10),
      exp.type,
      exp.title,
      exp.doctorName || (exp.doctorId ? getDoctorName(exp.doctorId) : "-"),
      exp.referralDoctorName || (exp.referralDoctorId ? getPatientName(exp.referralDoctorId) : "-"),
      Number(exp.amount) || 0,
      exp.paymentMethod,
      exp.status,
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${filters.month}-${filters.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredExpenses, filters, getDoctorName, getPatientName]);

  // strictly boolean flag for disabling manual amount
  const isAutoCommission =
    formData.type === "referral_commission" &&
    !!formData.referralDoctorId &&
    toNum(formData.referralAmount) > 0 &&
    toNum(formData.commissionPercentage) > 0;

  return (
    <div style={ExpenseStyles.container}>
      {/* Header */}
      <div style={ExpenseStyles.header}>
        <div>
          <h1 style={ExpenseStyles.title}>💰 Expense Tracker</h1>
        <p style={ExpenseStyles.subtitle}>
            {MONTHS[parseInt(filters.month) - 1]} {filters.year}
          </p>
        </div>
        <div style={ExpenseStyles.buttonGroup}>
          <button style={ExpenseStyles.iconButton} onClick={downloadCSV} title="Download CSV">📥</button>
          <button style={ExpenseStyles.button} onClick={() => handleOpenDialog()}>➕ Add Expense</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={ExpenseStyles.statsGrid}>
        <div style={ExpenseStyles.statCard("linear-gradient(135deg, #667eea 0%, #764ba2 100%)")}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>💼</div>
          <div style={ExpenseStyles.statValue}>{formatCurrency(currentMonthTotal)}</div>
          <div style={ExpenseStyles.statLabel}>Total This Month</div>
        </div>

        <div style={ExpenseStyles.statCard("linear-gradient(135deg, #f093fb 0%, #f5576c 100%)")}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📝</div>
          <div style={ExpenseStyles.statValue}>{filteredExpenses.length}</div>
          <div style={ExpenseStyles.statLabel}>Total Expenses</div>
        </div>

        <div style={ExpenseStyles.statCard("linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)")}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>💵</div>
          <div style={ExpenseStyles.statValue}>
            {formatCurrency(currentMonthTotal / (filteredExpenses.length || 1))}
          </div>
          <div style={ExpenseStyles.statLabel}>Average Expense</div>
        </div>

        <div style={ExpenseStyles.statCard("linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)")}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📊</div>
          <div style={ExpenseStyles.statValue}>{Object.keys(summaryByType).length}</div>
          <div style={ExpenseStyles.statLabel}>Expense Categories</div>
        </div>
      </div>

      {Object.keys(summaryByType).length > 0 && (
        <div style={ExpenseStyles.summaryGrid}>
          {Object.entries(summaryByType).map(([type, data]) => (
            <div key={type} style={ExpenseStyles.summaryCard}>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
                {getTypeLabel(type).replace(/[^\w\s]/gi, "").trim()}
              </div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#2196f3" }}>
                {formatCurrency(data.total)}
              </div>
              <div style={{ fontSize: "12px", color: "#999" }}>
                {data.count} transaction{data.count !== 1 ? "s" : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={ExpenseStyles.filterBar}>
        <div style={ExpenseStyles.filterGrid}>
          <div>
            <select
              style={ExpenseStyles.input}
              value={filters.month}
              onChange={(e) => setFilters((p) => ({ ...p, month: e.target.value }))}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1)}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <input
              type="number"
              style={ExpenseStyles.input}
              value={filters.year}
              onChange={(e) => setFilters((p) => ({ ...p, year: e.target.value }))}
            />
          </div>
          <div>
            <select
              style={ExpenseStyles.input}
              value={filters.type}
              onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
            >
              <option value="">All Types</option>
              {EXPENSE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              style={ExpenseStyles.input}
              value={filters.doctorId}
              onChange={(e) => setFilters((p) => ({ ...p, doctorId: e.target.value }))}
              disabled={doctorsLoading}
            >
              <option value="">All Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.specialization ? ` - ${d.specialization}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              style={ExpenseStyles.input}
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              style={ExpenseStyles.input}
              value={filters.paymentMethod}
              onChange={(e) => setFilters((p) => ({ ...p, paymentMethod: e.target.value }))}
            >
              <option value="">All Methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              style={{ ...ExpenseStyles.input, cursor: "pointer", backgroundColor: "#f5f5f5" }}
              onClick={() =>
                setFilters({
                  month: String(now.getMonth() + 1),
                  year: String(now.getFullYear()),
                  type: "",
                  status: "",
                  paymentMethod: "",
                  doctorId: "",
                })
              }
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div style={ExpenseStyles.paper}>
        <div style={ExpenseStyles.paperHeader}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>
            Recent Expenses ({loadingExpenses ? "…" : filteredExpenses.length})
          </h2>
        </div>

        {!loadingExpenses && filteredExpenses.length === 0 ? (
          <div style={ExpenseStyles.emptyState}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
            <h3>No expenses found</h3>
            <p>Add your first expense or adjust your filters</p>
          </div>
        ) : (
          <div>
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                style={ExpenseStyles.expenseItem}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9f9f9")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
              >
                <div style={{ display: "flex", flex: 1 }}>
                  <div style={ExpenseStyles.expenseContent}>
                    <h3 style={ExpenseStyles.expenseTitle}>{expense.title}</h3>
                    {expense.description && (
                      <p style={ExpenseStyles.expenseDescription}>{expense.description}</p>
                    )}
                    {expense.doctorId && (
                      <p style={{ ...ExpenseStyles.expenseDescription, marginTop: 4 }}>
                        👨‍⚕️ {expense.doctorName || getDoctorName(expense.doctorId)}
                      </p>
                    )}
                    {expense.referralDoctorId && (
                      <p style={{ ...ExpenseStyles.expenseDescription, marginTop: 4 }}>
                        👤 {expense.patientName || getPatientName(expense.referralDoctorId)}
                      </p>
                    )}
                    <div>
                      <span style={ExpenseStyles.chip(null, "#e3f2fd")}>
                        {getTypeLabel(expense.type).replace(/[^\w\s]/gi, "").trim()}
                      </span>
                      <span style={ExpenseStyles.chip(STATUS_OPTIONS.find((s) => s.value === expense.status)?.color)}>
                        {STATUS_OPTIONS.find((s) => s.value === expense.status)?.label}
                      </span>
                      <span style={{ fontSize: 13, color: "#999" }}>
                        {new Date(expense.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={ExpenseStyles.expenseAmount}>{formatCurrency(expense.amount)}</span>
                  <button
                    style={{ ...ExpenseStyles.iconButton, marginRight: 4 }}
                    onClick={() => handleOpenDialog(expense)}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    style={ExpenseStyles.iconButton}
                    onClick={() => deleteExpense(expense.id)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      {openDialog && (
        <>
          <div style={ExpenseStyles.overlay} onClick={handleCloseDialog} />
          <div style={ExpenseStyles.dialog}>
            <div style={ExpenseStyles.dialogHeader}>
              {editingExpense ? "✏️ Edit Expense" : "➕ Add New Expense"}
            </div>
            <div style={ExpenseStyles.dialogContent}>
              {/* Type */}
              <div style={ExpenseStyles.formGroup}>
                <label style={ExpenseStyles.label}>Expense Type *</label>
                <select
                  style={ExpenseStyles.input}
                  value={formData.type}
                  onChange={(e) => handleFormChange("type", e.target.value)}
                >
                  {EXPENSE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor for Salary */}
              {selectedExpenseType?.needsDoctor && (
                <>
                  {doctorsLoading ? (
                    <div style={ExpenseStyles.infoBox}>Loading doctors…</div>
                  ) : (
                    <div style={ExpenseStyles.formGroup}>
                      <label style={ExpenseStyles.label}>Select Doctor *</label>
                      <select
                        style={ExpenseStyles.input}
                        value={formData.doctorId}
                        onChange={(e) => handleFormChange("doctorId", e.target.value)}
                      >
                        <option value="">-- Select Doctor --</option>
                        {doctors.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                            {d.specialization ? ` - ${d.specialization}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Patient for Referral Commission */}
              {selectedExpenseType?.needsPatient && (
                <div style={ExpenseStyles.formGroup}>
                  <label style={ExpenseStyles.label}>Select Patient *</label>
                  <select value={formData.referralDoctorId} onChange={e => handleFormChange("referralDoctorId", e.target.value)}>
  <option value="">Select Referral Doctor</option>
  {doctors.map((d) => (
    <option key={d.id} value={d.id}>{d.name}</option>
  ))}
</select>

                </div>
              )}

              {/* Title / Date */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={ExpenseStyles.label}>Title *</label>
                  <input
                    style={ExpenseStyles.input}
                    value={formData.title}
                    onChange={(e) => handleFormChange("title", e.target.value)}
                    placeholder="e.g., Monthly Electricity Bill"
                  />
                </div>
                <div>
                  <label style={ExpenseStyles.label}>Date *</label>
                  <input
                    type="date"
                    style={ExpenseStyles.input}
                    value={formData.date}
                    onChange={(e) => handleFormChange("date", e.target.value)}
                  />
                </div>
              </div>

              {/* Description */}
              <div style={ExpenseStyles.formGroup}>
                <label style={ExpenseStyles.label}>Description</label>
                <textarea
                  style={{ ...ExpenseStyles.input, minHeight: 60, resize: "vertical" }}
                  value={formData.description}
                  onChange={(e) => handleFormChange("description", e.target.value)}
                  placeholder="Add any additional details…"
                />
              </div>

              {/* Referral commission inputs */}
              {formData.type === "referral_commission" && (
                <>
                  <div style={ExpenseStyles.infoBox}>
                    💡 Commission auto-calculates from Referral Amount × Percentage
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={ExpenseStyles.label}>Referral Amount *</label>
                      <input
                        type="number"
                        style={ExpenseStyles.input}
                        value={formData.referralAmount}
                        onChange={(e) => handleFormChange("referralAmount", e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label style={ExpenseStyles.label}>Commission % *</label>
                      <input
                        type="number"
                        style={ExpenseStyles.input}
                        value={formData.commissionPercentage}
                        onChange={(e) => handleFormChange("commissionPercentage", e.target.value)}
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Amount / Method / Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={ExpenseStyles.label}>Amount *</label>
                  <input
                    type="number"
                    style={ExpenseStyles.input}
                    value={formData.amount}
                    onChange={(e) => handleFormChange("amount", e.target.value)}
                    disabled={isAutoCommission}
                    placeholder="0"
                  />
                  {formData.type === "referral_commission" && formData.amount > 0 && (
                    <div style={{ fontSize: 12, color: "#4caf50", marginTop: 4 }}>
                      ✓ Auto-calculated: ₹{formData.amount}
                    </div>
                  )}
                </div>
                <div>
                  <label style={ExpenseStyles.label}>Payment Method *</label>
                  <select
                    style={ExpenseStyles.input}
                    value={formData.paymentMethod}
                    onChange={(e) => handleFormChange("paymentMethod", e.target.value)}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={ExpenseStyles.label}>Status *</label>
                  <select
                    style={ExpenseStyles.input}
                    value={formData.status}
                    onChange={(e) => handleFormChange("status", e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category / Notes */}
              <div style={ExpenseStyles.formGroup}>
                <label style={ExpenseStyles.label}>Category</label>
                <input
                  style={ExpenseStyles.input}
                  value={formData.category}
                  onChange={(e) => handleFormChange("category", e.target.value)}
                  placeholder="e.g., Utilities, Personnel"
                />
              </div>
              <div style={ExpenseStyles.formGroup}>
                <label style={ExpenseStyles.label}>Notes</label>
                <textarea
                  style={{ ...ExpenseStyles.input, minHeight: 60, resize: "vertical" }}
                  value={formData.notes}
                  onChange={(e) => handleFormChange("notes", e.target.value)}
                  placeholder="Add internal notes…"
                />
              </div>
            </div>

            <div style={ExpenseStyles.dialogFooter}>
              <button style={{ ...ExpenseStyles.button, backgroundColor: "#9e9e9e" }} onClick={handleCloseDialog}>
                Cancel
              </button>
              <button
                style={ExpenseStyles.button}
                onClick={submitExpense}
                disabled={
                  !formData.title ||
                  !(toNum(formData.amount) > 0) ||
                  (selectedExpenseType?.needsDoctor && !formData.doctorId) ||
                  (selectedExpenseType?.needsPatient && !formData.referralDoctorId)
                }
              >
                {editingExpense ? "Update" : "Add"} Expense
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExpenseTracker;
