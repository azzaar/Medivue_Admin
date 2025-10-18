export type ExpenseCategory = "salary" | "commission" | "rent" | "other";
export type PaymentMode = "cash" | "upi" | "card" | "bank";

export interface Expense {
  id: string;
  _id?: string;
  date: string;                 // yyyy-mm-dd
  category: ExpenseCategory;
  title: string;
  amount: number;
  notes?: string;
  paymentMode?: PaymentMode;
  doctor: string;               // ObjectId
  doctorName?: string;          // denormalized for fast lists
  createdAt?: string;
  updatedAt?: string;
}
