// authProvider.ts
import { apiClient as httpClient } from "@/utils";
import { API_ENDPOINTS } from "@/config/api.config";

// Session timeout: 4 hours (more user-friendly)
const TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
// Warning before logout: 5 minutes before timeout
const WARNING_TIME = TIMEOUT - (5 * 60 * 1000);

let idleTimeout: NodeJS.Timeout;
let warningTimeout: NodeJS.Timeout;

// Show warning dialog before session expires
const showSessionWarning = () => {
  const shouldExtend = window.confirm(
    "Your session will expire in 5 minutes due to inactivity.\n\n" +
    "Click OK to extend your session, or Cancel to log out now."
  );

  if (shouldExtend) {
    // User wants to extend - reset the timers
    resetIdleTimeout();
  } else {
    // User wants to log out
    authProvider.logout();
    window.location.href = "/login";
  }
};

const resetIdleTimeout = () => {
  // Clear existing timers
  clearTimeout(idleTimeout);
  clearTimeout(warningTimeout);

  // Set warning timer (shows 5 minutes before logout)
  warningTimeout = setTimeout(() => {
    showSessionWarning();
  }, WARNING_TIME);

  // Set auto-logout timer
  idleTimeout = setTimeout(() => {
    authProvider.logout();
    alert("Your session has expired due to inactivity. Please log in again.");
    window.location.href = "/login";
  }, TIMEOUT);
};

const authProvider = {
  login: async ({
    username,
    password,
  }: {
    username: string;
    password: string;
  }) => {
    try {
      const data = await httpClient.post<{
        token: string;
        role: string;
        linkedDoctorId?: string;
        linkedPatientId?: string;
        patientId?: string;
        patientName?: string;
        isCommissionBased?: boolean;
        mustChangePassword?: boolean;
      }>(API_ENDPOINTS.AUTH.LOGIN, { username, password }, { skipAuth: true });

      localStorage.setItem("token", data.token); // Store token
      localStorage.setItem("role", data.role); // Store role

      // Store doctor-specific data
      if (data.linkedDoctorId) {
        localStorage.setItem("linkedDoctorId", data.linkedDoctorId);
        localStorage.setItem("isCommissionBased", String(data.isCommissionBased || false));
      }

      // Store patient-specific data
      if (data.linkedPatientId || data.patientId) {
        localStorage.setItem("linkedPatientId", data.linkedPatientId || data.patientId || "");
        if (data.patientName) {
          localStorage.setItem("patientName", data.patientName);
        }
        if (data.mustChangePassword) {
          localStorage.setItem("mustChangePassword", String(data.mustChangePassword));
        }
      }

      resetIdleTimeout(); // Reset idle timeout after successful login
    } catch (error) {
      throw new Error(error.message || "Login failed");
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("linkedDoctorId"); // Clear doctor ID
    localStorage.removeItem("isCommissionBased"); // Clear commission flag
    localStorage.removeItem("linkedPatientId"); // Clear patient ID
    localStorage.removeItem("patientName"); // Clear patient name
    localStorage.removeItem("mustChangePassword"); // Clear password change flag
    clearTimeout(idleTimeout); // Clear idle timeout
    clearTimeout(warningTimeout); // Clear warning timeout

    return Promise.resolve();
  },

  checkAuth: (): Promise<void> => {
    return localStorage.getItem("token")
      ? Promise.resolve()
      : Promise.reject(new Error("User not authenticated"));
  },

  checkError: (error: { status: number }): Promise<void> => {
    if (error.status === 401 || error.status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      return Promise.reject(new Error("Unauthorized"));
    }
    return Promise.resolve();
  },

  getPermissions: (): Promise<string> => {
    const role = localStorage.getItem("role");
    return role
      ? Promise.resolve(role)
      : Promise.reject(new Error("Role not found"));
  },

  getLinkedDoctorId: (): Promise<string> => {
    const linkedDoctorId = localStorage.getItem("linkedDoctorId");
    return linkedDoctorId
      ? Promise.resolve(linkedDoctorId)
      : Promise.reject(new Error("Linked doctor ID not found"));
  },

  getLinkedPatientId: (): Promise<string> => {
    const linkedPatientId = localStorage.getItem("linkedPatientId");
    return linkedPatientId
      ? Promise.resolve(linkedPatientId)
      : Promise.reject(new Error("Linked patient ID not found"));
  },

  getIdentity: (): Promise<{ id: string; fullName: string; role: string }> => {
    const role = localStorage.getItem("role");
    const linkedPatientId = localStorage.getItem("linkedPatientId");
    const patientName = localStorage.getItem("patientName");
    const linkedDoctorId = localStorage.getItem("linkedDoctorId");

    if (role === "patient" && linkedPatientId) {
      return Promise.resolve({
        id: linkedPatientId,
        fullName: patientName || "Patient",
        role: "patient",
      });
    }

    if (role === "doctor" && linkedDoctorId) {
      return Promise.resolve({
        id: linkedDoctorId,
        fullName: "Doctor", // Could fetch from API if needed
        role: "doctor",
      });
    }

    return Promise.resolve({
      id: "admin",
      fullName: "Admin",
      role: role || "admin",
    });
  },
};

// Reset the idle timeout whenever there's user activity
window.addEventListener("mousemove", resetIdleTimeout);
window.addEventListener("keydown", resetIdleTimeout);
window.addEventListener("click", resetIdleTimeout);

export default authProvider;
