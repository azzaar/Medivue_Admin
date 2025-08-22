"use client";
import { List, Datagrid, TextField, DateField } from "react-admin";

const AppoinmentList = (props) => (
  <List {...props}>
    <Datagrid bulkActionButtons={false}>
      <TextField source="fullName" />
            <DateField source="appointmentDate" />

      <TextField source="message" />
      <TextField source="email" />
      <TextField source="phone" />
      <TextField source="service" />
    </Datagrid>
  </List>
);

export default AppoinmentList;
