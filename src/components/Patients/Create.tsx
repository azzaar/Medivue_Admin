"use client";
import { useEffect, useState } from "react";
import {
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
  ArrayInput,
  SimpleFormIterator,
  ReferenceInput,
} from "react-admin";

const PatientCreate = () => {
  const [linkedDoctorId, setLinkedDoctorId] = useState<string | null>(null);

  useEffect(() => {
    const doctorId = localStorage.getItem("linkedDoctorId");
    setLinkedDoctorId(doctorId);
  }, []);

  return (
    <Create redirect="list">
      <SimpleForm>
        <TextInput source="name" required />
        <NumberInput source="age" required />
        <SelectInput
          source="gender"
          choices={[
            { id: "Male", name: "Male" },
            { id: "Female", name: "Female" },
            { id: "Other", name: "Other" },
          ]}
          required
        />

        {/* NEW: Status (default to active) */}
        <SelectInput
          source="status"
          label="Status"
          choices={[
            { id: "active", name: "Active" },
            { id: "closed", name: "Closed" },
          ]}
          defaultValue="active"
        />

        {/* Automatically fill in doctorId based on the logged-in user's linkedDoctorId */}
        {linkedDoctorId !== "null" && linkedDoctorId !== null ? (
          <TextInput
            source="doctorId"
            defaultValue={linkedDoctorId}
            style={{ display: "none" }}
          />
        ) : (
          <ReferenceInput
            source="doctorId"
            reference="doctors"
            label="Assigned Doctor"
          >
            <SelectInput optionText="name" required />
          </ReferenceInput>
        )}

        <TextInput source="phoneNumber" required />
        <TextInput source="email" />

        <TextInput source="address.street" label="Street" />
        <TextInput source="address.city" label="City" />
        <TextInput source="address.state" label="State" />
        <TextInput source="address.postalCode" label="Postal Code" />

        <TextInput source="emergencyContactName" label="Emergency Contact Name" />
        <TextInput source="emergencyContactRelation" label="Relation" />
        <TextInput source="emergencyContactNumber" label="Emergency Contact Number" />

        <TextInput source="condition" label="Condition" />

        <ArrayInput source="medications">
          <SimpleFormIterator>
            <TextInput source="name" label="Medication Name" required />
            <TextInput source="dosage" label="Dosage" required />
            <TextInput source="frequency" label="Frequency" required />
            <TextInput source="prescribedBy" label="Prescribed By" />
          </SimpleFormIterator>
        </ArrayInput>
      </SimpleForm>
    </Create>
  );
};

export default PatientCreate;
