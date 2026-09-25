import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Outlet, Navigate } from 'react-router-dom';

const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return isOnline;
};

const OfflineNotice = () => (
  <div style={{ maxWidth: 420, margin: '20vh auto', padding: '0 1.5rem', textAlign: 'center' }}>
    <h2 style={{ marginBottom: '0.5rem' }}>You're offline</h2>
    <p style={{ margin: '0 0 1.25rem', lineHeight: 1.5 }}>
      MediAlert needs a connection to confirm your sign-in. Doses you already
      logged on this device will sync once you're back online.
    </p>
    <button type="button" onClick={() => window.location.reload()}>
      Reload
    </button>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const isOnline = useOnlineStatus();

  if (!isLoaded) {
    return isOnline ? <div>Loading...</div> : <OfflineNotice />;
  }

  if (isSignedIn) {
    return children ?? <Outlet />;
  }

  // Don't bounce a signed-in user to the landing page just because the
  // network is down and Clerk can't confirm the session.
  if (!isOnline) {
    return <OfflineNotice />;
  }

  return <Navigate to="/" replace />;
};

export default ProtectedRoute;
