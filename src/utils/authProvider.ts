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

    const { token, role } = await response.json();

    localStorage.setItem("token", token);
    localStorage.setItem("role", role); // ✅ Now directly from response
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    return Promise.resolve();
  },

  checkAuth: () => {
    return localStorage.getItem("token") ? Promise.resolve() : Promise.reject();
  },

  checkError: (error: { status: number }) => {
    if (error.status === 401 || error.status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      return Promise.reject();
    }
    return Promise.resolve();
  },

  getPermissions: () => {
    const role = localStorage.getItem("role");
    return role ? Promise.resolve(role) : Promise.reject();
  },
  getLinkedDoctorId: () => {
    const linkedDoctorId = localStorage.getItem("linkedDoctorId");
    return linkedDoctorId ? Promise.resolve(linkedDoctorId) : Promise.reject();
  },
};

export default authProvider;
