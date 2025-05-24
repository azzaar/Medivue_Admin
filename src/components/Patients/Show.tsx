import { NumberField, Show, SimpleShowLayout, TextField } from "react-admin";

export const PatientShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="name" />
      <NumberField source="age" />
      <TextField source="gender" />
      <TextField source="contactNumber" />
      <TextField source="email" />
      <TextField source="address.street" />
      <TextField source="address.city" />
      <TextField source="address.state" />
      <TextField source="address.postalCode" />
      <TextField source="emergencyContact.name" />
      <TextField source="emergencyContact.relation" />
      <TextField source="emergencyContact.contactNumber" />
    </SimpleShowLayout>
  </Show>
);
