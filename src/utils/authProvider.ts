// authProvider.ts

const TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds

let idleTimeout: NodeJS.Timeout;

const resetIdleTimeout = () => {
  clearTimeout(idleTimeout);
  idleTimeout = setTimeout(() => {
    authProvider.logout(); // Automatically log out after inactivity
    window.location.href = "/login"; // Redirect to login page
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
    const request = new Request("https://api.medivue.life/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
      headers: new Headers({ "Content-Type": "application/json" }),
    });

    const response = await fetch(request);
    if (!response.ok) throw new Error("Login failed");

    const { token, role, linkedDoctorId } = await response.json();
    localStorage.setItem("linkedDoctorId", linkedDoctorId); // Store linked doctor ID
    localStorage.setItem("token", token); // Store token
    localStorage.setItem("role", role); // Store role

    resetIdleTimeout(); // Reset idle timeout after successful login
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("linkedDoctorId"); // Clear doctor ID
    clearTimeout(idleTimeout); // Clear idle timeout

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
