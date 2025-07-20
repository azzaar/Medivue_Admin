import React, { useState, useEffect } from "react";
import {
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
          label="Calendar" // Label for the column
          render={(
            record: {id:string} // 'record' contains the data for the current row
          ) => (
            <Button
              sx={{ fontSize: "0.8rem", padding: "4px 8px" }} // Adjust button size
              variant="contained"
              color="primary"
              onClick={() => {
                console.log("Opening calendar for patient ID:", record.id);
                handleCalendarOpen(record.id); // Pass record.id directly
              }}
            >
              Visited Days
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
