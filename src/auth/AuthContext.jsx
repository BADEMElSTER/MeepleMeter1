import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { firebaseAuth, firestoreDb, isFirebaseConfigured } from "../firebase/client.js";
import { roles } from "./roles.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!firebaseAuth) {
      setIsAuthLoading(false);
      return undefined;
    }

    return onAuthStateChanged(firebaseAuth, async (currentUser) => {
      setIsAuthLoading(true);
      setUser(currentUser);

      if (!currentUser || !firestoreDb) {
        setUserProfile(null);
        setIsAuthLoading(false);
        return;
      }

      const profileRef = doc(firestoreDb, "users", currentUser.uid);
      const profileSnapshot = await getDoc(profileRef);

      if (profileSnapshot.exists()) {
        setUserProfile(profileSnapshot.data());
      } else {
        const profile = {
          email: currentUser.email,
          displayName: "",
          username: "",
          usernameNormalized: "",
          role: roles.member,
          createdAt: serverTimestamp(),
        };
        await setDoc(profileRef, profile);
        setUserProfile(profile);
      }

      setIsAuthLoading(false);
    });
  }, []);

  async function login(email, password) {
    if (!firebaseAuth) {
      throw new Error("Firebase ist noch nicht konfiguriert.");
    }

    await signInWithEmailAndPassword(firebaseAuth, email, password);
  }

  async function register(email, password) {
    if (!firebaseAuth || !firestoreDb) {
      throw new Error("Firebase ist noch nicht konfiguriert.");
    }

    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    await setDoc(doc(firestoreDb, "users", credential.user.uid), {
      email: credential.user.email,
      displayName: "",
      username: "",
      usernameNormalized: "",
      role: roles.member,
      createdAt: serverTimestamp(),
    });
  }

  async function logout() {
    if (firebaseAuth) {
      await signOut(firebaseAuth);
    }
  }

  async function updateProfile(updates) {
    if (!user || !firestoreDb) {
      throw new Error("Du bist nicht angemeldet.");
    }

    const username = updates.username?.trim() || "";

    if (!username) {
      throw new Error("Bitte wähle einen Benutzernamen.");
    }

    const cleanUpdates = {
      displayName: username,
      username,
      usernameNormalized: username.toLowerCase(),
      favoriteGame: updates.favoriteGame?.trim() || "",
      notes: updates.notes?.trim() || "",
      updatedAt: serverTimestamp(),
    };

    await updateDoc(doc(firestoreDb, "users", user.uid), cleanUpdates);
    setUserProfile((currentProfile) => ({
      ...currentProfile,
      ...cleanUpdates,
    }));
  }

  const value = useMemo(
    () => ({
      user,
      userProfile,
      role: userProfile?.role ?? null,
      isAdmin: userProfile?.role === roles.admin,
      hasUsername: Boolean(userProfile?.username?.trim()),
      isAuthLoading,
      isFirebaseConfigured,
      login,
      register,
      logout,
      updateProfile,
    }),
    [isAuthLoading, user, userProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
