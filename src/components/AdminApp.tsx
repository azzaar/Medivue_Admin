'use client';

import { Admin, Resource, CustomRoutes } from 'react-admin';
import { Route } from 'react-router-dom';

import customDataProvider from '@/utils';
import customAuthProvider from '../utils/authProvider';
import CustomLayout from './CustomLayout';

import DoctorCreate from './Doctors/Create';
import DoctorEdit from './Doctors/Edit';
import DoctorList from './Doctors/List';
import { DoctorShow } from './Doctors/Show';

import PatientCreate from './Patients/Create';
import PatientEdit from './Patients/Edit';
import PatientList from './Patients/List';
import { PatientShow } from './Patients/Show';
import PatientNotes from './Patients/Note';
const AdminApp = () => {
  return (
    <Admin
      layout={CustomLayout}
      dataProvider={customDataProvider}
      authProvider={customAuthProvider}
    >
      {(permissions) => (
        <>
          {permissions === 'admin' && (
            <>
              <Resource
                name="patients"
                list={PatientList}
                create={PatientCreate}
                edit={PatientEdit}
                show={PatientShow}
              />
              <Resource
                name="doctors"
                list={DoctorList}
                create={DoctorCreate}
                edit={DoctorEdit}
                show={DoctorShow}
                
              />
            </>
          )}

          {permissions === 'doctor' && (
            <>
              <Resource
                name="patients"
                list={PatientList}
                create={PatientCreate}
                edit={PatientEdit}
                show={PatientShow}
              />
            </>
          )}

          <CustomRoutes>
            <Route path="/patients/:id/notes" element={<PatientNotes />} />
          </CustomRoutes>
        </>
      )}
    </Admin>
  );
};

export default AdminApp;
