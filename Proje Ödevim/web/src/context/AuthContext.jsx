import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile,
    sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, arrayUnion, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [systemSettings, setSystemSettings] = useState({ maintenance: false });

    // Listen for system settings (Maintenance Mode etc) - Isolated for StajHub
    useEffect(() => {
        const unsub = onSnapshot(doc(db, "settings", "stajhub"), (docSnap) => {
            if (docSnap.exists()) {
                setSystemSettings(docSnap.data());
            }
        });
        return unsub;
    }, []);

    // Firestore tabanlı admin kontrolü — hardcoded email yerine
    const checkIsAdmin = useCallback(async (uid) => {
        try {
            const adminDoc = await getDoc(doc(db, "admins", uid));
            if (adminDoc.exists()) return true;
            // Geriye dönük uyumluluk: users tablosunda isAdmin flag kontrolü
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists() && userDoc.data().isAdmin === true) return true;
            return false;
        } catch (err) {
            console.error("Admin check error:", err);
            return false;
        }
    }, []);

    const register = useCallback(async (email, password, displayName, userType) => {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });

        // Base user data
        const userData = {
            roles: [userType], // Multi-role support
            displayName,
            email,
            photoURL: "",
            createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, "users", result.user.uid), userData);

        // Role specific profile
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
    }, []);

    const login = useCallback(async (email, password, selectedType) => {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, "users", result.user.uid));

        if (!userDoc.exists()) {
            throw new Error("Kullanıcı kaydı bulunamadı.");
        }

        const data = userDoc.data();
        if (!data.roles?.includes(selectedType)) {
            throw new Error(`Bu hesapta ${selectedType === 'student' ? 'Öğrenci' : 'Şirket'} profili bulunmuyor.`);
        }

        // Set active profile and update state instantly
        setCurrentUser(result.user);
        await loadUserProfile(result.user.uid, selectedType);
        return result;
    }, []);

    const loginWithGoogle = useCallback(async (selectedType) => {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const userDoc = await getDoc(doc(db, "users", result.user.uid));

        if (!userDoc.exists()) {
            const photoVal = result.user.photoURL || "";
            const userData = {
                roles: [selectedType],
                displayName: result.user.displayName,
                email: result.user.email,
                photoURL: photoVal,
                createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, "users", result.user.uid), userData);

            if (selectedType === "student") {
                await setDoc(doc(db, "students", result.user.uid), {
                    university: "",
                    department: "",
                    gpa: "",
                    skills: [],
                    bio: "",
                    cvUrl: "",
                    photoUrl: photoVal,
                    appliedJobs: [],
                });
            } else {
                await setDoc(doc(db, "companies", result.user.uid), {
                    companyName: result.user.displayName,
                    sector: "",
                    website: "",
                    description: "",
                    logoUrl: photoVal,
                    verified: false,
                });
            }
        } else {
            // User exists, check if role exists
            const data = userDoc.data();
            
            // Check if photoURL update is needed from Google Login
            const photoVal = result.user.photoURL || "";
            if (photoVal && !data.photoURL) {
                 await updateDoc(doc(db, "users", result.user.uid), { photoURL: photoVal });
                 
                 // Also Update the role specific if the role already existed
                 if (data.roles?.includes(selectedType)) {
                     const roleCollection = selectedType === "student" ? "students" : "companies";
                     const propName = selectedType === "student" ? "photoUrl" : "logoUrl";
                     const currentRoleDoc = await getDoc(doc(db, roleCollection, result.user.uid));
                     if(currentRoleDoc.exists() && !currentRoleDoc.data()[propName]){
                         await updateDoc(doc(db, roleCollection, result.user.uid), { [propName]: photoVal });
                     }
                 }
            }

            if (!data.roles?.includes(selectedType)) {
                // Add new role to existing user
                await updateDoc(doc(db, "users", result.user.uid), {
                    roles: arrayUnion(selectedType)
                });

                // Create role specific profile if not exists
                const roleDoc = await getDoc(doc(db, selectedType === "student" ? "students" : "companies", result.user.uid));
                if (!roleDoc.exists()) {
                    if (selectedType === "student") {
                        await setDoc(doc(db, "students", result.user.uid), {
                            university: "", department: "", gpa: "", skills: [], bio: "", cvUrl: "", photoUrl: photoVal, appliedJobs: []
                        });
                    } else {
                        await setDoc(doc(db, "companies", result.user.uid), {
                            companyName: data.displayName, sector: "", website: "", description: "", logoUrl: photoVal, verified: false
                        });
                    }
                }
            }
        }

        await loadUserProfile(result.user.uid, selectedType);
        return result;
    }, []);


    const loadUserProfile = useCallback(async (uid, type) => {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const roleCollection = type === "student" ? "students" : "companies";
            const roleDoc = await getDoc(doc(db, roleCollection, uid));
            
            // Firestore tabanlı admin kontrolü
            const adminStatus = await checkIsAdmin(uid);

            setUserProfile({
                ...userData,
                type, // Currently active role
                isAdmin: adminStatus,
                profileData: roleDoc.exists() ? roleDoc.data() : null
            });

            // Persist role choice for session
            localStorage.setItem("activeRole", type);
        }
    }, [checkIsAdmin]);

    const logout = useCallback(() => {
        localStorage.removeItem("activeRole");
        return signOut(auth);
    }, []);

    const updateDisplayName = useCallback(async (newName) => {
        if (!currentUser) return;
        await updateProfile(auth.currentUser, { displayName: newName });
        await updateDoc(doc(db, "users", currentUser.uid), { displayName: newName });
        setCurrentUser({ ...auth.currentUser });
    }, [currentUser]);

    const reloadUser = useCallback(async () => {
        if (auth.currentUser) {
            await auth.currentUser.reload();
            const isVerified = auth.currentUser.emailVerified;
            setCurrentUser({ ...auth.currentUser });
            return isVerified;
        }
        return false;
    }, []);

    const resetPassword = useCallback((email) => {
        const currentOrigin = window.location.origin;

        return sendPasswordResetEmail(auth, email, {
            url: `${currentOrigin}/auth/action`,
            handleCodeInApp: true
        });
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            try {
                setCurrentUser(user);
                if (user) {
                    const storedRole = localStorage.getItem("activeRole");
                    if (storedRole) {
                        await loadUserProfile(user.uid, storedRole);
                    } else {
                        // Fallback to first role if none stored
                        const userDoc = await getDoc(doc(db, "users", user.uid));
                        if (userDoc.exists()) {
                            const data = userDoc.data();
                            const initialRole = data.roles?.[0] || 'student';
                            await loadUserProfile(user.uid, initialRole);
                        }
                    }
                } else {
                    setUserProfile(null);
                }
            } catch (err) {
                console.error("Auth state change error:", err);
            } finally {
                setLoading(false);
            }
        });
        return unsubscribe;
    }, [loadUserProfile]);

    // useMemo ile context value optimizasyonu — gereksiz re-render'ları önler
    const value = useMemo(() => ({
        currentUser,
        userProfile,
        isAdmin: userProfile?.isAdmin || false,
        systemSettings,
        register,
        login,
        loginWithGoogle,
        logout,
        resetPassword,
        updateDisplayName,
        reloadUser,
    }), [currentUser, userProfile, systemSettings, register, login, loginWithGoogle, logout, resetPassword, updateDisplayName, reloadUser]);

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
