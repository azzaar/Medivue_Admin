import * as React from "react";
import { Show, SimpleShowLayout, TextField, NumberField } from "react-admin";
import { Card, CardContent, CardHeader, Chip, Stack } from "@mui/material";
import { categoryColor } from "./common";
import { Expense } from "@/types/expense";

const currencyOpts: Intl.NumberFormatOptions = { style: "currency", currency: "INR" };

const SummaryAside: React.FC<{ record?: Expense }> = ({ record }) => {
  if (!record) return null;
  return (
    <Card sx={{ minWidth: 300, m: 2 }}>
      <CardHeader title="Summary" />
      <CardContent>
        <Stack spacing={1}>
          <Chip label={`Category: ${record.category}`} color={categoryColor(record.category)} variant="outlined" />
          <Chip label={`Doctor: ${record.doctorName ?? "—"}`} />
          <Chip label={`Payment: ${record.paymentMode ?? "—"}`} />
        </Stack>
      </CardContent>
    </Card>
  );
};

export const ExpenseShow: React.FC = (props) => (
  <Show {...props} aside={<SummaryAside />}>
    <SimpleShowLayout>
      <TextField source="date" />
      <TextField source="category" />
      <TextField source="title" />
      <NumberField source="amount" label="Amount" options={currencyOpts} />
      <TextField source="doctorName" label="Doctor" />
      <TextField source="paymentMode" label="Payment" />
      <TextField source="notes" />
    </SimpleShowLayout>
  </Show>
);
