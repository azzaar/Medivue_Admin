"use client";
import {
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
  ArrayInput,
  SimpleFormIterator,
  DateInput,
  ReferenceInput
} from "react-admin";

const PatientEdit = () => (
  <Edit redirect="list">
    <SimpleForm>
      {/* Patient Personal Information */}
      <TextInput source="name" label="Name" required />
      <NumberInput source="age" label="Age" required />
      <SelectInput
        source="gender"
        label="Gender"
        choices={[
          { id: "Male", name: "Male" },
          { id: "Female", name: "Female" },
          { id: "Other", name: "Other" }
        ]}
        required
      />
      
      {/* Doctor selection */}
      <ReferenceInput source="doctorId" reference="doctors" label="Assigned Doctor" required>
        <SelectInput optionText="name" label="Doctor Name" required />
      </ReferenceInput>

      {/* Contact Information */}
      <TextInput source="phoneNumber" label="Contact Number" required />
      <TextInput source="email" label="Email" />

      {/* Address Information */}
      <TextInput source="address.street" label="Street" required />
      <TextInput source="address.city" label="City" required />
      <TextInput source="address.state" label="State" required />
      <TextInput source="address.postalCode" label="Postal Code" required />

      {/* Emergency Contact Information */}
      <TextInput source="emergencyContactName" label="Emergency Contact Name" required />
      <TextInput source="emergencyContactRelation" label="Relation" required />
      <TextInput source="emergencyContactNumber" label="Emergency Contact Number" required />

      {/* Medical History Section */}
      <ArrayInput source="medicalHistory">
        <SimpleFormIterator>
          <TextInput source="condition" label="Condition" />
          <DateInput source="diagnosisDate" label="Diagnosis Date" />
          <TextInput source="notes" label="Notes" />
        </SimpleFormIterator>
      </ArrayInput>

      {/* Medications Section */}
      <ArrayInput source="medications">
        <SimpleFormIterator>
          <TextInput source="name" label="Medication Name" required />
          <TextInput source="dosage" label="Dosage" required />
          <TextInput source="frequency" label="Frequency" required />
          <TextInput source="prescribedBy" label="Prescribed By" />
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Edit>
);

export default PatientEdit;
