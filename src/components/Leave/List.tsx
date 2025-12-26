import React, { useState, useEffect, useCallback } from 'react';
import {
  useDataProvider,
  useNotify,
  useRefresh,
  usePermissions,
} from 'react-admin';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Paper,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField as MuiTextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  CalendarMonth as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  HourglassEmpty as PendingIcon,
  CheckCircleOutline as ApprovedIcon,
  HighlightOff as RejectedIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Leave, LeaveStats, LeaveFilters } from '../../types/leave';
import dayjs from 'dayjs';
import Grid from '@mui/material/GridLegacy';

// Status Chip Component with Action for Admin
const StatusChip: React.FC<{ record: Leave }> = ({ record }) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  const { permissions } = usePermissions();
  const [openReject, setOpenReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = permissions === 'admin' || permissions === 'superAdmin';
  const isPending = record.status === 'pending';

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to approve this leave request?')) return;

    setLoading(true);
    try {
      await dataProvider.update('leaves', {
        id: record.id,
        data: { status: 'approved', approvedDate: new Date().toISOString() },
        previousData: record,
      });
      notify('Leave request approved successfully', { type: 'success' });
      refresh();
    } catch (error) {
      notify(error?.message || 'Failed to approve leave', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenReject(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim()) {
      notify('Please provide a rejection reason', { type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await dataProvider.update('leaves', {
        id: record.id,
        data: {
          status: 'rejected',
          rejectionReason,
          approvedDate: new Date().toISOString()
        },
        previousData: record,
      });
      notify('Leave request rejected', { type: 'info' });
      setOpenReject(false);
      setRejectionReason('');
      refresh();
    } catch (error) {
      notify(error?.message || 'Failed to reject leave', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (record.status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (record.status) {
      case 'approved':
        return <ApprovedIcon sx={{ fontSize: 16 }} />;
      case 'rejected':
        return <RejectedIcon sx={{ fontSize: 16 }} />;
      case 'pending':
        return <PendingIcon sx={{ fontSize: 16 }} />;
      default:
        return null;
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Chip
          label={record.status.toUpperCase()}
          color={getStatusColor()}
          size="small"
          icon={getStatusIcon()}
          sx={{ fontWeight: 600 }}
        />
        {isAdmin && isPending && (
          <>
            <Tooltip title="Approve">
              <IconButton
                size="small"
                color="success"
                onClick={handleApprove}
                disabled={loading}
              >
                <ApproveIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reject">
              <IconButton
                size="small"
                color="error"
                onClick={handleRejectClick}
                disabled={loading}
              >
                <RejectIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      <Dialog open={openReject} onClose={() => setOpenReject(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Leave Request</DialogTitle>
        <DialogContent>
          <MuiTextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            type="text"
            fullWidth
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Please provide a reason for rejection..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReject(false)}>Cancel</Button>
          <Button onClick={handleRejectConfirm} variant="contained" color="error" disabled={loading}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Leave Type Chip
const LeaveTypeChip: React.FC<{ type: string }> = ({ type }) => {
  const getTypeColor = () => {
    switch (type) {
      case 'casual':
        return 'primary';
      case 'sick':
        return 'error';
      case 'vacation':
        return 'success';
      case 'emergency':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Chip
      label={type.charAt(0).toUpperCase() + type.slice(1)}
      color={getTypeColor()}
      size="small"
      variant="outlined"
    />
  );
};

// Summary Cards Component
const SummaryCards: React.FC<{ stats: LeaveStats }> = ({ stats }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const cards = [
    {
      title: 'Total Leaves',
      value: stats.total,
      icon: <TrendingUpIcon />,
      color: theme.palette.primary.main,
      bgColor: theme.palette.primary.light + '20',
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: <PendingIcon />,
      color: theme.palette.warning.main,
      bgColor: theme.palette.warning.light + '20',
    },
    {
      title: 'Approved',
      value: stats.approved,
      icon: <ApprovedIcon />,
      color: theme.palette.success.main,
      bgColor: theme.palette.success.light + '20',
    },
    {
      title: 'Rejected',
      value: stats.rejected,
      icon: <RejectedIcon />,
      color: theme.palette.error.main,
      bgColor: theme.palette.error.light + '20',
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card, index) => (
        <Grid item xs={6} sm={6} md={3} key={index}>
          <Card sx={{ height: '100%', background: card.bgColor }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {card.title}
                  </Typography>
                  <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" color={card.color}>
                    {card.value}
                  </Typography>
                </Box>
                <Box sx={{ color: card.color, opacity: 0.8 }}>
                  {React.cloneElement(card.icon, { fontSize: isMobile ? 'medium' : 'large' })}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

// Main Leave List Component
const LeaveList: React.FC = () => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const { permissions } = usePermissions();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const isAdmin = permissions === 'admin' || permissions === 'superAdmin';
  const linkedDoctorId = localStorage.getItem('linkedDoctorId');

  const [activeTab, setActiveTab] = useState<string>(isAdmin ? 'pending' : 'my-leaves');
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [stats, setStats] = useState<LeaveStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    casualLeaves: 0,
    sickLeaves: 0,
    vacationLeaves: 0,
  });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<LeaveFilters>({
    status: 'all',
    leaveType: 'all',
    doctorId: '',
    month: 'all',
    year: new Date().getFullYear().toString(),
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: 'all', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];
interface LeaveFilter {
  doctorId?: string;        // Optional string property for doctorId
  status?: 'pending' | 'approved' | 'rejected';  // Enum type for status
  leaveType?: string; // Enum type for leaveType
  month?: string;           // Optional string for month
  year?: string;            // Optional string for year
  startDate?: { $gte: Date };  // Optional for startDate filter
  endDate?: { $lte: Date };    // Optional for endDate filter
}
  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const filter : LeaveFilter = {};

      // Role-based filtering
      if (activeTab === 'my-leaves' && linkedDoctorId) {
        filter.doctorId = linkedDoctorId;
      } else if (activeTab === 'pending') {
        filter.status = 'pending';
      } else if (activeTab === 'approved') {
        filter.status = 'approved';
      } else if (activeTab === 'rejected') {
        filter.status = 'rejected';
      }

      // Apply additional filters
      if (filters.doctorId && filters.doctorId !== 'all') {
        filter.doctorId = filters.doctorId;
      }
      if (filters.leaveType && filters.leaveType !== 'all') {
        filter.leaveType = filters.leaveType;
      }
      if (filters.month && filters.month !== 'all') {
        filter.month = filters.month;
      }
      if (filters.year && filters.year !== 'all') {
        filter.year = filters.year;
      }

      const { data } = await dataProvider.getList('leaves', {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: 'appliedDate', order: 'DESC' },
        filter,
      });

      const leavesData = data as Leave[];
      setLeaves(leavesData);

      // Calculate stats
      const newStats: LeaveStats = {
        total: leavesData.length,
        pending: leavesData.filter((l) => l.status === 'pending').length,
        approved: leavesData.filter((l) => l.status === 'approved').length,
        rejected: leavesData.filter((l) => l.status === 'rejected').length,
        casualLeaves: leavesData.filter((l) => l.leaveType === 'casual').length,
        sickLeaves: leavesData.filter((l) => l.leaveType === 'sick').length,
        vacationLeaves: leavesData.filter((l) => l.leaveType === 'vacation').length,
      };
      setStats(newStats);
    } catch (error) {
      notify(error?.message || 'Failed to fetch leaves', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [dataProvider, notify, activeTab, filters, linkedDoctorId]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  const handleFilterChange = (field: keyof LeaveFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleExportCSV = () => {
    const escapeCSV = (val: string | number) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const headers = [
      'Doctor Name',
      'Leave Type',
      'Start Date',
      'End Date',
      'Days',
      'Reason',
      'Status',
      'Applied Date',
      'Approved Date',
      'Rejection Reason',
    ];

    const rows = leaves.map((leave) => [
      escapeCSV(leave.doctorName || 'N/A'),
      escapeCSV(leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)),
      escapeCSV(dayjs(leave.startDate).format('DD-MM-YYYY')),
      escapeCSV(dayjs(leave.endDate).format('DD-MM-YYYY')),
      dayjs(leave.endDate).diff(dayjs(leave.startDate), 'day') + 1,
      escapeCSV(leave.reason),
      escapeCSV(leave.status.charAt(0).toUpperCase() + leave.status.slice(1)),
      escapeCSV(dayjs(leave.appliedDate).format('DD-MM-YYYY')),
      escapeCSV(leave.approvedDate ? dayjs(leave.approvedDate).format('DD-MM-YYYY') : 'N/A'),
      escapeCSV(leave.rejectionReason || 'N/A'),
    ]);

    const csv = [
      headers.map(h => escapeCSV(h)).join(','),
      ...rows.map((row) => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leave_report_${dayjs().format('DD-MM-YYYY')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const calculateDays = (startDate: string, endDate: string) => {
    return dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">
          Leave Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchLeaves}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            disabled={leaves.length === 0}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            href="#/leaves/create"
          >
            + New Leave Request
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <SummaryCards stats={stats} />

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {!isAdmin && <Tab label="My Leaves" value="my-leaves" />}
          {isAdmin && <Tab label="Pending Approvals" value="pending" icon={<PendingIcon />} iconPosition="start" />}
          {isAdmin && <Tab label="All Leaves" value="all" />}
          {isAdmin && <Tab label="Approved" value="approved" icon={<ApprovedIcon />} iconPosition="start" />}
          {isAdmin && <Tab label="Rejected" value="rejected" icon={<RejectedIcon />} iconPosition="start" />}
        </Tabs>
      </Paper>

      {/* Filters */}
      {activeTab !== 'calendar' && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <MuiTextField
                select
                fullWidth
                label="Year"
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                SelectProps={{ native: true }}
                size="small"
              >
                <option value="all">All Years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </MuiTextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MuiTextField
                select
                fullWidth
                label="Month"
                value={filters.month}
                onChange={(e) => handleFilterChange('month', e.target.value)}
                SelectProps={{ native: true }}
                size="small"
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </MuiTextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MuiTextField
                select
                fullWidth
                label="Leave Type"
                value={filters.leaveType}
                onChange={(e) => handleFilterChange('leaveType', e.target.value)}
                SelectProps={{ native: true }}
                size="small"
              >
                <option value="all">All Types</option>
                <option value="casual">Casual</option>
                <option value="sick">Sick</option>
                <option value="vacation">Vacation</option>
                <option value="emergency">Emergency</option>
                <option value="other">Other</option>
              </MuiTextField>
            </Grid>
            {isAdmin && (
              <Grid item xs={12} sm={6} md={3}>
                <MuiTextField
                  fullWidth
                  label="Doctor ID"
                  value={filters.doctorId}
                  onChange={(e) => handleFilterChange('doctorId', e.target.value)}
                  placeholder="Filter by doctor ID"
                  size="small"
                />
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Leave Table */}
      {activeTab !== 'calendar' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.grey[100] }}>
                {isAdmin && <TableCell sx={{ fontWeight: 'bold' }}>Doctor</TableCell>}
                <TableCell sx={{ fontWeight: 'bold' }}>Leave Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Start Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>End Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Days</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Applied Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 9 : 8} align="center" sx={{ py: 4 }}>
                    <Typography>Loading...</Typography>
                  </TableCell>
                </TableRow>
              ) : leaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 9 : 8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No leaves found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                leaves.map((leave) => (
                  <TableRow key={leave.id} hover>
                    {isAdmin && (
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {leave.doctorId.name || `Doctor #${leave.doctorId}`}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell>
                      <LeaveTypeChip type={leave.leaveType} />
                    </TableCell>
                    <TableCell>{dayjs(leave.startDate).format('MMM DD, YYYY')}</TableCell>
                    <TableCell>{dayjs(leave.endDate).format('MMM DD, YYYY')}</TableCell>
                    <TableCell>
                      <Chip label={`${calculateDays(leave.startDate, leave.endDate)} days`} size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {leave.reason}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip record={leave} />
                    </TableCell>
                    <TableCell>{dayjs(leave.appliedDate).format('MMM DD, YYYY')}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Details">
                          <IconButton size="small" href={`#/leaves/${leave.id}/show`}>
                            <ApprovedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {leave.status === 'pending' && (
                          <Tooltip title="Edit">
                            <IconButton size="small" href={`#/leaves/${leave.id}`} color="primary">
                              <ApproveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Calendar View Placeholder */}
      {activeTab === 'calendar' && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CalendarIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Calendar View
          </Typography>
          <Typography color="text.secondary">
            Calendar view will be implemented in the Calendar component
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default LeaveList;
