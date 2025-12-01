/**
 * API Configuration
 * Centralized configuration for API endpoints and settings
 */

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:9000',
  TIMEOUT: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
  ENV: process.env.NEXT_PUBLIC_ENV || 'development',
} as const;

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },

  // Resources
  DOCTORS: '/doctors',
  PATIENTS: '/patients',
  LEAVES: '/leaves',
  EXPENSES: '/expenses',
  APPOINTMENTS: '/appointments',
  JOBS: '/jobs',

  // Weekly Assignments
  WEEKLY_ASSIGNMENTS: {
    BASE: '/visits/weekly',
    ALL: '/visits/weekly/all',
    DOCTOR_STATS: '/visits/weekly/doctor-stats',
    BY_ID: (id: string) => `/visits/weekly/${id}`,
  },

  // Expense Summaries
  EXPENSE_SUMMARY: '/expenses/summary',

  // Patient specific
  PATIENT_NOTES: (patientId: string) => `/patients/${patientId}/notes`,
  PATIENT_PAYMENTS: (patientId: string) => `/patients/${patientId}/visit-payments`,
  PATIENT_ADD_PAYMENT: (patientId: string) => `/patients/${patientId}/add-payment`,
  PATIENT_ADD_VISITED_DAY: (patientId: string) => `/patients/${patientId}/add-visited-day`,
  PATIENT_VISITED_DAYS: (patientId: string) => `/patients/${patientId}/visited-days`,
} as const;

export default API_CONFIG;
