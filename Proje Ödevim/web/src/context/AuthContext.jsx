import { createContext, useContext, useEffect, useState } from "react";
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
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
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
    }

    async function login(email, password, selectedType) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, "users", result.user.uid));

        if (!userDoc.exists()) {
            throw new Error("Kullanıcı kaydı bulunamadı.");
        }

        const data = userDoc.data();
        if (!data.roles?.includes(selectedType)) {
            // If user exists but role doesn't, we might want to allow them to "link" or create new role
            throw new Error(`Bu hesapta ${selectedType === 'student' ? 'Öğrenci' : 'Şirket'} profili bulunmuyor.`);
        }

        // Set active profile and update state instantly
        setCurrentUser(result.user);
        await loadUserProfile(result.user.uid, selectedType);
        return result;
    }

    async function loginWithGoogle(selectedType) {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const userDoc = await getDoc(doc(db, "users", result.user.uid));

        if (!userDoc.exists()) {
            const userData = {
                roles: [selectedType],
                displayName: result.user.displayName,
                email: result.user.email,
                photoURL: result.user.photoURL || "",
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
                    appliedJobs: [],
                });
            } else {
                await setDoc(doc(db, "companies", result.user.uid), {
                    companyName: result.user.displayName,
                    sector: "",
                    website: "",
                    description: "",
                    logoUrl: "",
                    verified: false,
                });
            }
        } else {
            // User exists, check if role exists
            const data = userDoc.data();
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
                            university: "", department: "", gpa: "", skills: [], bio: "", cvUrl: "", appliedJobs: []
                        });
                    } else {
                        await setDoc(doc(db, "companies", result.user.uid), {
                            companyName: data.displayName, sector: "", website: "", description: "", logoUrl: "", verified: false
                        });
                    }
                }
            }
        }

        await loadUserProfile(result.user.uid, selectedType);
        return result;
    }


    async function loadUserProfile(uid, type) {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const roleCollection = type === "student" ? "students" : "companies";
            const roleDoc = await getDoc(doc(db, roleCollection, uid));
            
            setUserProfile({
                ...userData,
                type, // Currently active role
                profileData: roleDoc.exists() ? roleDoc.data() : null
            });

            // Persist role choice for session
            localStorage.setItem("activeRole", type);
        }
    }

    function logout() {
        localStorage.removeItem("activeRole");
        return signOut(auth);
    }

    async function updateDisplayName(newName) {
        if (!currentUser) return;
        await updateProfile(auth.currentUser, { displayName: newName });
        await updateDoc(doc(db, "users", currentUser.uid), { displayName: newName });
        // Update local state if needed, though onAuthStateChanged might pick it up
        setCurrentUser({ ...auth.currentUser });
    }

    async function reloadUser() {
        if (auth.currentUser) {
            await auth.currentUser.reload();
            const isVerified = auth.currentUser.emailVerified;
            setCurrentUser({ ...auth.currentUser });
            return isVerified;
        }
        return false;
    }

    function resetPassword(email) {
        const currentOrigin = window.location.origin;

        return sendPasswordResetEmail(auth, email, {
            url: `${currentOrigin}/auth/action`,
            handleCodeInApp: true
        });
    }

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
    }, []);

    const value = {
        currentUser,
        userProfile,
        register,
        login,
        loginWithGoogle,
        logout,
        resetPassword,
        updateDisplayName,
        reloadUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
