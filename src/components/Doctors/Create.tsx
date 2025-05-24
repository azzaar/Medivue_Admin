"use client";
import {
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  ArrayInput,
  SimpleFormIterator
} from "react-admin";

const DoctorCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <TextInput source="name" label="Name" required />
      <TextInput source="specialization" label="Specialization" required />
      <TextInput source="contactNumber" label="Contact Number" required />
      <TextInput source="email" label="Email" required />

      <TextInput source="address.street" label="Street" required />
      <TextInput source="address.city" label="City" required />
      <TextInput source="address.state" label="State" required />
      <TextInput source="address.postalCode" label="Postal Code" required />

      <NumberInput source="experience" label="Experience (Years)" required />

      <ArrayInput source="qualifications" label="Qualifications">
        <SimpleFormIterator>
          <TextInput source="" label="Qualification" required />
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Create>
);

export default DoctorCreate;
