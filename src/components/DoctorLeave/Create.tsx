import { Create, SimpleForm, ReferenceInput, SelectInput, DateInput, TextField } from "react-admin";

export const DoctorLeaveCreate: React.FC = () => (
  <Create title="New Doctor Leave">
    <SimpleForm>
      <ReferenceInput
        source="doctorId"
        reference="doctors"
        label="Doctor"
        sort={{ field: "name", order: "ASC" }}
        perPage={1000}
        filter={{ all: true }}
      >
        <SelectInput optionText="name" optionValue="id" fullWidth />
      </ReferenceInput>
      <DateInput source="startDate" label="Start Date" required />
      <DateInput source="endDate"   label="End Date"   required />
      <TextField  // MUI TextField inside RA SimpleForm is fine via react-hook-form registration
                label="Note"
                fullWidth source={""}      />
    </SimpleForm>
  </Create>
);