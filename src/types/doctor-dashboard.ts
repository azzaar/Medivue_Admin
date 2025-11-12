export interface DoctorStats {
  totalPatients: number;
  todayVisits: number;
  weeklyVisits: number;
  monthlyVisits: number;
  totalRevenue: number;
  monthlyRevenue: number;
  pendingDues: number;
}

export interface PatientVisit {
  id: string;
  patientId: string;
  patientName: string;
  visitDate: string;
  fee: number;
  paid: number;
  due: number;
  paymentType: "cash" | "upi" | "card" | "bank" | "";
  status: "active" | "closed";
}

export interface RevenueData {
  date: string;
  revenue: number;
  visits: number;
}

export interface PaymentSummary {
  totalCollected: number;
  cash: number;
  upi: number;
  card: number;
  bank: number;
}

export interface RecentPatient {
  id: string;
  name: string;
  lastVisit: string;
  totalVisits: number;
  totalPaid: number;
  totalDue: number;
}
