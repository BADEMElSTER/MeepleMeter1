import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import {
  firebaseAdminEmails,
  firebaseAuth,
  firestoreDb,
  isFirebaseConfigured,
} from "../firebase/client.js";
import { roles } from "./roles.js";

const AuthContext = createContext(null);

function getRoleForEmail(email, existingRole = roles.member) {
  return firebaseAdminEmails.includes(email?.trim().toLowerCase()) ? roles.admin : existingRole;
}

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
        const profile = profileSnapshot.data();
        const resolvedRole = getRoleForEmail(currentUser.email, profile.role ?? roles.member);

        if (profile.usernameNormalized && currentUser.email) {
          await setDoc(
            doc(firestoreDb, "usernames", profile.usernameNormalized),
            {
              email: currentUser.email,
              uid: currentUser.uid,
              username: profile.username || profile.displayName || profile.usernameNormalized,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }

        if (resolvedRole !== profile.role) {
          await setDoc(profileRef, { role: resolvedRole, updatedAt: serverTimestamp() }, { merge: true });
        }

        setUserProfile({ ...profile, role: resolvedRole });
      } else {
        const profile = {
          email: currentUser.email,
          displayName: "",
          username: "",
          usernameNormalized: "",
          role: getRoleForEmail(currentUser.email),
          createdAt: serverTimestamp(),
        };
        await setDoc(profileRef, profile);
        setUserProfile(profile);
      }

      setIsAuthLoading(false);
    });
  }, []);

  async function login(identifier, password) {
    if (!firebaseAuth) {
      throw new Error("Firebase ist noch nicht konfiguriert.");
    }

    const loginEmail = await resolveLoginEmail(identifier);
    const credential = await signInWithEmailAndPassword(firebaseAuth, loginEmail, password);

    if (!firestoreDb) {
      return { role: null };
    }

    const profileSnapshot = await getDoc(doc(firestoreDb, "users", credential.user.uid));

    return {
      role: getRoleForEmail(
        credential.user.email,
        profileSnapshot.data()?.role ?? roles.member,
      ),
    };
  }

  async function register(email, password, usernameInput) {
    if (!firebaseAuth || !firestoreDb) {
      throw new Error("Firebase ist noch nicht konfiguriert.");
    }

    const username = usernameInput?.trim() || "";
    const usernameNormalized = username.toLowerCase();

    if (!username) {
      throw new Error("Bitte wähle einen Benutzernamen.");
    }

    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);

    try {
      await runTransaction(firestoreDb, async (transaction) => {
        const usernameRef = doc(firestoreDb, "usernames", usernameNormalized);
        const usernameSnapshot = await transaction.get(usernameRef);

        if (usernameSnapshot.exists()) {
          throw new Error("Dieser Benutzername ist bereits vergeben.");
        }

        transaction.set(usernameRef, {
          email: credential.user.email,
          uid: credential.user.uid,
          username,
          updatedAt: serverTimestamp(),
        });

        transaction.set(doc(firestoreDb, "users", credential.user.uid), {
          email: credential.user.email,
          displayName: username,
          username,
          usernameNormalized,
          role: getRoleForEmail(credential.user.email),
          createdAt: serverTimestamp(),
        });
      });
    } catch (error) {
      await deleteUser(credential.user);
      throw error;
    }
  }

  async function logout() {
    if (firebaseAuth) {
      await signOut(firebaseAuth);
    }
  }

  async function changePassword(newPassword) {
    if (!user) {
      throw new Error("Du bist nicht angemeldet.");
    }

    await updatePassword(user, newPassword);
  }

  async function updateProfile(updates) {
    if (!user || !firestoreDb) {
      throw new Error("Du bist nicht angemeldet.");
    }

    const username = updates.username?.trim() || "";
    const usernameNormalized = username.toLowerCase();
    const currentUsernameNormalized =
      userProfile?.usernameNormalized || userProfile?.username?.trim().toLowerCase() || "";

    if (!username) {
      throw new Error("Bitte wähle einen Benutzernamen.");
    }

    const cleanUpdates = {
      displayName: username,
      username,
      usernameNormalized,
      favoriteGame: updates.favoriteGame?.trim() || "",
      notes: updates.notes?.trim() || "",
      updatedAt: serverTimestamp(),
    };

    await runTransaction(firestoreDb, async (transaction) => {
      const usernameRef = doc(firestoreDb, "usernames", usernameNormalized);
      const usernameSnapshot = await transaction.get(usernameRef);

      if (usernameSnapshot.exists() && usernameSnapshot.data().uid !== user.uid) {
        throw new Error("Dieser Benutzername ist bereits vergeben.");
      }

      transaction.set(usernameRef, {
        email: user.email ?? userProfile?.email ?? "",
        uid: user.uid,
        username,
        updatedAt: serverTimestamp(),
      });

      if (currentUsernameNormalized && currentUsernameNormalized !== usernameNormalized) {
        transaction.delete(doc(firestoreDb, "usernames", currentUsernameNormalized));
      }

      transaction.update(doc(firestoreDb, "users", user.uid), cleanUpdates);
    });

    setUserProfile((currentProfile) => ({
      ...currentProfile,
      ...cleanUpdates,
    }));
  }

  async function resolveLoginEmail(identifier) {
    const trimmedIdentifier = identifier.trim();

    if (trimmedIdentifier.includes("@")) {
      return trimmedIdentifier;
    }

    if (!firestoreDb) {
      throw new Error("Login mit Benutzername ist erst mit Firestore möglich.");
    }

    const usernameSnapshot = await getDoc(
      doc(firestoreDb, "usernames", trimmedIdentifier.toLowerCase()),
    );
    const email = usernameSnapshot.data()?.email;

    if (!usernameSnapshot.exists() || !email) {
      throw new Error("Benutzername nicht gefunden. Bitte nutze deine E-Mail-Adresse.");
    }

    return email;
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
      changePassword,
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
