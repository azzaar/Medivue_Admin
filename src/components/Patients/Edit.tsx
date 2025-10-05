"use client";
import { useState, useEffect } from "react";
import {
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
  ArrayInput,
  SimpleFormIterator,
  ReferenceInput
} from "react-admin";

const PatientEdit = () => {
  const [linkedDoctorId, setLinkedDoctorId] = useState<string | null>(null);

  useEffect(() => {
    const doctorId = localStorage.getItem("linkedDoctorId");
    setLinkedDoctorId(doctorId);
  }, []);

  return (
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

        {/* NEW: Status */}
        <SelectInput
          source="status"
          label="Status"
          choices={[
            { id: "active", name: "Active" },
            { id: "closed", name: "Closed" }
          ]}
        />

        {/* Doctor selection */}
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

        {/* Contact Information */}
        <TextInput source="phoneNumber" label="Contact Number" required />
        <TextInput source="email" label="Email" />

        {/* Address Information */}
        <TextInput source="address.street" label="Street" />
        <TextInput source="address.city" label="City" />
        <TextInput source="address.state" label="State" />
        <TextInput source="address.postalCode" label="Postal Code" />

        {/* Emergency Contact Information */}
        <TextInput source="emergencyContactName" label="Emergency Contact Name" />
        <TextInput source="emergencyContactRelation" label="Relation" />
        <TextInput source="emergencyContactNumber" label="Emergency Contact Number" />

        {/* Medical History Section */}
        <TextInput source="condition" label="Condition" />

        {/* Medications Section */}
        <ArrayInput source="medications">
          <SimpleFormIterator>
            <TextInput source="name" label="Medication Name" />
            <TextInput source="dosage" label="Dosage" />
            <TextInput source="frequency" label="Frequency" />
            <TextInput source="prescribedBy" label="Prescribed By" />
          </SimpleFormIterator>
        </ArrayInput>
      </SimpleForm>
    </Edit>
  );
};

export default PatientEdit;
