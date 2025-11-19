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
        linkedDoctorId: string;
      }>(API_ENDPOINTS.AUTH.LOGIN, { username, password }, { skipAuth: true });

      localStorage.setItem("linkedDoctorId", data.linkedDoctorId); // Store linked doctor ID
      localStorage.setItem("token", data.token); // Store token
      localStorage.setItem("role", data.role); // Store role

      resetIdleTimeout(); // Reset idle timeout after successful login
    } catch (error) {
      throw new Error(error.message || "Login failed");
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("linkedDoctorId"); // Clear doctor ID
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
};

// Reset the idle timeout whenever there's user activity
window.addEventListener("mousemove", resetIdleTimeout);
window.addEventListener("keydown", resetIdleTimeout);
window.addEventListener("click", resetIdleTimeout);

export default authProvider;
