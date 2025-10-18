import * as React from "react";
import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  NumberInput,
  ReferenceInput,
  AutocompleteInput,
  DateInput,
} from "react-admin";
import { categoryChoices, paymentChoices, required, isoDate, min0 } from "./common";

export const ExpenseCreate: React.FC = (props) => (
  <Create {...props}>
    <SimpleForm>
      <DateInput source="date" label="Date (yyyy-mm-dd)" validate={[required(), isoDate]} />
      <SelectInput source="category" choices={categoryChoices} validate={required()} />
      <TextInput source="title" validate={required()} />
      <NumberInput source="amount" validate={[required(), min0]} />
      <SelectInput source="paymentMode" choices={paymentChoices} />
      <ReferenceInput source="doctor" reference="doctors" label="Doctor" >
        {/* put validate here, not on ReferenceInput */}
        <AutocompleteInput optionText="name" validate={required()} style={{width:'100%'}} />
      </ReferenceInput>
      <TextInput source="notes" multiline />
    </SimpleForm>
  </Create>
);
