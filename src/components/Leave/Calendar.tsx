import React, { useState, useEffect, useCallback } from 'react';
import { useDataProvider, useNotify, usePermissions } from 'react-admin';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Avatar,
  Divider,
  useTheme,
  useMediaQuery,
  Fade,
  alpha,
  Badge,
  Autocomplete,
  TextField as MuiTextField,
  Skeleton,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';

import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Today as TodayIcon,
  Person as PersonIcon,
  Event as EventIcon,
  CalendarMonth as CalendarIcon,
  BeachAccess as VacationIcon,
  LocalHospital as SickIcon,
  Emergency as EmergencyIcon,
  Work as CasualIcon,
} from '@mui/icons-material';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Leave } from '../../types/leave';

dayjs.extend(isBetween);

interface CalendarDay {
  date: Dayjs;
  isCurrentMonth: boolean;
  leaves: Leave[];
}

interface Doctor {
  id: string;
  name: string;
}

const LeaveCalendar: React.FC = () => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const { permissions } = usePermissions();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const isAdmin = permissions === 'admin' || permissions === 'superAdmin';
  const linkedDoctorId = localStorage.getItem('linkedDoctorId');

  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [selectedLeaves, setSelectedLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterDoctor, setFilterDoctor] = useState<Doctor | null>(null);

  // Fetch doctors for dropdown
  useEffect(() => {
    if (isAdmin) {
      dataProvider
        .getList('doctors', {
          pagination: { page: 1, perPage: 1000 },
          sort: { field: 'name', order: 'ASC' },
          filter: {},
        })
        .then((resp) => {
          const doctorsList = (resp.data || []).map((d: Record<string, unknown>) => ({
            id: String(d.id ?? d._id),
            name: String(d.name),
          }));
          setDoctors(doctorsList);
        })
        .catch(() => setDoctors([]));
    }
  }, [dataProvider, isAdmin]);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const startOfMonth = currentDate.startOf('month');
      const endOfMonth = currentDate.endOf('month');

      const filter: Record<string, string> = {
        startDate_gte: startOfMonth.subtract(7, 'day').format('YYYY-MM-DD'),
        endDate_lte: endOfMonth.add(7, 'day').format('YYYY-MM-DD'),
        status: 'approved', // Only show approved leaves on calendar
      };

      if (!isAdmin && linkedDoctorId) {
        filter.doctorId = linkedDoctorId;
      }

      if (filterDoctor) {
        filter.doctorId = filterDoctor.id;
      }

      const { data } = await dataProvider.getList('leaves', {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: 'startDate', order: 'ASC' },
        filter,
      });

      setLeaves(data as Leave[]);
    } catch (error: unknown) {
      const err = error as Error;
      notify(err?.message || 'Failed to fetch leaves', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [dataProvider, notify, currentDate, isAdmin, linkedDoctorId, filterDoctor]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const generateCalendar = (): CalendarDay[][] => {
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startDate = startOfMonth.startOf('week');
    const endDate = endOfMonth.endOf('week');

    const calendar: CalendarDay[][] = [];
    let currentWeek: CalendarDay[] = [];
    let day = startDate;

    while (day.isBefore(endDate) || day.isSame(endDate, 'day')) {
      const dayLeaves = leaves.filter((leave) =>
        day.isBetween(leave.startDate, leave.endDate, 'day', '[]')
      );

      currentWeek.push({
        date: day,
        isCurrentMonth: day.month() === currentDate.month(),
        leaves: dayLeaves,
      });

      if (currentWeek.length === 7) {
        calendar.push(currentWeek);
        currentWeek = [];
      }

      day = day.add(1, 'day');
    }

    return calendar;
  };

  const handlePrevMonth = () => {
    setCurrentDate(currentDate.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setCurrentDate(currentDate.add(1, 'month'));
  };

  const handleToday = () => {
    setCurrentDate(dayjs());
  };

  const handleDateClick = (day: CalendarDay) => {
    if (day.leaves.length > 0) {
      setSelectedDate(day.date);
      setSelectedLeaves(day.leaves);
    }
  };

  const handleCloseDialog = () => {
    setSelectedDate(null);
    setSelectedLeaves([]);
  };

  const getLeaveColor = (leaveType: string) => {
    switch (leaveType) {
      case 'casual':
        return {
          main: theme.palette.primary.main,
          light: alpha(theme.palette.primary.main, 0.1),
        };
      case 'sick':
        return {
          main: theme.palette.error.main,
          light: alpha(theme.palette.error.main, 0.1),
        };
      case 'vacation':
        return {
          main: theme.palette.success.main,
          light: alpha(theme.palette.success.main, 0.1),
        };
      case 'emergency':
        return {
          main: theme.palette.warning.main,
          light: alpha(theme.palette.warning.main, 0.1),
        };
      default:
        return {
          main: theme.palette.grey[500],
          light: alpha(theme.palette.grey[500], 0.1),
        };
    }
  };

  const getLeaveIcon = (leaveType: string) => {
    switch (leaveType) {
      case 'casual':
        return <CasualIcon fontSize="small" />;
      case 'sick':
        return <SickIcon fontSize="small" />;
      case 'vacation':
        return <VacationIcon fontSize="small" />;
      case 'emergency':
        return <EmergencyIcon fontSize="small" />;
      default:
        return <EventIcon fontSize="small" />;
    }
  };

  const getDoctorName = (leave: Leave): string => {
    if (typeof leave.doctorId === 'object' && leave.doctorId !== null) {
      return leave.doctorId.name || leave.doctorName || 'Unknown Doctor';
    }
    return leave.doctorName || `Doctor #${leave.doctorId}`;
  };

  const calendar = generateCalendar();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate statistics
  const stats = {
    total: leaves.length,
    casual: leaves.filter(l => l.leaveType === 'casual').length,
    sick: leaves.filter(l => l.leaveType === 'sick').length,
    vacation: leaves.filter(l => l.leaveType === 'vacation').length,
    emergency: leaves.filter(l => l.leaveType === 'emergency').length,
  };

  return (
    <Fade in timeout={600}>
      <Box
        sx={{
          p: { xs: 2, md: 4 },
          minHeight: '100vh',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
        }}
      >
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'white',
          }}
        >
          <Stack direction="row" alignItems="center" gap={2}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: alpha('#fff', 0.2),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarIcon sx={{ fontSize: 32 }} />
            </Box>
            <Box flex={1}>
              <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={700}>
                Leave Calendar
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                View and manage approved leaves across the organization
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Statistics Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Leaves', value: stats.total, color: theme.palette.info.main, icon: <EventIcon /> },
            { label: 'Casual', value: stats.casual, color: theme.palette.primary.main, icon: <CasualIcon /> },
            { label: 'Sick', value: stats.sick, color: theme.palette.error.main, icon: <SickIcon /> },
            { label: 'Vacation', value: stats.vacation, color: theme.palette.success.main, icon: <VacationIcon /> },
            { label: 'Emergency', value: stats.emergency, color: theme.palette.warning.main, icon: <EmergencyIcon /> },
          ].map((stat, idx) => (
            <Grid item xs={6} sm={4} md key={idx}>
              <Card
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(stat.color, 0.1),
                  borderLeft: `4px solid ${stat.color}`,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: alpha(stat.color, 0.2),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: stat.color,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={700} color={stat.color}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Calendar Controls */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Tooltip title="Previous Month">
                  <IconButton
                    onClick={handlePrevMonth}
                    size="large"
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                      },
                    }}
                  >
                    <PrevIcon />
                  </IconButton>
                </Tooltip>
                <Box
                  sx={{
                    flex: 1,
                    textAlign: 'center',
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                  }}
                >
                  <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={700} color="primary">
                    {currentDate.format('MMMM YYYY')}
                  </Typography>
                </Box>
                <Tooltip title="Next Month">
                  <IconButton
                    onClick={handleNextMonth}
                    size="large"
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                      },
                    }}
                  >
                    <NextIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Go to Today">
                  <IconButton
                    onClick={handleToday}
                    size="large"
                    sx={{
                      bgcolor: alpha(theme.palette.success.main, 0.1),
                      color: theme.palette.success.main,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.success.main, 0.2),
                      },
                    }}
                  >
                    <TodayIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Grid>
            {isAdmin && (
              <Grid item xs={12} md={6}>
                <Autocomplete
                  value={filterDoctor}
                  onChange={(_, newValue) => setFilterDoctor(newValue)}
                  options={doctors}
                  getOptionLabel={(option) => option.name}
                  renderInput={(params) => (
                    <MuiTextField
                      {...params}
                      label="Filter by Doctor"
                      placeholder="Select a doctor"
                      size="medium"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  fullWidth
                />
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Legend */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ mb: 1.5 }}>
            Leave Types Legend:
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {[
              { type: 'casual', label: 'Casual Leave', icon: <CasualIcon sx={{ fontSize: 16 }} /> },
              { type: 'sick', label: 'Sick Leave', icon: <SickIcon sx={{ fontSize: 16 }} /> },
              { type: 'vacation', label: 'Vacation', icon: <VacationIcon sx={{ fontSize: 16 }} /> },
              { type: 'emergency', label: 'Emergency', icon: <EmergencyIcon sx={{ fontSize: 16 }} /> },
            ].map((item) => {
              const colors = getLeaveColor(item.type);
              return (
                <Chip
                  key={item.type}
                  icon={item.icon}
                  label={item.label}
                  size="medium"
                  sx={{
                    bgcolor: colors.main,
                    color: 'white',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: colors.main,
                      opacity: 0.9,
                    },
                  }}
                />
              );
            })}
          </Stack>
        </Paper>

        {/* Calendar Grid */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box sx={{ p: 4 }}>
                <Stack spacing={2}>
                  <Skeleton variant="rectangular" height={60} />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={100} />
                  ))}
                </Stack>
              </Box>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Box sx={{ minWidth: isMobile ? 600 : 'auto' }}>
                  {/* Week Day Headers */}
                  <Grid container>
                    {weekDays.map((day) => (
                      <Grid item xs key={day} sx={{ flexBasis: '14.28%' }}>
                        <Box
                          sx={{
                            textAlign: 'center',
                            py: 2,
                            fontWeight: 'bold',
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            borderBottom: `3px solid ${theme.palette.primary.main}`,
                          }}
                        >
                          <Typography variant="body2" fontWeight={700} color="primary">
                            {isMobile ? day.slice(0, 1) : day}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Calendar Days */}
                  {calendar.map((week, weekIndex) => (
                    <Grid container key={weekIndex}>
                      {week.map((day, dayIndex) => {
                        const isToday = day.date.isSame(dayjs(), 'day');
                        const hasLeaves = day.leaves.length > 0;
                        const isWeekend = day.date.day() === 0 || day.date.day() === 6;

                        return (
                          <Grid item xs key={dayIndex} sx={{ flexBasis: '14.28%' }}>
                            <Box
                              onClick={() => handleDateClick(day)}
                              sx={{
                                minHeight: isMobile ? 80 : 120,
                                p: 1,
                                border: 1,
                                borderColor: 'divider',
                                bgcolor: !day.isCurrentMonth
                                  ? alpha(theme.palette.grey[500], 0.05)
                                  : isWeekend
                                  ? alpha(theme.palette.info.main, 0.03)
                                  : 'white',
                                cursor: hasLeaves ? 'pointer' : 'default',
                                transition: 'all 0.2s',
                                position: 'relative',
                                '&:hover': hasLeaves
                                  ? {
                                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                                      transform: 'scale(1.02)',
                                      zIndex: 1,
                                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
                                    }
                                  : {},
                              }}
                            >
                              {/* Date Number */}
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  mb: 1,
                                }}
                              >
                                <Badge
                                  badgeContent={hasLeaves ? day.leaves.length : 0}
                                  color="primary"
                                  sx={{
                                    '& .MuiBadge-badge': {
                                      fontSize: 10,
                                      minWidth: 18,
                                      height: 18,
                                    },
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: isMobile ? 28 : 36,
                                      height: isMobile ? 28 : 36,
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      bgcolor: isToday
                                        ? theme.palette.primary.main
                                        : 'transparent',
                                      color: isToday ? 'white' : day.isCurrentMonth ? 'text.primary' : 'text.disabled',
                                      fontWeight: isToday ? 700 : day.isCurrentMonth ? 600 : 400,
                                    }}
                                  >
                                    <Typography variant={isMobile ? 'caption' : 'body2'}>
                                      {day.date.date()}
                                    </Typography>
                                  </Box>
                                </Badge>
                              </Box>

                              {/* Leave Indicators */}
                              {hasLeaves && (
                                <Stack spacing={0.5}>
                                  {day.leaves.slice(0, isMobile ? 2 : 3).map((leave, idx) => {
                                    const colors = getLeaveColor(leave.leaveType);
                                    return (
                                      <Box
                                        key={idx}
                                        sx={{
                                          p: 0.5,
                                          borderRadius: 1,
                                          bgcolor: colors.light,
                                          borderLeft: `3px solid ${colors.main}`,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 0.5,
                                        }}
                                      >
                                        {!isMobile && (
                                          <Box sx={{ color: colors.main, display: 'flex', fontSize: 12 }}>
                                            {getLeaveIcon(leave.leaveType)}
                                          </Box>
                                        )}
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            fontSize: isMobile ? 9 : 11,
                                            fontWeight: 600,
                                            color: colors.main,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          {getDoctorName(leave).split(' ')[0]}
                                        </Typography>
                                      </Box>
                                    );
                                  })}
                                  {day.leaves.length > (isMobile ? 2 : 3) && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontSize: isMobile ? 9 : 10,
                                        fontWeight: 600,
                                        color: 'primary.main',
                                        textAlign: 'center',
                                      }}
                                    >
                                      +{day.leaves.length - (isMobile ? 2 : 3)} more
                                    </Typography>
                                  )}
                                </Stack>
                              )}
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Leave Details Dialog */}
        <Dialog
          open={!!selectedDate}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
            },
          }}
        >
          <DialogTitle
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: 'white',
            }}
          >
            <Stack direction="row" alignItems="center" gap={2}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: alpha('#fff', 0.2),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <EventIcon />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Leaves on {selectedDate?.format('MMMM DD, YYYY')}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {selectedLeaves.length} leave(s) scheduled
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ p: 3, mt: 2 }}>
            <Stack spacing={2}>
              {selectedLeaves.map((leave, index) => {
                const colors = getLeaveColor(leave.leaveType);
                const doctorName = getDoctorName(leave);

                return (
                  <Card
                    key={index}
                    elevation={0}
                    sx={{
                      border: `2px solid ${colors.light}`,
                      borderRadius: 2,
                      overflow: 'hidden',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        height: 6,
                        bgcolor: colors.main,
                      }}
                    />
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack spacing={2}>
                        {/* Doctor Info */}
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Avatar
                            sx={{
                              width: 48,
                              height: 48,
                              bgcolor: colors.main,
                            }}
                          >
                            <PersonIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={700}>
                              {doctorName}
                            </Typography>
                            <Chip
                              icon={getLeaveIcon(leave.leaveType)}
                              label={leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1) + ' Leave'}
                              size="small"
                              sx={{
                                bgcolor: colors.light,
                                color: colors.main,
                                fontWeight: 600,
                                mt: 0.5,
                              }}
                            />
                          </Box>
                        </Stack>

                        <Divider />

                        {/* Duration */}
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            DURATION
                          </Typography>
                          <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                            {dayjs(leave.startDate).format('MMM DD')} - {dayjs(leave.endDate).format('MMM DD, YYYY')}
                          </Typography>
                          <Chip
                            label={`${dayjs(leave.endDate).diff(dayjs(leave.startDate), 'day') + 1} day${dayjs(leave.endDate).diff(dayjs(leave.startDate), 'day') !== 0 ? 's' : ''}`}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                          />
                        </Box>

                        {/* Reason */}
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            REASON
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.6 }}>
                            {leave.reason}
                          </Typography>
                        </Box>

                        <Divider />

                        {/* Action Button */}
                        <Button
                          variant="contained"
                          size="small"
                          href={`#/leaves/${leave.id}/show`}
                          onClick={handleCloseDialog}
                          sx={{
                            bgcolor: colors.main,
                            '&:hover': {
                              bgcolor: colors.main,
                              opacity: 0.9,
                            },
                          }}
                        >
                          View Full Details
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCloseDialog} variant="outlined" size="large">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Fade>
  );
};

export default LeaveCalendar;
