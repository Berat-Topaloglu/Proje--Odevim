import React, { createContext, useContext, useEffect, useState } from "react";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    async function register(email, password, displayName, userType) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });

        const userData = {
            type: userType, // backward compatibility
            roles: [userType],
            displayName,
            email,
            photoURL: "",
            createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, "users", result.user.uid), userData);

        if (userType === "student") {
            await setDoc(doc(db, "students", result.user.uid), {
                university: "",
                department: "",
                gpa: "",
                skills: [],
                bio: "",
                cvUrl: "",
                appliedJobs: [],
            });
        } else {
            await setDoc(doc(db, "companies", result.user.uid), {
                companyName: displayName,
                sector: "",
                website: "",
                description: "",
                logoUrl: "",
                verified: false,
            });
        }

        return result;
    }

    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    function logout() {
        return signOut(auth);
    }

    function resetPassword(email) {
        return sendPasswordResetEmail(auth, email);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        if (!Array.isArray(data.roles) && data.type) {
                            await updateDoc(doc(db, "users", user.uid), { roles: [data.type] });
                            data.roles = [data.type];
                        }
                        setUserProfile({
                            ...data,
                            type: data.type || data.roles?.[0],
                        });
                    } else {
                        setUserProfile(null);
                    }
                } catch (err) {
                    console.error("Profile fetch error:", err);
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const activeRole = userProfile?.type || userProfile?.roles?.[0] || null;

    const value = {
        currentUser,
        userProfile,
        activeRole,
        register,
        login,
        logout,
        resetPassword,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
