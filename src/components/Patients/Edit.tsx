"use client";
import { Edit, SimpleForm, TextInput, NumberInput, SelectInput } from "react-admin";

const PatientEdit = () => (
  <Edit redirect="list">
    <SimpleForm>
      <TextInput source="name" />
      <NumberInput source="age" />
      <SelectInput
        source="gender"
        choices={[
          { id: "Male", name: "Male" },
          { id: "Female", name: "Female" },
          { id: "Other", name: "Other" }
        ]}
      />
      <TextInput source="contactNumber" />
      <TextInput source="email" />
    </SimpleForm>
  </Edit>
);

export default PatientEdit;
