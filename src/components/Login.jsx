import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance.js";

function Login() {
  const { user, isSignedIn } = useUser();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const syncUser = async () => {
      try {
        const res = await axiosInstance.get("/users/sync");
        setSynced(true);
      } catch (err) {
        console.error("Sync failed:", err);
      }
    };

    if (!synced && isSignedIn && user) {
      syncUser();
    }
  }, [isSignedIn, user]);

  return (
    <header>
      <SignedOut>
        <SignInButton />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </header>
  );
}

export default Login;
