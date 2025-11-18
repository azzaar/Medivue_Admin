"use client";
import { Edit, SimpleForm, TextInput, NumberInput, BooleanInput } from "react-admin";

const DoctorEdit = () => (
  <Edit redirect="list">
    <SimpleForm>
      <TextInput source="name" />
      <TextInput source="specialization" />
      <TextInput source="email" />
      <TextInput source="contactNumber" />

      <NumberInput source="experience" />

      <BooleanInput
        source="isCommissionBased"
        label="Commission-based Doctor"
      />
    </SimpleForm>
  </Edit>
);

export default DoctorEdit;
