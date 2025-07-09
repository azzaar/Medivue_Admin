// src/theme.ts
import { createTheme } from "@mui/material/styles";
import { red } from "@mui/material/colors";

const primaryColor = "#16669f";
const whiteColor = "#ffffff";
const darkGrey = "#333333";
const mediumGrey = "#e0e0e0";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: primaryColor,
    },
    secondary: {
      main: primaryColor,
    },
    error: {
      main: red[500],
    },
    background: {
      default: whiteColor,
      paper: whiteColor,
    },
    text: {
      primary: darkGrey,
      secondary: "#555",
    },
    divider: mediumGrey,
  },

  typography: {
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    h1: { fontSize: "2rem", fontWeight: 600 },
    h2: { fontSize: "1.8rem", fontWeight: 600 },
    h3: { fontSize: "1.6rem", fontWeight: 600 },
    h4: { fontSize: "1.4rem", fontWeight: 600 },
    h5: { fontSize: "1.2rem", fontWeight: 600 },
    h6: { fontSize: "1rem", fontWeight: 600 },
    button: { textTransform: "none" },
  },

  shape: {
    borderRadius: 6,
  },

  spacing: 8,

  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          height: "40px",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#e0e0e0", // Light grey by default
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#16669f", // Primary on hover
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#16669f", // Primary on focus
            borderWidth: 2,
          },
          backgroundColor: "#fff",
        },
        input: {
          padding: "10px 14px",
          height: "auto",
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: "#666",
          fontSize: "0.9rem",
          "&.Mui-focused": {
            color: "#16669f",
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
        select: {
          padding: "10px 14px",
        },
        icon: {
          color: "#16669f",
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          width: "100%",
          marginBottom: "16px",
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          backgroundColor: "#fff",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        size: "small",
      },
    },
  },
});

export default theme;
