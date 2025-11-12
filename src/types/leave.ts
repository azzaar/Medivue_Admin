export interface Leave {
  id: string;
  _id?: string;
  doctorId: {
      _id:string
      name: string
    },  doctorName?: string;
  startDate: string;
  endDate: string;
  leaveType: 'casual' | 'sick' | 'vacation' | 'emergency' | 'other';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectionReason?: string;
  documents?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  casualLeaves: number;
  sickLeaves: number;
  vacationLeaves: number;
}

export interface LeaveFilters {
  status?: 'pending' | 'approved' | 'rejected' | 'all';
  leaveType?: string;
  doctorId?: string;
  month?: string;
  year?: string;
  startDate?: string;
  endDate?: string;
}
