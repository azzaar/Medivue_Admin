import React, { useState, useEffect } from 'react';
import {
  Create,
  SimpleForm,
  TextInput,
  DateInput,
  SelectInput,
  ReferenceInput,
  required,
  useDataProvider,
  useNotify,
  useRedirect,
  usePermissions,
} from 'react-admin';
import Grid from '@mui/material/GridLegacy';

import {
  Box,
  Typography,
  Alert,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
} from '@mui/material';
import { Info as InfoIcon, EventAvailable as EventIcon } from '@mui/icons-material';
import dayjs from 'dayjs';

const LeaveCreate: React.FC = () => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const redirect = useRedirect();
  const { permissions } = usePermissions();

  const isAdmin = permissions === 'admin' || permissions === 'superAdmin';
  const linkedDoctorId = localStorage.getItem('linkedDoctorId');

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [days, setDays] = useState<number>(0);
  const [leaveBalance, setLeaveBalance] = useState({
    casual: 12,
    sick: 10,
    vacation: 15,
  });

  useEffect(() => {
    if (startDate && endDate) {
      const start = dayjs(startDate);
      const end = dayjs(endDate);
      if (end.isAfter(start) || end.isSame(start)) {
        const calculatedDays = end.diff(start, 'day') + 1;
        setDays(calculatedDays);
      } else {
        setDays(0);
      }
    } else {
      setDays(0);
    }
  }, [startDate, endDate]);

  // Fetch leave balance for the doctor
  useEffect(() => {
    const fetchLeaveBalance = async () => {
      if (!linkedDoctorId && !isAdmin) return;

      try {
        const doctorId = linkedDoctorId;
        const currentYear = new Date().getFullYear();

        // Fetch all leaves for current year
        const { data: leaves } = await dataProvider.getList('leaves', {
          pagination: { page: 1, perPage: 1000 },
          sort: { field: 'appliedDate', order: 'DESC' },
          filter: {
            doctorId,
            year: currentYear.toString(),
            status: 'approved',
          },
        });

        // Calculate used leaves
        const usedCasual = leaves.filter((l) => l.leaveType === 'casual').length;
        const usedSick = leaves.filter((l) => l.leaveType === 'sick').length;
        const usedVacation = leaves.filter((l) => l.leaveType === 'vacation').length;

        setLeaveBalance({
          casual: Math.max(0, 12 - usedCasual),
          sick: Math.max(0, 10 - usedSick),
          vacation: Math.max(0, 15 - usedVacation),
        });
      } catch (error) {
        console.error('Failed to fetch leave balance:', error);
      }
    };

    fetchLeaveBalance();
  }, [dataProvider, linkedDoctorId, isAdmin]);

  const validateDates = (value, allValues) => {
    if (!value) return 'Required';

    const start = dayjs(allValues.startDate);
    const end = dayjs(allValues.endDate);

    if (allValues.startDate && allValues.endDate) {
      if (end.isBefore(start)) {
        return 'End date must be after or equal to start date';
      }

      // Check if applying for past dates
      if (start.isBefore(dayjs(), 'day')) {
        return 'Cannot apply for past dates';
      }
    }

    return undefined;
  };

  const handleSubmit = async (values) => {
    try {
      const formData = {
        ...values,
        doctorId: isAdmin ? values.doctorId : linkedDoctorId,
        status: 'pending',
        appliedDate: new Date().toISOString(),
      };

      await dataProvider.create('leaves', { data: formData });
      notify('Leave request submitted successfully', { type: 'success' });
      redirect('/leaves');
    } catch (error) {
      notify(error?.message || 'Failed to submit leave request', { type: 'error' });
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          New Leave Request
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Fill out the form below to request time off
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Leave Form */}
        <Grid item xs={12} md={8}>
          <Create redirect="list">
            <SimpleForm onSubmit={handleSubmit}>
              <Paper sx={{ p: 3, width: '100%' }}>
                <Stack spacing={3}>
                  {/* Doctor Selection (Admin Only) */}
                  {isAdmin && (
                    <ReferenceInput
                      source="doctorId"
                      reference="doctors"
                      label="Select Doctor"
                    >
                      <SelectInput
                        optionText="name"
                        validate={required()}
                        fullWidth
                      />
                    </ReferenceInput>
                  )}

                  {/* Leave Type */}
                  <SelectInput
                    source="leaveType"
                    label="Leave Type"
                    choices={[
                      { id: 'casual', name: 'Casual Leave' },
                      { id: 'sick', name: 'Sick Leave' },
                      { id: 'vacation', name: 'Vacation Leave' },
                      { id: 'emergency', name: 'Emergency Leave' },
                      { id: 'other', name: 'Other' },
                    ]}
                    validate={required()}
                    fullWidth
                  />

                  {/* Date Range */}
                  <Box>
                    <DateInput
                      source="startDate"
                      label="Start Date"
                      validate={[required(), validateDates]}
                      onChange={(e) => setStartDate(e.target.value)}
                      fullWidth
                      inputProps={{
                        min: dayjs().format('YYYY-MM-DD'),
                      }}
                    />
                  </Box>

                  <Box>
                    <DateInput
                      source="endDate"
                      label="End Date"
                      validate={[required(), validateDates]}
                      onChange={(e) => setEndDate(e.target.value)}
                      fullWidth
                      inputProps={{
                        min: startDate || dayjs().format('YYYY-MM-DD'),
                      }}
                    />
                  </Box>

                  {/* Days Calculation */}
                  {days > 0 && (
                    <Alert severity="info" icon={<EventIcon />}>
                      <Typography variant="body2">
                        Total duration: <strong>{days} day{days > 1 ? 's' : ''}</strong>
                      </Typography>
                    </Alert>
                  )}

                  {/* Reason */}
                  <TextInput
                    source="reason"
                    label="Reason for Leave"
                    multiline
                    rows={4}
                    validate={required()}
                    fullWidth
                    helperText="Please provide a brief explanation for your leave request"
                  />

                  {/* Additional Notes */}
                  <TextInput
                    source="notes"
                    label="Additional Notes (Optional)"
                    multiline
                    rows={3}
                    fullWidth
                    helperText="Any additional information you'd like to provide"
                  />
                </Stack>
              </Paper>
            </SimpleForm>
          </Create>
        </Grid>

        {/* Sidebar Info */}
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            {/* Leave Balance Card */}
            {!isAdmin && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Leave Balance ({new Date().getFullYear()})
                  </Typography>
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Casual Leave</Typography>
                      <Chip
                        label={`${leaveBalance.casual} / 12`}
                        color={leaveBalance.casual > 5 ? 'success' : leaveBalance.casual > 2 ? 'warning' : 'error'}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Sick Leave</Typography>
                      <Chip
                        label={`${leaveBalance.sick} / 10`}
                        color={leaveBalance.sick > 5 ? 'success' : leaveBalance.sick > 2 ? 'warning' : 'error'}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Vacation Leave</Typography>
                      <Chip
                        label={`${leaveBalance.vacation} / 15`}
                        color={leaveBalance.vacation > 7 ? 'success' : leaveBalance.vacation > 3 ? 'warning' : 'error'}
                        size="small"
                      />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Guidelines Card */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <InfoIcon color="primary" />
                  <Typography variant="h6" fontWeight="bold">
                    Leave Guidelines
                  </Typography>
                </Box>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" color="primary">
                      Casual Leave
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      12 days per year. For personal matters, short breaks.
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" color="error">
                      Sick Leave
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      10 days per year. Medical certificate required for 3+ days.
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" color="success">
                      Vacation Leave
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      15 days per year. Apply at least 2 weeks in advance.
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" color="warning">
                      Emergency Leave
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      For unforeseen emergencies. Requires documentation.
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card sx={{ bgcolor: 'info.light' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  💡 Quick Tips
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • Submit requests at least 3 days in advance
                </Typography>
              
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • Provide detailed reasons for faster approval
                </Typography>
              
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LeaveCreate;
