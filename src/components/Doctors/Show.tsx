import { Show, SimpleShowLayout, TextField, NumberField } from "react-admin";

export const DoctorShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="name" />
      <TextField source="specialization" />
      <TextField source="contactNumber" />
      <TextField source="email" />
      <TextField source="address.street" />
      <TextField source="address.city" />
      <TextField source="address.state" />
      <TextField source="address.postalCode" />
      <NumberField source="experience" />
      <TextField source="qualifications" />
            <TextField source="username"  label='Username'/>

            <TextField source="plainPassword" label='Password' />

    </SimpleShowLayout>
  </Show>
);