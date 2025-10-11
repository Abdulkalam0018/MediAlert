import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ import navigate
import axiosInstance from "../api/axiosInstance.js";

function Login() {
  const { user, isSignedIn } = useUser();
  const [synced, setSynced] = useState(false);
  const navigate = useNavigate(); // ✅ initialize navigation

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
      navigate("/dashboard"); // ✅ redirect after successful sign-in
    }
  }, [isSignedIn, user, synced, navigate]);

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
