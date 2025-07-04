"use client";
import { List, Datagrid, TextField, EditButton, SearchInput, ShowButton, DeleteButton } from "react-admin";

const doctorFilters = [
  <SearchInput key="searchInput" source="q" alwaysOn placeholder="Search by name or specialization" />
];

const DoctorList = () => (
  <List filters={doctorFilters}>
    <Datagrid>
      <TextField source="id" />
      <TextField source="name" />
      <TextField source="specialization" />
      <TextField source="email" />
            <TextField source="contactNumber" />
                  <ShowButton />

      <EditButton />
      <DeleteButton/>
    </Datagrid>
  </List>
);

export default DoctorList;
