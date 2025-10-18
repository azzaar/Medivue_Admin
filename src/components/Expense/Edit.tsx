import * as React from "react";
import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  NumberInput,
  ReferenceInput,
  AutocompleteInput,
  DateInput,
} from "react-admin";
import { categoryChoices, paymentChoices, required, isoDate, min0 } from "./common";

export const ExpenseEdit: React.FC = (props) => (
  <Edit {...props}>
    <SimpleForm>
      <DateInput source="date" label="Date (yyyy-mm-dd)" validate={[required(), isoDate]} />
      <SelectInput source="category" choices={categoryChoices} validate={required()} />
      <TextInput source="title" validate={required()} />
      <NumberInput source="amount" validate={[required(), min0]} />
      <SelectInput source="paymentMode" choices={paymentChoices} />
      <ReferenceInput source="doctor" reference="doctors" label="Doctor">
        {/* validate belongs to the child input */}
        <AutocompleteInput optionText="name" validate={required()} style={{width:'100%'}}/>
      </ReferenceInput>
      <TextInput source="notes" multiline />
    </SimpleForm>
  </Edit>
);
