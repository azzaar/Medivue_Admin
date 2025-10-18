import * as React from "react";
import {
  List,
  Datagrid,
  TextField,
  NumberField,
  TextInput,
  SelectInput,
  ReferenceInput,
  AutocompleteInput,
} from "react-admin";
import CategoryChip from "./CategoryChip";
import { categoryChoices } from "./common";

const Filters: React.ReactElement[] = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <TextInput key="date_gte" source="date_gte" label="From (yyyy-mm-dd)" />,
  <TextInput key="date_lte" source="date_lte" label="To (yyyy-mm-dd)" />,
  <SelectInput key="category" source="category" label="Category" choices={categoryChoices} />,
  <ReferenceInput key="doctor" source="doctor" reference="doctors" label="Doctor">
    <AutocompleteInput optionText="name" />
  </ReferenceInput>,
];

const currencyOpts: Intl.NumberFormatOptions = { style: "currency", currency: "INR" };

export const ExpenseList: React.FC = (props) => (
   <List {...props} filters={Filters} sort={{ field: "date", order: "DESC" }} perPage={25}>

  
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="date" label="Date" />
      <CategoryChip />
      <TextField source="title" />
      <NumberField source="amount" label="Amount" options={currencyOpts} />
      <TextField source="doctorName" label="Doctor" />
      <TextField source="paymentMode" label="Payment" />
      <TextField source="notes" />
    </Datagrid>
  </List>
);
