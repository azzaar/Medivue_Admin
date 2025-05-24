"use client";

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
} from "react-admin";
import NotesButton from "./PatientNoteButton";

const PatientList = () => {
  const { permissions } = usePermissions();

  const patientFilters = [
    <SearchInput key="searchInput" source="q" alwaysOn placeholder="Search by name or city" />,
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

  return (
    <List filters={patientFilters}>
      <Datagrid>
        <TextField source="name" />
        <NumberField source="age" />
        <TextField source="gender" />
        <TextField source="contactNumber" />
        {permissions === "admin" && (
          <ReferenceField label="Doctor" source="doctorId" reference="doctors">
            <TextField source="name" />
          </ReferenceField>
        )}
        <NotesButton/>
        <ShowButton />
        <EditButton />
      </Datagrid>
    </List>
  );
};

export default PatientList;
