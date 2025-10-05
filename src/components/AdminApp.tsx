"use client";

import { Admin, Resource, CustomRoutes } from "react-admin";
import { Route } from "react-router-dom";

import customDataProvider from "@/utils";
import customAuthProvider from "../utils/authProvider";
import CustomLayout from "./CustomLayout";

import DoctorCreate from "./Doctors/Create";
import DoctorEdit from "./Doctors/Edit";
import DoctorList from "./Doctors/List";
import { DoctorShow } from "./Doctors/Show";

import PatientCreate from "./Patients/Create";
import PatientEdit from "./Patients/Edit";
import PatientList from "./Patients/List";
import { PatientShow } from "./Patients/Show";
import PatientNotes from "./Patients/Note";

import {
  Person as PersonIcon,
  HealthAndSafety as GroupIcon,
  BookOnline,
} from "@mui/icons-material";

import theme from "@/utils/theme";
import CustomLoginPage from "./CustomLoginPage";
import DoctorProfilePage from "./Doctors/DoctorProfile";
import AppoinmentList from "./Appoinment/List";
import {
  JobCategoryList,
  JobCategoryCreate,
  JobCategoryEdit,
  JobCategoryShow,
} from "./Job";
import Dashboard from "./Dashboard";

const AdminApp = () => {
  return (
    <Admin
      layout={CustomLayout}
      dataProvider={customDataProvider}
      authProvider={customAuthProvider}
      loginPage={CustomLoginPage}
      theme={theme}
      defaultTheme="light"
    >
      {(permissions) => {
        const isAdmin = permissions === "admin";

        return (
          <>
            {/* ✅ Admin-only resources and dashboard */}
            {isAdmin && (
              <>
                {/* Show Dashboard for Admins only */}
                <Resource
                  name="dashboard"
                  options={{ label: "Dashboard" }}
                  list={Dashboard} // trick: treat Dashboard as a list page
                />

                <Resource
                  name="doctors"
                  list={DoctorList}
                  create={DoctorCreate}
                  edit={DoctorEdit}
                  show={DoctorShow}
                  icon={GroupIcon}
                />
                <Resource
                  name="appointments"
                  list={AppoinmentList}
                  icon={BookOnline}
                />
                <Resource
                  name="jobs"
                  list={JobCategoryList}
                  create={JobCategoryCreate}
                  edit={JobCategoryEdit}
                  show={JobCategoryShow}
                />
              </>
            )}

            {/* ✅ Common resource for all users */}
            <Resource
              name="patients"
              list={PatientList}
              create={PatientCreate}
              edit={PatientEdit}
              show={PatientShow}
              icon={PersonIcon}
            />

            <CustomRoutes>
              <Route
                path="/doctors/:id/profile"
                element={<DoctorProfilePage />}
              />
              <Route path="/patients/:id/notes" element={<PatientNotes />} />
            </CustomRoutes>
          </>
        );
      }}
    </Admin>
  );
};

export default AdminApp;
