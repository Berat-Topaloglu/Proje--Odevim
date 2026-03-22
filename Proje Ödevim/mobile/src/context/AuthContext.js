import React, { createContext, useContext, useEffect, useState } from "react";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    GoogleAuthProvider,
    signInWithCredential,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [systemSettings, setSystemSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    async function register(email, password, displayName, userType, extraData = {}) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });

        const userData = {
            type: userType,
            displayName,
            email,
            phoneNumber: extraData.phoneNumber || "",
            photoURL: "",
            createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, "users", result.user.uid), userData);

        if (userType === "student") {
            await setDoc(doc(db, "students", result.user.uid), {
                university: extraData.university || "",
                department: extraData.department || "",
                graduationYear: extraData.graduationYear || "",
                gpa: "",
                skills: [],
                bio: "",
                cvUrl: "",
                appliedJobs: [],
            });
        } else {
            await setDoc(doc(db, "companies", result.user.uid), {
                companyName: displayName,
                sector: extraData.sector || "",
                website: extraData.website || "",
                address: extraData.address || "",
                description: "",
                logoUrl: "",
                verified: false,
            });
        }

        return result;
    }

    async function completeGoogleRegistration(user, userType, extraData = {}) {
        if (!user) throw new Error("Kullanıcı bilgisi bulunamadı.");
        
        const userData = {
            type: userType,
            displayName: user.displayName || "Google Kullanıcısı",
            email: user.email,
            phoneNumber: extraData.phoneNumber || "",
            photoURL: user.photoURL || "",
            updatedAt: new Date().toISOString(),
        };

        // If user already exists in 'users' but needs profile completion
        // Use merges to not overwrite other fields if they exist
        await setDoc(doc(db, "users", user.uid), userData, { merge: true });

        if (userType === "student") {
            await setDoc(doc(db, "students", user.uid), {
                university: extraData.university || "",
                department: extraData.department || "",
                graduationYear: extraData.graduationYear || "",
                gpa: "",
                skills: [],
                bio: "",
                cvUrl: "",
                appliedJobs: [],
                updatedAt: new Date().toISOString(),
            }, { merge: true });
        } else {
            await setDoc(doc(db, "companies", user.uid), {
                companyName: user.displayName || "Google Şirketi",
                sector: extraData.sector || "",
                website: extraData.website || "",
                address: extraData.address || "",
                description: "",
                logoUrl: user.photoURL || "",
                verified: false,
                updatedAt: new Date().toISOString(),
            }, { merge: true });
        }
    }

    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    function loginWithGoogle(idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        return signInWithCredential(auth, credential);
    }

    function logout() {
        return signOut(auth);
    }

    async function changePassword(currentPassword, newPassword) {
        const user = auth.currentUser;
        if (!user) throw new Error("Kullanıcı bulunamadı.");
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        return updatePassword(user, newPassword);
    }
    
    async function updateProfileData(displayName, photoURL, phoneNumber) {
        if (!auth.currentUser) return;
        
        // 1. Update Firebase Auth Profile
        await updateProfile(auth.currentUser, { 
            displayName: displayName || auth.currentUser.displayName, 
            photoURL: photoURL || auth.currentUser.photoURL 
        });
        
        // 2. Update 'users' collection
        const userUpdates = {
            displayName: displayName || auth.currentUser.displayName,
            photoURL: photoURL || auth.currentUser.photoURL,
            updatedAt: new Date().toISOString()
        };
        if (phoneNumber) userUpdates.phoneNumber = phoneNumber;
        
        await setDoc(doc(db, "users", auth.currentUser.uid), userUpdates, { merge: true });
        
        // 3. Update role-specific collection (students or companies)
        const role = userProfile?.type || "student";
        const roleColl = role === "student" ? "students" : "companies";
        const roleUpdates = {
            updatedAt: new Date().toISOString()
        };
        
        if (role === "student") {
            if (photoURL) roleUpdates.photoUrl = photoURL;
            if (displayName) roleUpdates.displayName = displayName;
        } else {
            if (photoURL) roleUpdates.logoUrl = photoURL;
            if (displayName) roleUpdates.companyName = displayName;
        }
            
        await setDoc(doc(db, roleColl, auth.currentUser.uid), roleUpdates, { merge: true });
    }

    function resetPassword(email) {
        return sendPasswordResetEmail(auth, email);
    }

    // Listen to global system settings
    useEffect(() => {
        const unsub = onSnapshot(doc(db, "settings", "system"), (snap) => {
            if (snap.exists()) {
                setSystemSettings(snap.data());
            }
        });
        return unsub;
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    const profile = userDoc.exists() ? userDoc.data() : null;
                    setUserProfile(profile);
                    setIsAdmin(profile?.email === "tedas_is_berat@hotmail.com"); // Founder check
                } catch (err) {
                    console.error("Profile fetch error:", err);
                }
            } else {
                setUserProfile(null);
                setIsAdmin(false);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userProfile,
        systemSettings,
        isAdmin,
        register,
        completeGoogleRegistration,
        login,
        loginWithGoogle,
        logout,
        resetPassword,
        changePassword,
        updateProfileData,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
