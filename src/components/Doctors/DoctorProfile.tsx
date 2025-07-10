"use client";

import { useState, useEffect } from "react";
import {
  TextInput,
  NumberInput,
  SimpleForm,
  Toolbar,
  SaveButton,
  Edit,
  useNotify,
  useRedirect,
    useRefresh,
  useLogout,
  useRecordContext,
} from "react-admin";
import {
  Typography,
  Divider,
  Box,
  Button,
  CircularProgress,
} from "@mui/material";
import { Grid } from "@mui/material";
import { toast } from "react-toastify";

async function updateUsernamePassword({
  id,
  username,
  plainPassword,
}: {
  id: string;
  username: string;
  plainPassword: string;
    }): Promise<object> {
        const token = localStorage.getItem("token");

  const response = await fetch(`https://api.medivue.life/doctors/${id}/credentials`, {
    method: "PUT",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,  // Add the token here
      },
    body: JSON.stringify({ username, plainPassword }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to update credentials");
  }
  return response.json();
}

const CustomToolbar = () => {
  const notify = useNotify();
  const refresh = useRefresh();
  const redirect = useRedirect();

  return (
    <Toolbar>
      <SaveButton
        label="Save Profile Details"
        mutationOptions={{
          onSuccess: () => {
            notify("General profile details updated successfully!", {
              type: "success",
            });
            refresh();
            redirect("/patients");
          },
          onError: (error: unknown) => {
            let message = "Unknown error";
            if (error instanceof Error) {
              message = error.message;
            }
            notify(
              `Error updating profile: ${message}`,
              { type: "error" }
            );
          },
        }}
      />
    </Toolbar>
  );
};

const DoctorProfileForm = () => {
  const record = useRecordContext();
  const logout = useLogout();

  const [username, setUsername] = useState<string>("");
  const [plainPassword, setPlainPassword] = useState<string>("");

  useEffect(() => {
    if (record) {
      setUsername(record.username || "");
      setPlainPassword("");
    }
  }, [record]);

  const handleCredentialsChange = async () => {
    try {
      if (!record?.id) {
        toast.error("Doctor ID not found for updating credentials.");
        return;
      }
      if (!username || !plainPassword) {
        toast.error(
          "Both Username and New Password are required to update credentials."
        );
        return;
      }

      await updateUsernamePassword({
        id: String(record.id),
        username,
        plainPassword,
      });

      toast.success(
        "Login credentials updated. Please log in again with new credentials."
      );
      logout();
    } catch (err: unknown) {
      console.error("Error updating credentials:", err);
      if (err instanceof Error) {
        toast.error(`Failed to update login credentials: ${err.message}`);
      } else {
        toast.error("Failed to update login credentials: An unknown error occurred.");
      }
    }
  };

  if (!record) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="200px"
      >
        <CircularProgress />
        <Typography variant="h6" ml={2}>
          Loading Doctor Profile...
        </Typography>
      </Box>
    );
  }

  return (
    <SimpleForm toolbar={<CustomToolbar />}>
      <Typography variant="h6" gutterBottom>
        Doctor Profile Details
      </Typography>
      <Grid container spacing={2}>
  <Grid item xs={12} sm={6}>
    <TextInput source="name" label="Name" fullWidth />
  </Grid>
  <Grid item xs={12} sm={6}>
    <TextInput source="specialization" label="Specialization" fullWidth />
  </Grid>
  <Grid item xs={12} sm={6}>
    <TextInput source="contactNumber" label="Contact Number" fullWidth />
  </Grid>
  <Grid item xs={12} sm={6}>
    <TextInput source="email" label="Email" type="email" fullWidth />
  </Grid>
  <Grid item xs={12} sm={6}>
    <NumberInput source="experience" label="Experience (Years)" fullWidth />
  </Grid>
</Grid>


      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" gutterBottom>
        Change Login Credentials
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}> {/* Removed component="div" */}
          <TextInput
            label="New Username"
                      value={username}
                      source="username"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
            fullWidth
            helperText="Enter a new username for login."
          />
        </Grid>
        <Grid item xs={12} sm={6}> {/* Removed component="div" */}
          <TextInput
            label="New Password"
                      source="plainPassword"
            value={plainPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlainPassword(e.target.value)}
            fullWidth
            helperText="Enter a new password. Leave blank if you don't want to change it."
          />
        </Grid>
      </Grid>

      <Box display="flex" justifyContent="center" mt={3}>
        <Button variant="contained" onClick={handleCredentialsChange}>
          Update Login Credentials
        </Button>
      </Box>
    </SimpleForm>
  );
};

const DoctorProfilePage = () => {
  const id: string | null = localStorage.getItem("linkedDoctorId");
  const notify = useNotify();

  useEffect(() => {
    if (!id) {
      notify(
        "Doctor ID not found in local storage. Please ensure you are logged in correctly.",
        { type: "error" }
      );
    }
  }, [id, notify]);

  if (!id) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="200px"
      >
        <Typography variant="h6">
          Error: Doctor ID not available. Cannot load profile.
        </Typography>
      </Box>
    );
  }

  return (
    <Edit resource="doctors" id={id} title="Edit Profile">
      <DoctorProfileForm />
    </Edit>
  );
};

export default DoctorProfilePage;
