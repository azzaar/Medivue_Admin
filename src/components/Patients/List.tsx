import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
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
  useDataProvider,
  useNotify,
  useRefresh,
  HttpError,
} from "react-admin";
import CalendarView from "./CalendarView";
import NotesButton from "./PatientNoteButton";
import { CalendarToday } from "@mui/icons-material";

/** ✅ Status Chip — toggles backend status on click */
const StatusChip: React.FC<{ record }> = ({ record }) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();

  const currentStatus = (record?.status || "").toLowerCase();
  const nextStatus = currentStatus === "active" ? "closed" : "active";
  const color =
    currentStatus === "active"
      ? "success"
      : currentStatus === "closed"
      ? "default"
      : "default";
  const label =
    currentStatus === "active"
      ? "Active"
      : currentStatus === "closed"
      ? "Closed"
      : "—";

  const handleToggleStatus = async () => {
    try {
      // 🔥 Call your new backend route using dataProvider.create()
      await dataProvider.create(`patients/${record.id}/changePatientStatus`, {
        data: { status: nextStatus },
      });

      notify(`Status changed to ${nextStatus}`, { type: "info" });
      refresh();
    } catch (err: unknown) {
      if (err instanceof HttpError) {
        notify(err.message, { type: "warning" });
      } else if (err instanceof Error) {
        notify(err.message, { type: "warning" });
      } else {
        notify("Failed to change status.", { type: "warning" });
      }
    }
  };

  return (
    <Chip
      label={label}
      color={color}
      size="small"
      onClick={handleToggleStatus}
      sx={{
        cursor: "pointer",
        fontWeight: "bold",
        borderRadius: "6px",
      }}
    />
  );
};

const PatientList = () => {
  const { permissions } = usePermissions();
  const [openCalendarDialog, setOpenCalendarDialog] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // --- Filters ---------------------------------------------------------------
  const patientFilters = [
    <SearchInput
      key="searchInput"
      source="q"
      alwaysOn
      placeholder="Search by Name, City, Patient ID, Chief Complaint"
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
    <SelectInput
      key="statusFilter"
      source="status"
      label="Status"
      alwaysOn
      choices={[
        { id: "active", name: "Active" },
        { id: "closed", name: "Closed" },
        { id: "all", name: "All" },
      ]}
    />,
  ];

  // --- Calendar dialog handlers ---------------------------------------------
  const handleCalendarClose = () => {
    setOpenCalendarDialog(false);
    setSelectedPatientId(null);
  };

  const handleCalendarOpen = (patientId: string) => {
    setSelectedPatientId(patientId);
    setOpenCalendarDialog(true);
  };

  return (
    <List
      filters={patientFilters}
      filterDefaultValues={{ status: "active" }}
      sort={{ field: "patientId", order: "ASC" }}
    >
      <Datagrid rowClick={false} bulkActionButtons={false}>
        <TextField source="patientId" label="Patient ID" />
        <TextField source="name" />
        <NumberField source="age" />
        <TextField source="gender" />
        <TextField source="phoneNumber" />
        <TextField source="condition" />

        {/* ✅ Clickable Status Chip */}
        <FunctionField
          label="Status"
          render={(record) => <StatusChip record={record} />}
        />

        {permissions === "admin" && (
          <ReferenceField
            label="Doctor"
            source="doctorId"
            reference="doctors"
            link={false}
          >
            <TextField source="name" />
          </ReferenceField>
        )}

        <NotesButton />

        {/* Calendar Button */}
        <FunctionField
          label="Calendar"
          render={(record: { id: string }) => (
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleCalendarOpen(record.id)}
              sx={{
                fontSize: { xs: "20px", sm: "0.8rem" },
                padding: { xs: "2px 6px", sm: "4px 8px" },
                minWidth: { xs: 64, sm: 96 },
              }}
            >
              <Box
                component="span"
                sx={{
                  display: "inline",
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
      <Dialog open={openCalendarDialog} onClose={handleCalendarClose} maxWidth="md" fullWidth>
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
