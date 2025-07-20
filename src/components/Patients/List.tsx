import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import {
  List,
  Datagrid,
  TextField,
  NumberField,
  EditButton,
  SearchInput,
  ShowButton,
  ReferenceInput,
  SelectInput,
  ReferenceField,
  usePermissions,
  FunctionField,
} from "react-admin";
import CalendarView from "./CalendarView"; // The calendar component you created earlier
import NotesButton from "./PatientNoteButton";
import { CalendarToday } from "@mui/icons-material";

const PatientList = () => {
  const { permissions } = usePermissions();
  const [openCalendarDialog, setOpenCalendarDialog] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null
  );

  const patientFilters = [
    <SearchInput
      key="searchInput"
      source="q"
      alwaysOn
      placeholder="Search by name or city"
    />,
    ...(permissions === "admin"
      ? [
          <ReferenceInput
            key="doctorFilter"
            source="doctorId"
            reference="doctors"
            label="Doctor"
            alwaysOn
          >
            <SelectInput optionText="name" />
          </ReferenceInput>,
        ]
      : []),
  ];

  const handleCalendarClose = () => {
    setOpenCalendarDialog(false);
    setSelectedPatientId(null); // Clear selected patient ID
  };

  const handleCalendarOpen = (patientId: string) => {
    setSelectedPatientId(patientId);
    setOpenCalendarDialog(true); // Open dialog
  };

  useEffect(() => {
    console.log("openCalendarDialog state changed:", openCalendarDialog);
  }, [openCalendarDialog]);

  return (
    <List filters={patientFilters}>
      <Datagrid rowClick={false}>
        <TextField source="name" />
        <NumberField source="age" />
        <TextField source="gender" />
        <TextField source="phoneNumber" />
        <TextField source="condition" />

        {permissions === "admin" && (
          <ReferenceField label="Doctor" source="doctorId" reference="doctors">
            <TextField source="name" />
          </ReferenceField>
        )}
        <NotesButton />

        {/* Button to open Calendar Dialog */}

        <FunctionField
          label="Calendar"
          render={(record: { id: string }) => (
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                console.log("Opening calendar for patient ID:", record.id);
                handleCalendarOpen(record.id);
              }}
              sx={{
                // fontSize & padding become smaller on 'xs' screens
                fontSize: { xs: "20px", sm: "0.8rem" },
                padding: { xs: "2px 6px", sm: "4px 8px" },
                // you can also adjust minWidth if needed
                minWidth: { xs: 64, sm: 96 },
              }}
            >
              {/* you could shorten the label on mobile too */}
              <Box
                component="span"
                sx={{
                  display: "inline",
                  // hide the text on xs and show an icon instead, if you like:
                  "@media (max-width:600px)": {
                    fontSize: 0,
                    width: 0,
                    overflow: "hidden",
                    padding: 0,
                  },
                }}
              >
                Visited Days
              </Box>
              {/* Optional: show a calendar icon on xs only */}
              <CalendarToday
                fontSize="small"
                sx={{
                  display: { xs: "inline-flex", sm: "none" },
                  verticalAlign: "middle",
                  ml: { xs: 0.5, sm: 0 },
                }}
              />
            </Button>
          )}
        />

        <ShowButton />
        <EditButton />
      </Datagrid>

      {/* Calendar Dialog */}
      <Dialog
        open={openCalendarDialog}
        onClose={handleCalendarClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Patient Visit Calendar</DialogTitle>
        <DialogContent>
          {selectedPatientId && <CalendarView patientId={selectedPatientId} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCalendarClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </List>
  );
};

export default PatientList;
