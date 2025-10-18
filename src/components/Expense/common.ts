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
