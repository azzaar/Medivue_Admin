import * as React from "react";
import { FunctionField, useRecordContext } from "react-admin";
import { Chip } from "@mui/material";
import { categoryColor } from "./common";
import { Expense } from "@/types/expense";

const Inner: React.FC = () => {
  const rec = useRecordContext<Expense>();
  if (!rec?.category) return null;
  const label = rec.category.charAt(0).toUpperCase() + rec.category.slice(1);
  return <Chip size="small" label={label} color={categoryColor(rec.category)} variant="outlined" />;
};

const CategoryChip: React.FC = () => <FunctionField<Expense> label="Category" render={() => <Inner />} />;

export default CategoryChip;
