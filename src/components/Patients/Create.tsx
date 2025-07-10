import { useEffect, useState } from "react";
import { Create, SimpleForm, TextInput, NumberInput, SelectInput, ArrayInput, SimpleFormIterator, DateInput, ReferenceInput } from "react-admin";

const PatientCreate = () => {
  const [linkedDoctorId, setLinkedDoctorId] = useState<string | null>(null);

  useEffect(() => {
    const doctorId = localStorage.getItem("linkedDoctorId");
    setLinkedDoctorId(doctorId); // Set the doctor ID from localStorage
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
            { id: "Other", name: "Other" }
          ]}
          required
        />

        {/* Automatically fill in doctorId based on the logged-in user's linkedDoctorId */}
        {linkedDoctorId && (
          <ReferenceInput
            source="doctorId"
            reference="doctors"
            label="Assigned Doctor"
            defaultValue={linkedDoctorId}  // Pre-fill with the doctor's ID
            disabled  // Disable to prevent modification
          >
            <SelectInput optionText="name" />
          </ReferenceInput>
        )}

        <TextInput source="phoneNumber" required />
        <TextInput source="email" />

        <TextInput source="address.street" label="Street" required />
        <TextInput source="address.city" label="City" required />
        <TextInput source="address.state" label="State" required />
        <TextInput source="address.postalCode" label="Postal Code" required />

        <TextInput source="emergencyContactName" label="Emergency Contact Name" required />
        <TextInput source="emergencyContactRelation" label="Relation" required />
        <TextInput source="emergencyContactNumber" label="Emergency Contact Number" required />

        <ArrayInput source="medicalHistory">
          <SimpleFormIterator>
            <TextInput source="condition" label="Condition" />
            <DateInput source="diagnosisDate" label="Diagnosis Date" />
            <TextInput source="notes" label="Notes" />
          </SimpleFormIterator>
        </ArrayInput>

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
