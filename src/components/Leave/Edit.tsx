import React, { useState, useEffect } from 'react';
import {
  Edit,
  SimpleForm,
  TextInput,
  DateInput,
  SelectInput,
  ReferenceInput,
  required,
  useRecordContext,
  usePermissions,
} from 'react-admin';
import {
  Box,
  Typography,
  Alert,
  Chip,
  Stack,
  Paper,
} from '@mui/material';
import { Warning as WarningIcon, EventAvailable as EventIcon } from '@mui/icons-material';
import dayjs from 'dayjs';

const LeaveEditForm: React.FC = () => {
  const record = useRecordContext();
  const { permissions } = usePermissions();

  const isAdmin = permissions === 'admin' || permissions === 'superAdmin';
  const [startDate, setStartDate] = useState<string>(record?.startDate || '');
  const [endDate, setEndDate] = useState<string>(record?.endDate || '');
  const [days, setDays] = useState<number>(0);

  useEffect(() => {
    if (record) {
      setStartDate(record.startDate);
      setEndDate(record.endDate);
    }
  }, [record]);

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

  const validateDates = (value, allValues) => {
    if (!value) return 'Required';

    const start = dayjs(allValues.startDate);
    const end = dayjs(allValues.endDate);

    if (allValues.startDate && allValues.endDate) {
      if (end.isBefore(start)) {
        return 'End date must be after or equal to start date';
      }
    }

    return undefined;
  };

  if (!record) {
    return null;
  }

  // Only pending leaves can be edited
  if (record.status !== 'pending') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" icon={<WarningIcon />}>
          Only pending leave requests can be edited. This leave request has already been {record.status}.
        </Alert>
        <Box sx={{ mt: 2 }}>
          <a href="#/leaves">Back to Leave List</a>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Status Alert */}
          <Alert severity="info">
            You can only edit leave requests that are in pending status
          </Alert>

          {/* Doctor Selection (Admin Only) */}
          {isAdmin && (
            <ReferenceInput
              source="doctorId"
              reference="doctors"
              label="Doctor"
            >
              <SelectInput
                optionText="name"
                validate={required()}
                fullWidth
                disabled
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
          <DateInput
            source="startDate"
            label="Start Date"
            validate={[required(), validateDates]}
            onChange={(e) => setStartDate(e.target.value)}
            fullWidth
          />

          <DateInput
            source="endDate"
            label="End Date"
            validate={[required(), validateDates]}
            onChange={(e) => setEndDate(e.target.value)}
            fullWidth
            inputProps={{
              min: startDate,
            }}
          />

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
          />

          {/* Current Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Status:
            </Typography>
            <Chip
              label={record.status.toUpperCase()}
              color="warning"
              size="small"
            />
          </Box>

          {/* Applied Date */}
          <Typography variant="body2" color="text.secondary">
            Applied on: {dayjs(record.appliedDate).format('MMM DD, YYYY')}
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
};

const LeaveEdit: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Edit Leave Request
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Update your leave request details
        </Typography>
      </Box>

      <Edit mutationMode="pessimistic">
        <SimpleForm>
          <LeaveEditForm />
        </SimpleForm>
      </Edit>
    </Box>
  );
};

export default LeaveEdit;
