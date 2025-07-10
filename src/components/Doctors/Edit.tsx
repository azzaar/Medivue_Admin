"use client";
import { Edit, SimpleForm, TextInput, NumberInput } from "react-admin";

const DoctorEdit = () => (
  <Edit redirect="list">
    <SimpleForm>
      <TextInput source="name" />
      <TextInput source="specialization" />
      <TextInput source="email" />
      <TextInput source="contactNumber" />
              <TextInput source="contactNumber" />

      <NumberInput source="experience" />
    </SimpleForm>
  </Edit>
);

export default DoctorEdit;
