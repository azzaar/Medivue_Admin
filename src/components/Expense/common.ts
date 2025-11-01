import { ExpenseCategory } from "@/types/expense";
import type { ChipProps } from "@mui/material";
import type { Validator } from "react-admin";

export type Choice = { id: string; name: string };

export const categoryChoices: Choice[] = [
  { id: "salary", name: "Salary" },
  { id: "commission", name: "Commission" },
  { id: "rent", name: "Rent" },
  { id: "other", name: "Other Expense" },
];

export const paymentChoices: Choice[] = [
  { id: "bank", name: "Bank" },
  { id: "card", name: "Card" },
  { id: "upi", name: "UPI" },
  { id: "cash", name: "Cash" },
];

// NOTE: We type these as Validator to match RA’s expected signature
export const required = (msg = "Required"): Validator => (value) =>
  value !== undefined && value !== null && value !== "" ? undefined : msg;

export const isoDate: Validator = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? undefined
    : "Use yyyy-mm-dd";

export const min0: Validator = (value) =>
  value === undefined || value === null || Number(value) >= 0
    ? undefined
    : "Must be ≥ 0";

type ChipColor = Exclude<ChipProps["color"], undefined>;

export const categoryColor = (c?: ExpenseCategory): ChipColor => {
  const map: Record<ExpenseCategory, ChipColor> = {
    salary: "success",
    commission: "info",
    rent: "warning",
    other: "default",
  };
  return c ? map[c] : "default";
};


// common.ts (or common.js/.tsx) — keep exactly these keys you already use
export const ExpenseStyles = {
  container: {
    padding: 24,
    backgroundColor: '#f5f7fa',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },

  title: {
    fontSize: 32,
    fontWeight: 700,
    margin: '0 0 4px 0',
    color: '#1a1a1a',
  },

  subtitle: {
    fontSize: 14,
    color: '#666',
    margin: 0,
  },

  buttonGroup: { display: 'flex', gap: 8 },

  button: {
    padding: '10px 20px',
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  iconButton: {
    padding: 10,
    backgroundColor: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 20,
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },

  // use a function that returns a const object so TS keeps string literals
  statCard: (gradient: string) =>
    ({
      background: gradient,
      color: 'white',
      padding: 24,
      borderRadius: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    } as const),

  statValue: { fontSize: 32, fontWeight: 700, margin: '8px 0' },
  statLabel: { fontSize: 14, opacity: 0.9 },

  filterBar: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },

  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 12,
  },

  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'inherit',
    background: 'white',
  },

  paper: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },

  paperHeader: {
    padding: '16px 20px',
    backgroundColor: '#fafafa',
    borderBottom: '1px solid #e0e0e0',
  },

  expenseItem: {
    padding: 20,
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    transition: 'background-color 0.2s',
  },

  expenseContent: { flex: 1 },

  expenseTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: '0 0 4px 0',
    color: '#1a1a1a',
  },

  expenseDescription: { fontSize: 14, color: '#666', margin: '0 0 8px 0' },

  chip: (color?: string | null, bg?: string | null) =>
    ({
      display: 'inline-block',
      padding: '4px 12px',
      backgroundColor: bg || color || '#1976d2',
      color: bg ? '#1976d2' : 'white',
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 500,
      marginRight: 8,
      marginBottom: 4,
    } as const),

  expenseAmount: { fontSize: 20, fontWeight: 700, color: '#2196f3', marginRight: 16 },

  dialog: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    width: '90%',
    maxWidth: 700,
    maxHeight: '90vh',
    overflow: 'auto',
    zIndex: 1001,
  },

  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },

  dialogHeader: {
    padding: 20,
    backgroundColor: '#f5f7fa',
    borderBottom: '1px solid #e0e0e0',
    fontSize: 20,
    fontWeight: 700,
  },

  dialogContent: { padding: 24 },

  dialogFooter: {
    padding: '16px 20px',
    backgroundColor: '#f5f7fa',
    borderTop: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
  },

  formGroup: { marginBottom: 16 },

  label: { display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#333' },

  emptyState: { textAlign: 'center', padding: '48px 24px', color: '#999' },

  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: '12px 16px',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
    color: '#1976d2',
    border: '1px solid #90caf9',
  },

  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
    marginBottom: 24,
  },

  summaryCard: { backgroundColor: 'white', padding: 16, borderRadius: 8, border: '1px solid #e0e0e0' },
} as const;
