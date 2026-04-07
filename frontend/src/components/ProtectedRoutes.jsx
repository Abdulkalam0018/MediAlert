import { useAuth } from '@clerk/clerk-react';
import { Outlet, Navigate } from 'react-router-dom';


const ProtectedRoute = ({ children }) => {

  const { isLoaded, isSignedIn } = useAuth(); 

  if (!isLoaded) {
    return <div>Loading...</div>; 
  }

  if (isSignedIn) {
    return children ?? <Outlet />;
  } else {
    return <Navigate to="/" replace />;
  }
};

export default ProtectedRoute;
