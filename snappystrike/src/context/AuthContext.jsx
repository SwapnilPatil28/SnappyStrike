import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'buyer' or 'seller'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch user role from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role);
          } else {
            console.warn("User document not found in Firestore.");
          }
        } catch (error) {
          console.error("Firestore permission denied or failed to fetch user role:", error.message);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async (email, password, userRole) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    try {
      // Create user in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        role: userRole,
        createdAt: new Date().toISOString()
      });
      setRole(userRole);
      return userCredential;
    } catch (error) {
      // If firestore fails (e.g. security rules), delete the auth user so they aren't orphaned
      await userCredential.user.delete();
      throw new Error("Failed to create user database record: " + error.message + " (Check Firestore Rules!)");
    }
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    user,
    role,
    signup,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
