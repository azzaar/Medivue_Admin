// utils/theme.ts — Clean Clinical Theme for Medivue Health
import { createTheme } from '@mui/material/styles';
import { defaultTheme } from 'react-admin';

const primary = '#16669f';
const primaryLight = '#4a8cb8';
const primaryDark = '#0d4d75';
const white = '#ffffff';
const border = '#e5e7eb';       // neutral divider
const headerBg = '#f8fafc';     // table/list headers
const textPrimary = '#1f2937';  // slate-800
const textSecondary = '#4b5563';// slate-600

const theme = createTheme({
  ...defaultTheme,

  palette: {
    mode: 'light',
    primary: { main: primary, light: primaryLight, dark: primaryDark, contrastText: white },
    secondary: { main: '#2c7fb8' },
    success: { main: '#16a34a' },
    error: { main: '#ef4444' },
    warning: { main: '#f59e0b' },
    info: { main: primary },
    // Keep theme surfaces white; page bg is provided by Layout
    background: { default: white, paper: white },
    text: { primary: textPrimary, secondary: textSecondary },
    divider: border,
  },

  typography: {
    fontFamily: 'Inter, Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    h1: { fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.01em' },
    h2: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.25rem', fontWeight: 700 },
    h4: { fontSize: '1.125rem', fontWeight: 700 },
    h5: { fontSize: '1rem', fontWeight: 700 },
    h6: { fontSize: '0.95rem', fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700, letterSpacing: 0 },
  },

  shape: { borderRadius: 10 },
  spacing: 8,
  components: {
    /* App Shell */
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: primary,
          backgroundImage: `linear-gradient(135deg, ${primary} 0%, ${primaryLight} 100%)`,
          boxShadow: '0 2px 10px rgba(22,102,159,0.15)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: white,
          borderRight: `1px solid ${border}`,
          boxShadow: 'none',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          '@media (min-width:600px)': { minHeight: 64 },
          '@media (max-width:599.95px)': { minHeight: 56 },
        },
      },
    },

    /* Surfaces */
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 10 },
        elevation1: { boxShadow: '0 1px 2px rgba(0,0,0,0.06)' },
        elevation2: { boxShadow: '0 2px 6px rgba(0,0,0,0.08)' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { border: `1px solid ${border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' },
      },
    },

    /* Controls */
    MuiButton: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { borderRadius: 8, padding: '8px 14px', boxShadow: 'none' },
        contained: { backgroundColor: primary, '&:hover': { backgroundColor: primaryDark } },
        outlined: {
          borderWidth: 1.5,
          borderColor: primary,
          color: primary,
          '&:hover': { borderWidth: 1.5, backgroundColor: 'rgba(22,102,159,0.06)' },
        },
      },
    },
    MuiIconButton: { defaultProps: { size: 'small' } },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 700 },
        colorPrimary: { backgroundColor: 'rgba(22,102,159,0.12)', color: primary },
      },
    },

    /* Inputs */
    MuiTextField: { defaultProps: { variant: 'outlined', size: 'small' } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: border },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: primary },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: primary, borderWidth: 2 },
          '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(22,102,159,0.10)' },
        },
        input: { padding: '10px 12px' },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { color: '#6b7280', fontSize: '0.9rem', '&.Mui-focused': { color: primary, fontWeight: 700 } },
      },
    },
    MuiSelect: {
      styleOverrides: { select: { padding: '10px 12px' }, icon: { color: primary } },
    },
    MuiFormControl: { styleOverrides: { root: { width: '100%' } } },

    /* Tables / Datagrid */
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: headerBg,
          fontWeight: 800,
          fontSize: '0.85rem',
          color: textPrimary,
          borderBottom: `2px solid ${border}`,
          padding: '10px 12px',
        },
        body: { padding: '10px 12px', fontSize: '0.9rem' },
      },
    },
    MuiTableRow: { styleOverrides: { root: { '&:hover': { backgroundColor: '#f9fbfd' } } } },

    /* React-Admin specifics (minimal, to avoid broken spacing) */
    RaList: {
      styleOverrides: {
        root: { '& .RaList-content': { backgroundColor: 'transparent', boxShadow: 'none' } },
      },
    },
    RaDatagrid: {
      styleOverrides: {
        root: {
          backgroundColor: white,
          borderRadius: 10,
          overflow: 'hidden',
          border: `1px solid ${border}`,
          '& .RaDatagrid-headerCell': { backgroundColor: headerBg, fontWeight: 800 },
          '& .RaDatagrid-row': { '&:hover': { backgroundColor: '#f9fbfd' } },
          '& .MuiTableCell-root': { paddingTop: 10, paddingBottom: 10 }, // compact density
        },
      },
    },
    // RaToolbar: { styleOverrides: { root: { padding: 0, backgroundColor: 'transparent' } } },
    // RaFilterForm: {
    //   styleOverrides: {
    //     root: {
    //       backgroundColor: white,
    //       border: `1px solid ${border}`,
    //       borderRadius: 10,
    //       padding: 12,
    //       marginBottom: 12,
    //       '& .MuiFormControl-root': { marginBottom: 8 },
    //     },
    //   },
    // },
    RaMenuItemLink: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '4px 8px',
          padding: '10px 12px',
          '& .MuiListItemIcon-root': { minWidth: 0, marginRight: 10 },
          '& .MuiSvgIcon-root': { fontSize: 20 },
          '& .MuiListItemText-primary': { fontSize: 14, fontWeight: 700 },
          '&.RaMenuItemLink-active': {
            backgroundColor: primary,
            color: white,
            '& .MuiListItemIcon-root, & .MuiSvgIcon-root': { color: white },
          },
          '&:hover': { backgroundColor: 'rgba(22,102,159,0.08)' },
        },
      },
    },
  },
});

export default theme;
