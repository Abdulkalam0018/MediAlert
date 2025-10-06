import React from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Outlet, Navigate } from 'react-router-dom';


const ProtectedRoute = () => {

  const { isLoaded, isSignedIn } = useAuth(); 

  if (!isLoaded) {
    return <div>Loading...</div>; 
  }

  if (isSignedIn) {
    return <Outlet />;
  } else {
    return <Navigate to="/" replace />;
  }
};

export default ProtectedRoute;