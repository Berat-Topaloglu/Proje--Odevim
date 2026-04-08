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
import { doc, setDoc, getDoc, updateDoc, arrayUnion, onSnapshot, collection, query, where, getDocs, deleteDoc, serverTimestamp } from "firebase/firestore";
import emailjs from '@emailjs/browser';
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

    async function register(email, password, displayName, userType) {
        // Shadow-Vault Check
        const archiveRef = doc(db, "deletedAccounts", email);
        const archiveSnap = await getDoc(archiveRef);
        
        if (archiveSnap.exists()) {
            const data = archiveSnap.data();
            const oldRoles = data.oldRoles || [];
            const deletedAt = data.deletedAt?.toDate();
            const now = new Date();
            const diffDays = deletedAt ? Math.floor((now - deletedAt) / (1000 * 60 * 60 * 24)) : 999;

            if (!oldRoles.includes(userType)) {
                // Different role: Clear archive and start fresh
                await deleteDoc(archiveRef);
            } else if (diffDays > 30) {
                // Role same but expired (>30 days): Clear archive and start fresh
                await deleteDoc(archiveRef);
            } else {
                // Role same and within 30 days: Request Restoration
                const tempResult = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(tempResult.user, { displayName });
                
                await setDoc(doc(db, "restorationRequests", tempResult.user.uid), {
                    email,
                    displayName,
                    newUid: tempResult.user.uid,
                    requestedAt: serverTimestamp(),
                    status: "pending"
                });

                // Notify admin via EmailJS
                try {
                    await emailjs.send("service_wupm5uc", "template_kvsc4vm", {
                        to_email: "berattopaloglu61@gmail.com", // Founders email
                        to_name: "Kurucu",
                        message: `DİKKAT: ${email} adresli eski bir kullanıcı (${userType}) tekrar kayıt oldu ve hesap geri yükleme talebi oluşturdu. Onayınız bekleniyor.`
                    }, "NPz_h8os1UzhSm7Q2");
                } catch (e) { console.error("Admin notify error:", e); }

                await signOut(auth); // Sign them back out until approved
                throw new Error("Eski bir kaydınız bulundu. Hesabınızın geri yüklenmesi için yöneticiye onay talebi gönderildi. Lütfen onay bekleyin.");
            }
        }

        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });

        // Base user data
        const userData = {
            roles: [userType],
            displayName,
            email,
            photoURL: "",
            disabled: false,
            createdAt: serverTimestamp(),
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
            // Check if it's a pending restoration
            const reqSnap = await getDoc(doc(db, "restorationRequests", result.user.uid));
            if (reqSnap.exists()) {
                await signOut(auth);
                throw new Error("Hesabınız henüz onaylanmadı. Lütfen yönetici onayını bekleyin.");
            }

            // Check if it's in the Shadow-Vault (deletedAccounts)
            const archiveSnap = await getDoc(doc(db, "deletedAccounts", email));
            if (archiveSnap.exists()) {
                const archiveData = archiveSnap.data();
                
                // Trigger restoration request automatically on login attempt
                await setDoc(doc(db, "restorationRequests", result.user.uid), {
                    email,
                    displayName: archiveData.userData.displayName || "Kullanıcı",
                    newUid: result.user.uid,
                    requestedAt: serverTimestamp(),
                    status: "pending"
                });

                // Notify admin via EmailJS
                try {
                    await emailjs.send("service_wupm5uc", "template_kvsc4vm", {
                        to_email: "berattopaloglu61@gmail.com",
                        to_name: "Kurucu",
                        message: `SİSTEM UYARISI: Arşivlenmiş bir kullanıcı (${email}) giriş yapmaya çalıştı ve otomatik Geri Yükleme Talebi oluşturuldu. Lütfen paneli kontrol edin.`
                    }, "NPz_h8os1UzhSm7Q2");
                } catch (e) { console.error("Admin notify error:", e); }

                await signOut(auth);
                throw new Error("Bu hesap daha önce silinmiş. Hesabınızın geri yüklenmesi için yöneticiye talep gönderildi. Lütfen onay bekleyin.");
            }

            throw new Error("Kullanıcı kaydı bulunamadı.");
        }

        const data = userDoc.data();
        if (data.status === "purged") {
            // It's a banished account (Shadow Deleted)
            const reqSnap = await getDoc(doc(db, "restorationRequests", result.user.uid));
            if (!reqSnap.exists()) {
                // Auto-create request if they try to login
                await setDoc(doc(db, "restorationRequests", result.user.uid), {
                    email,
                    displayName: data.displayName || "Kullanıcı",
                    newUid: result.user.uid,
                    requestedAt: serverTimestamp(),
                    status: "pending"
                });
                try {
                    await emailjs.send("service_wupm5uc", "template_kvsc4vm", {
                        to_email: "berattopaloglu61@gmail.com",
                        to_name: "Kurucu",
                        message: `SİSTEM UYARISI: Arşivlenmiş bir kullanıcı (${email}) giriş yapmaya çalıştı ve otomatik Geri Yükleme Talebi oluşturuldu.`
                    }, "NPz_h8os1UzhSm7Q2");
                } catch (e) {}
            }
            await signOut(auth);
            throw new Error("Hesabınız yönetim kurulu kararıyla siber arşive taşınmıştır. Geri yükleme talebi admin onayına sunuldu.");
        }

        if (data.disabled) {
            await signOut(auth);
            throw new Error("Hesabınız geçici olarak devre dışı bırakılmıştır. Lütfen yönetici ile iletişime geçin.");
        }

        if (!data.roles?.includes(selectedType)) {
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
                isAdmin: userData.email === "berattopaloglu61@gmail.com",
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
        let userUnsub = null;
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
                    
                    // Real-time Check: If account is completely deleted, disabled or purged (Shadow Deleted)
                    userUnsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
                        const data = docSnap.data();
                        if (!docSnap.exists() || data?.disabled || data?.status === 'purged') {
                            logout();
                            window.location.href = "/";
                        }
                    });
                } else {
                    setUserProfile(null);
                    if (userUnsub) {
                        userUnsub();
                        userUnsub = null;
                    }
                }
            } catch (err) {
                console.error("Auth state change error:", err);
            } finally {
                setLoading(false);
            }
        });
        return () => {
            unsubscribe();
            if (userUnsub) userUnsub();
        };
    }, []);

    const value = {
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
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
