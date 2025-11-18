"use client";
import {
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  ArrayInput,
  SimpleFormIterator,
  BooleanInput
} from "react-admin";

const DoctorCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <TextInput source="name" label="Name" required />
      <TextInput source="specialization" label="Specialization" />
      <TextInput source="contactNumber" label="Contact Number" />
      <TextInput source="email" label="Email" />

      <TextInput source="address.street" label="Street" />
      <TextInput source="address.city" label="City " />
      <TextInput source="address.state" label="State" />
      <TextInput source="address.postalCode" label="Postal Code" />

      <NumberInput source="experience" label="Experience (Years)" />

      <BooleanInput
        source="isCommissionBased"
        label="Commission-based Doctor"
        defaultValue={false}
      />

      <ArrayInput source="qualifications" label="Qualifications">
        <SimpleFormIterator>
          <TextInput source="" label="Qualification" />
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Create>
);

export default DoctorCreate;
