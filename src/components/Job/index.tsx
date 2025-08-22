import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  NumberField,
  EditButton,
  ShowButton,
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  ArrayInput,
  SimpleFormIterator,
  Edit,
  Show,
  BooleanInput
} from 'react-admin';

// JobCategory List View (Display job categories)
const JobCategoryList = (props) => (
  <List {...props}>
    <Datagrid>
      <TextField source="name" />
      <NumberField source="count" />
      <EditButton />
      <ShowButton />
    </Datagrid>
  </List>
);

// JobCategory Create View (Form for creating a job category)
const JobCategoryCreate = (props) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput label="Category Name" source="name" />
      <NumberInput label="Number of Roles" source="count" />
      <ArrayInput label="Roles" source="roles">
        <SimpleFormIterator>
          <TextInput label="Role Title" source="title" />
          <TextInput label="Job Code" source="jobCode" />
          <TextInput label="Location" source="location" />
          <TextInput label="Job Description" source="jobDescription" />
          <TextInput label="Experience" source="experience" /> {/* New Experience field */}
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Create>
);

// JobCategory Edit View (Form for editing a job category)
const JobCategoryEdit = (props) => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput label="Category Name" source="name" />
      <NumberInput label="Number of Roles" source="count" />
      <ArrayInput label="Roles" source="roles">
        <SimpleFormIterator>
          <TextInput label="Role Title" source="title" />
          <TextInput label="Job Code" source="jobCode" />
          <TextInput label="Location" source="location" />
          <TextInput label="Job Description" source="jobDescription" />
          <TextInput label="Experience" source="experience" /> {/* New Experience field */}
        </SimpleFormIterator>
      </ArrayInput>
            <BooleanInput label="Active" source="active" /> {/* Active field for edit */}

    </SimpleForm>
  </Edit>
);

// JobCategory Show View (Display details of a job category)
const JobCategoryShow = (props) => (
  <Show {...props}>
    <SimpleForm>
      <TextField label="Category Name" source="name" />
      <NumberField label="Number of Roles" source="count" />
      <ArrayInput label="Roles" source="roles">
        <SimpleFormIterator>
          <TextField label="Role Title" source="title" />
          <TextField label="Job Code" source="jobCode" />
          <TextField label="Location" source="location" />
          <TextField label="Job Description" source="jobDescription" />
          <TextField label="Experience" source="experience" /> {/* New Experience field */}
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Show>
);

export { JobCategoryList, JobCategoryCreate, JobCategoryEdit, JobCategoryShow };
