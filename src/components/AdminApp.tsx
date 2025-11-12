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
  EventAvailable as LeaveIcon,
  Receipt as ReceiptIcon,
  EventNote as DailyVisitsIcon,
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
import DoctorDashboard from "./Dashboard/DoctorDashboard";
import ExpenseTracker from "./Expense/List";
import ClinicAnalyticsDashboard from "./Dashboard/OverAllDashboard";
import LeaveList from "./Leave/List";
import LeaveCreate from "./Leave/Create";
import LeaveEdit from "./Leave/Edit";
import LeaveShow from "./Leave/Show";
import LeaveCalendar from "./Leave/Calendar";
import InvoicePage from "./Invoice";
import DailyVisitList from "./DailyVisits";

const AdminApp = () => {
  return (
    <Admin
      layout={CustomLayout}
      dataProvider={customDataProvider}
      authProvider={customAuthProvider}
      loginPage={CustomLoginPage}
      theme={theme}
      // dashboard={ClinicAnalyticsDashboard}
      defaultTheme="light"
    >
      {(permissions) => {
        const isAdmin = permissions === "admin";
        const superAdmin = permissions === "superAdmin";

        return (
          <>
            {/* ✅ Admin-only resources and dashboard */}
            {isAdmin && (
              <>
                <Resource
                  name="ss"
                  options={{ label: "Dashboard" }}
                  list={ClinicAnalyticsDashboard} // trick: treat Dashboard as a list page
                />
                <Resource name="expenses" list={ExpenseTracker} />
                <CustomRoutes>
              
                  <Route
                    path="leaves/calendar"
                    element={<LeaveCalendar />}
                  />
                </CustomRoutes>
                <Resource
                  name="dashboard"
                  options={{ label: "Payment History" }}
                  list={Dashboard} // trick: treat Dashboard as a list page
                />
                <Resource
                  name="daily-visits"
                  options={{ label: "Daily Visit List" }}
                  list={DailyVisitList}
                  icon={DailyVisitsIcon}
                />
                <Resource
                  name="invoices"
                  options={{ label: "Invoice Generator" }}
                  list={InvoicePage}
                  icon={ReceiptIcon}
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
                  name="leaves"
                  options={{ label: "Leave Management" }}
                  list={LeaveList}
                  create={LeaveCreate}
                  edit={LeaveEdit}
                  show={LeaveShow}
                  icon={LeaveIcon}
                />
                <Resource
                  name="appointments"
                  list={AppoinmentList}
                  options={{ label: "Website Bookings" }}
                  icon={BookOnline}
                />
                <Resource
                  name="jobs"
                  options={{ label: "Hiring Posts" }}
                  list={JobCategoryList}
                  create={JobCategoryCreate}
                  edit={JobCategoryEdit}
                  show={JobCategoryShow}
                />
              </>
            )}
     
          

            {/* ✅ Doctor Leave Management (for non-admin users) */}
            {!isAdmin && !superAdmin && (
              <>
                <Resource
                  name="doctor-dashboard"
                  options={{ label: "My Dashboard" }}
                  list={DoctorDashboard}
                />
                <Resource
                  name="daily-visits"
                  options={{ label: "My Daily Visits" }}
                  list={DailyVisitList}
                  icon={DailyVisitsIcon}
                />
                <Resource
                  name="invoices"
                  options={{ label: "My Invoices" }}
                  list={InvoicePage}
                  icon={ReceiptIcon}
                />
                <Resource
                  name="leaves"
                  options={{ label: "My Leaves" }}
                  list={LeaveList}
                  create={LeaveCreate}
                  edit={LeaveEdit}
                  show={LeaveShow}
                  icon={LeaveIcon}
                />
                <CustomRoutes>
                  <Route
                    path="leaves/calendar"
                    element={<LeaveCalendar />}
                  />
                </CustomRoutes>
              </>
            )}
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
