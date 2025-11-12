import React, { useState } from 'react';
import {
  Show,
  useRecordContext,
  useDataProvider,
  useNotify,
  useRefresh,
  usePermissions,
  TopToolbar,
  EditButton,
  DeleteButton,
} from 'react-admin';
import Grid from '@mui/material/GridLegacy';

import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField as MuiTextField,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Person as PersonIcon,
  Event as EventIcon,
  Description as DescriptionIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  HourglassEmpty as PendingIcon,
  CalendarToday as CalendarIcon,
  Notes as NotesIcon,
  History as HistoryIcon,
  EventAvailable as DaysIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { Leave } from '../../types/leave';

const LeaveShowActions: React.FC = () => {
  const record = useRecordContext<Leave>();
  const { permissions } = usePermissions();
  const isAdmin = permissions === 'admin' || permissions === 'superAdmin';

  return (
    <TopToolbar>
      {record?.status === 'pending' && <EditButton />}
      {(isAdmin || record?.status === 'pending') && <DeleteButton />}
    </TopToolbar>
  );
};

const LeaveShowContent: React.FC = () => {
  const record = useRecordContext<Leave>();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  const { permissions } = usePermissions();

  const [openApprove, setOpenApprove] = useState(false);
  const [openReject, setOpenReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = permissions === 'admin' || permissions === 'superAdmin';
  const isPending = record?.status === 'pending';

  if (!record) {
    return null;
  }

  const handleApprove = async () => {
    setLoading(true);
    try {
      await dataProvider.update('leaves', {
        id: record.id,
        data: { status: 'approved', approvedDate: new Date().toISOString() },
        previousData: record,
      });
      notify('Leave request approved successfully', { type: 'success' });
      setOpenApprove(false);
      refresh();
    } catch (error) {
      notify(error?.message || 'Failed to approve leave', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
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
          approvedDate: new Date().toISOString(),
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

  const calculateDays = () => {
    return dayjs(record.endDate).diff(dayjs(record.startDate), 'day') + 1;
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

  const getLeaveTypeColor = () => {
    switch (record.leaveType) {
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

  const getStatusIcon = () => {
    switch (record.status) {
      case 'approved':
        return <ApprovedIcon />;
      case 'rejected':
        return <RejectedIcon />;
      case 'pending':
        return <PendingIcon />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* Status Banner */}
            <Alert
              severity={
                record.status === 'approved'
                  ? 'success'
                  : record.status === 'rejected'
                  ? 'error'
                  : 'warning'
              }
              icon={getStatusIcon()}
              sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}
            >
              Leave request is <strong>{record.status.toUpperCase()}</strong>
              {record.status === 'rejected' && record.rejectionReason && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Reason: {record.rejectionReason}
                </Typography>
              )}
            </Alert>

            {/* Leave Details Card */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Leave Details
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <List>
                  {/* Doctor */}
                  {isAdmin && (
                    <ListItem>
                      <ListItemIcon>
                        <PersonIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Doctor"
                        secondary={record.doctorName || `Doctor #${record.doctorId}`}
                      />
                    </ListItem>
                  )}

                  {/* Leave Type */}
                  <ListItem>
                    <ListItemIcon>
                      <DescriptionIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Leave Type"
                      secondary={
                        <Chip
                          label={record.leaveType.charAt(0).toUpperCase() + record.leaveType.slice(1)}
                          color={getLeaveTypeColor()}
                          size="small"
                          sx={{ mt: 0.5 }}
                        />
                      }
                    />
                  </ListItem>

                  {/* Duration */}
                  <ListItem>
                    <ListItemIcon>
                      <DaysIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Duration"
                      secondary={`${calculateDays()} day${calculateDays() > 1 ? 's' : ''}`}
                    />
                  </ListItem>

                  {/* Start Date */}
                  <ListItem>
                    <ListItemIcon>
                      <CalendarIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Start Date"
                      secondary={dayjs(record.startDate).format('dddd, MMMM DD, YYYY')}
                    />
                  </ListItem>

                  {/* End Date */}
                  <ListItem>
                    <ListItemIcon>
                      <EventIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="End Date"
                      secondary={dayjs(record.endDate).format('dddd, MMMM DD, YYYY')}
                    />
                  </ListItem>

                  {/* Applied Date */}
                  <ListItem>
                    <ListItemIcon>
                      <HistoryIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Applied On"
                      secondary={dayjs(record.appliedDate).format('dddd, MMMM DD, YYYY')}
                    />
                  </ListItem>

                  {/* Approved Date */}
                  {record.approvedDate && (
                    <ListItem>
                      <ListItemIcon>
                        <HistoryIcon color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={record.status === 'approved' ? 'Approved On' : 'Processed On'}
                        secondary={dayjs(record.approvedDate).format('dddd, MMMM DD, YYYY')}
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>

            {/* Reason Card */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <NotesIcon color="primary" />
                  <Typography variant="h6" fontWeight="bold">
                    Reason for Leave
                  </Typography>
                </Box>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body1">{record.reason}</Typography>
                </Paper>
              </CardContent>
            </Card>

            {/* Additional Notes */}
            {record.notes && (
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <NotesIcon color="action" />
                    <Typography variant="h6" fontWeight="bold">
                      Additional Notes
                    </Typography>
                  </Box>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body1">{record.notes}</Typography>
                  </Paper>
                </CardContent>
              </Card>
            )}

            {/* Admin Actions */}
            {isAdmin && isPending && (
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Admin Actions
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<ApprovedIcon />}
                      onClick={() => setOpenApprove(true)}
                      fullWidth
                    >
                      Approve Leave
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<RejectedIcon />}
                      onClick={() => setOpenReject(true)}
                      fullWidth
                    >
                      Reject Leave
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            {/* Quick Info Card */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Quick Info
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={record.status.toUpperCase()}
                        color={getStatusColor()}
                        icon={getStatusIcon()}
                      />
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Leave Type
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {record.leaveType.charAt(0).toUpperCase() + record.leaveType.slice(1)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Total Days
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary.main">
                      {calculateDays()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Date Range
                    </Typography>
                    <Typography variant="body2">
                      {dayjs(record.startDate).format('MMM DD')} - {dayjs(record.endDate).format('MMM DD, YYYY')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Timeline Card */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Timeline
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Applied
                    </Typography>
                    <Typography variant="body2">
                      {dayjs(record.appliedDate).format('MMM DD, YYYY')}
                    </Typography>
                  </Box>
                  {record.approvedDate && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {record.status === 'approved' ? 'Approved' : 'Processed'}
                      </Typography>
                      <Typography variant="body2">
                        {dayjs(record.approvedDate).format('MMM DD, YYYY')}
                      </Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Leave Starts
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {dayjs(record.startDate).format('MMM DD, YYYY')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Approve Dialog */}
      <Dialog open={openApprove} onClose={() => setOpenApprove(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Leave Request</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to approve this leave request for{' '}
            <strong>{calculateDays()} day{calculateDays() > 1 ? 's' : ''}</strong>?
          </Typography>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Leave Period:</strong> {dayjs(record.startDate).format('MMM DD')} -{' '}
              {dayjs(record.endDate).format('MMM DD, YYYY')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenApprove(false)}>Cancel</Button>
          <Button onClick={handleApprove} variant="contained" color="success" disabled={loading}>
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={openReject} onClose={() => setOpenReject(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Leave Request</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Please provide a reason for rejecting this leave request:
          </Typography>
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
            placeholder="Please provide a detailed reason for rejection..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReject(false)}>Cancel</Button>
          <Button onClick={handleReject} variant="contained" color="error" disabled={loading}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const LeaveShow: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Leave Request Details
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage leave request information
        </Typography>
      </Box>

      <Show actions={<LeaveShowActions />}>
        <LeaveShowContent />
      </Show>
    </Box>
  );
};

export default LeaveShow;
