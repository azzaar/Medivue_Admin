import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  Typography,
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
  ChipField,
  ReferenceArrayField,
  SingleFieldList,
  useRecordContext,
  Pagination,
} from "react-admin";
import NotesButton from "./PatientNoteButton";
import { CalendarToday } from "@mui/icons-material";
import CalendarView from "./CalendarView";

/** ✅ Status Chip — toggles backend status on click */
type PatientStatus = "active" | "closed";

const StatusChip: React.FC<{ record? }> = ({ record: propRecord }) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  const ctxRecord = useRecordContext();
  const record = propRecord ?? ctxRecord;

  const [loading, setLoading] = React.useState(false);

  const currentStatus = String(record?.status ?? "").toLowerCase() as PatientStatus | "";
  const nextStatus: PatientStatus = currentStatus === "active" ? "closed" : "active";

  const color: "success" | "default" =
    currentStatus === "active" ? "success" :
    currentStatus === "closed" ? "default" : "default";

  const label =
    currentStatus === "active" ? "Active" :
    currentStatus === "closed" ? "Closed" : "—";

  const handleToggleStatus = async () => {
    if (!record?.id && !record?._id) {
      notify("Missing patient id", { type: "warning" });
      return;
    }
    if (currentStatus !== "active" && currentStatus !== "closed") {
      notify("Cannot change unknown status", { type: "warning" });
      return;
    }

    setLoading(true);
    try {
      const id = record.id ?? record._id;

      // OPTION A: direct custom route (POST to /patients/:id/changePatientStatus)
      await dataProvider.create(`patients/${id}/changePatientStatus`, {
        data: { status: nextStatus },
      });

      // OPTION B: if your dataProvider prefers standard resources:
      // await dataProvider.update("patients", {
      //   id,
      //   data: { status: nextStatus },
      //   previousData: record,
      //   meta: { action: "changePatientStatus" }, // your backend can read meta.action
      // });

      notify(`Status changed to ${nextStatus}`, { type: "info" });
      refresh();
    } catch (err: unknown) {
      if (err instanceof HttpError) {
        notify(err.body?.message || err.message, { type: "warning" });
      } else if (err instanceof Error) {
        notify(err.message, { type: "warning" });
      } else {
        notify("Failed to change status.", { type: "warning" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Chip
      label={label}
      color={color}
      size="small"
      onClick={loading ? undefined : handleToggleStatus}
      disabled={loading}
      sx={{
        cursor: loading ? "not-allowed" : "pointer",
        fontWeight: "bold",
        borderRadius: "6px",
        opacity: loading ? 0.7 : 1,
      }}
    />
  );
};


const PatientList = () => {
  const { permissions } = usePermissions();
  const [openCalendarDialog, setOpenCalendarDialog] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Get linked doctor ID for non-admin users
  const linkedDoctorId = permissions !== "admin" && permissions !== "superAdmin"
    ? localStorage.getItem("linkedDoctorId")
    : null;

  // --- Filters ---------------------------------------------------------------
  const patientFilters = [
    <SearchInput
      key="searchInput"
      source="q"
      alwaysOn
      placeholder="Search by Name, City, Patient ID, Chief Complaint"
    />,
    ...(permissions === "admin" || permissions === "superAdmin"
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

  // Build filter defaults for doctor login
  const filterDefaults = { status: "active",  doctorId :''};
  if (linkedDoctorId && linkedDoctorId !== "null") {
    filterDefaults.doctorId = linkedDoctorId;
  }

  // --- Calendar dialog handlers ---------------------------------------------
  const handleCalendarClose = () => {
    setOpenCalendarDialog(false);
    setSelectedPatientId(null);
  };

  const handleCalendarOpen = (patientId: string) => {
    setSelectedPatientId(patientId);
    setOpenCalendarDialog(true);
  };
const DoctorCell: React.FC = () => {
  const record = useRecordContext<{ doctorId?: string; doctorIds?: string[] }>();
  if (!record) return null;

  // Prefer multi-doctor view when available
  if (Array.isArray(record.doctorIds) && record.doctorIds.length > 0) {
    return (
      <ReferenceArrayField
        source="doctorIds"
        reference="doctors"
        // backend should support ?ids=... and return all
        perPage={1000}
      >
        <SingleFieldList linkType={false}>
          <ChipField source="name" />
        </SingleFieldList>
      </ReferenceArrayField>
    );
  }

  // Fallback to legacy single doctorId
  if (record.doctorId) {
    return (
      <ReferenceField
        source="doctorId"
        reference="doctors"
        link={false}
      >
        <Typography component="span">
          <ChipField source="name" />
        </Typography>
      </ReferenceField>
    );
  }

  // Nothing linked
  return <Typography color="text.secondary">—</Typography>;
};

  return (
    <List
      filters={patientFilters}
      filterDefaultValues={filterDefaults}
      sort={{ field: "patientId", order: "ASC" }}
       perPage={50}
         pagination={<Pagination rowsPerPageOptions={[25, 50, 100]} />} // optional

    >
      <Datagrid rowClick={false} bulkActionButtons={false}>
        <TextField source="patientId" label="Patient ID" />
        <TextField source="name" />
        <NumberField source="age" />
        <TextField source="gender" />
        <TextField source="phoneNumber" />
        <TextField source="condition" />

        {/* ✅ Clickable Status Chip */}
         {permissions === "admin" && (
        <FunctionField
          label="Status"
          render={(record) => <StatusChip record={record} />}
        />
         )}
        {permissions === "admin" && (
         <DoctorCell/>
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
