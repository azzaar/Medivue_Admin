import { useLogout } from 'react-admin';

const MyLogoutButton = () => {
  const logout = useLogout();
  return <button onClick={() => logout()}>Logout</button>;
};

export default MyLogoutButton;