import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, addDoc } from "firebase/firestore";
import { updateProfile, updatePassword } from "firebase/auth";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { sortByDateDesc } from "../../utils/helpers";

// Sub-components
import ProfileHeader from "./components/ProfileHeader";
import ProfileInfo from "./components/ProfileInfo";
import ProfileSkills from "./components/ProfileSkills";
import ProfileCV from "./components/ProfileCV";
import PhotoModal from "./components/PhotoModal";
import ProfileReviews from "./components/ProfileReviews";
import ProfileSettings from "./components/ProfileSettings";
import "./StudentProfile.css";

// Bölüm → beceri eşleştirme haritası
import { SKILLS_MAPPING } from "./skillsMapping";

export default function StudentProfile() {
    const { id: paramId } = useParams();
    const { currentUser, userProfile, updateDisplayName, logout } = useAuth();
    const { showConfirm } = useNotification();

    // Determine whose profile to show
    const effectiveId = paramId || currentUser?.uid;
    const isOwnProfile = !paramId || paramId === currentUser?.uid;

    const [profile, setProfile] = useState({
        university: "", department: "", gpa: "", bio: "", skills: [], cvUrl: "",
        displayName: currentUser?.displayName || ""
    });
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingCV, setUploadingCV] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const [reviews, setReviews] = useState([]);
    const [availableSkills, setAvailableSkills] = useState([]);
    const [showPhotoModal, setShowPhotoModal] = useState(false);

    // Password state
    const [newPassword, setNewPassword] = useState("");
    const [settingPassword, setSettingPassword] = useState(false);
    const [authErrorModal, setAuthErrorModal] = useState(false);
    const [passwordSuccessModal, setPasswordSuccessModal] = useState(false);
    const isGoogleSignIn = currentUser?.providerData?.some(provider => provider.providerId === 'google.com');
    const hasPassword = currentUser?.providerData?.some(provider => provider.providerId === 'password');

    // Report state
    const [reportModal, setReportModal] = useState({ show: false, studentId: "", studentName: "" });
    const [reportReason, setReportReason] = useState("");
    const [reporting, setReporting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!effectiveId) return;
            try {
                const uDoc = await getDoc(doc(db, "users", effectiveId));
                let userData = {};
                if (uDoc.exists()) userData = uDoc.data();

                const snap = await getDoc(doc(db, "students", effectiveId));
                if (snap.exists()) {
                    const data = snap.data();
                    setProfile(prev => ({
                        ...prev, ...data,
                        email: userData.email || data.email || "",
                        displayName: userData.displayName || data.displayName || prev.displayName,
                        skills: data.skills || [],
                        photoUrl: data.photoUrl || userData.photoUrl || userData.photoURL || prev.photoUrl
                    }));
                } else if (uDoc.exists()) {
                    setProfile(prev => ({
                        ...prev,
                        email: userData.email || "",
                        displayName: userData.displayName || prev.displayName,
                        photoUrl: userData.photoUrl || userData.photoURL || prev.photoUrl
                    }));
                }

                const q = query(collection(db, "reviews"), where("toId", "==", effectiveId));
                const reviewSnap = await getDocs(q);
                const reviewData = reviewSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setReviews(reviewData.sort(sortByDateDesc));
            } catch (err) { console.error(err); }
            setLoading(false);
        };
        fetchData();
    }, [effectiveId, currentUser]);

    const suggestSkills = (dept) => {
        const lowerDept = (dept || "").toLowerCase().trim();
        if (!lowerDept) { setAvailableSkills([]); return; }
        let foundSkills = [];
        Object.keys(SKILLS_MAPPING).forEach(key => {
            if (lowerDept.includes(key)) {
                foundSkills = [...foundSkills, ...SKILLS_MAPPING[key]];
            }
        });
        setAvailableSkills(foundSkills.length > 0 ? Array.from(new Set(foundSkills)) : []);
    };

    const handleSave = async () => {
        if (!isOwnProfile) return;
        setSaving(true);
        try {
            if (profile.displayName !== currentUser.displayName) {
                await updateDisplayName(profile.displayName);
            }
            const { displayName, email, ...roleData } = profile;
            await setDoc(doc(db, "students", currentUser.uid), roleData, { merge: true });
            setEditMode(false);
            setSuccess("Profil güncellendi! ✅");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) { console.error(err); }
        setSaving(false);
    };

    const handleSetPassword = async () => {
        if (newPassword.length < 6) return;
        setSettingPassword(true);
        try {
            await updatePassword(currentUser, newPassword);
            setNewPassword("");
            setPasswordSuccessModal(true);
        } catch (err) {
            if (err.code === "auth/requires-recent-login") {
                setAuthErrorModal(true);
            } else {
                setError("Şifre belirlenirken bir hata oluştu.");
                setTimeout(() => setError(""), 3000);
            }
        }
        setSettingPassword(false);
    };

    const handlePhotoUpload = async (e) => {
        const file = e instanceof File ? e : e.target.files[0];
        if (!file) return;
        setUploadingPhoto(true);
        try {
            const url = await uploadToCloudinary(file);
            setProfile((p) => ({ ...p, photoUrl: url }));
            await setDoc(doc(db, "students", currentUser.uid), { photoUrl: url }, { merge: true });
            await updateDoc(doc(db, "users", currentUser.uid), { photoUrl: url });
            try { await updateProfile(currentUser, { photoURL: url }); } catch (e) { }
            setSuccess("Profil fotoğrafı güncellendi! ✅");
            setShowPhotoModal(false);
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Fotoğraf yüklenemedi:", err);
            setError("Fotoğraf yüklenirken bir hata oluştu.");
            setTimeout(() => setError(""), 3000);
        }
        setUploadingPhoto(false);
    };

    const handleCVUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingCV(true);
        try {
            const url = await uploadToCloudinary(file);
            setProfile((p) => ({ ...p, cvUrl: url }));
            await setDoc(doc(db, "students", currentUser.uid), { cvUrl: url }, { merge: true });
            setSuccess("CV yüklendi! ✅");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("CV yüklenemedi:", err);
            setError("Dosya yüklenirken bir hata oluştu.");
            setTimeout(() => setError(""), 3000);
        }
        setUploadingCV(false);
    };

    const handleDeleteCV = async () => {
        const confirmed = await showConfirm("CV'nizi silmek istediğinizden emin misiniz?", "CV Silme Onayı");
        if (!confirmed) return;
        try {
            await updateDoc(doc(db, "students", currentUser.uid), { cvUrl: "" });
            setProfile(p => ({ ...p, cvUrl: "" }));
            setSuccess("CV başarıyla silindi! ✅");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) { console.error("CV silinemedi:", err); }
    };

    const handleCompanyRating = async (ratingValue, ratingComment) => {
        if (!currentUser || userProfile?.type !== "company") return;
        setError("");
        setSuccess("");
        try {
            const reviewId = `${currentUser.uid}_${effectiveId}`;
            const reviewRef = doc(db, "reviews", reviewId);
            const reviewData = {
                fromId: currentUser.uid, toId: effectiveId,
                rating: ratingValue, comment: ratingComment,
                jobTitle: "Şirket Değerlendirmesi", createdAt: new Date().toISOString()
            };
            const snap = await getDoc(reviewRef);
            if (snap.exists()) {
                await updateDoc(reviewRef, { rating: ratingValue, comment: ratingComment, updatedAt: new Date().toISOString() });
            } else {
                await setDoc(reviewRef, reviewData);
            }
            setSuccess("Değerlendirmeniz başarıyla kaydedildi! ⭐");
            const q = query(collection(db, "reviews"), where("toId", "==", effectiveId));
            const reviewSnap = await getDocs(q);
            setReviews(reviewSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortByDateDesc));
        } catch (err) {
            console.error("Rating error:", err);
            setError("Değerlendirme gönderilirken bir hata oluştu.");
        }
    };

    const handleReportSubmit = async () => {
        if (!reportReason.trim() || !currentUser) return;
        setReporting(true);
        try {
            await addDoc(collection(db, "reports"), {
                reporterId: currentUser.uid,
                reporterName: userProfile?.displayName || "Bir Şirket",
                targetId: effectiveId, targetName: profile.displayName,
                reason: reportReason, status: "pending", createdAt: serverTimestamp()
            });
            await addDoc(collection(db, `notifications/${currentUser.uid}/items`), {
                type: "system",
                message: `${profile.displayName} hakkındaki ihbarınız merkeze iletildi. Gereği yapılacaktır.`,
                read: false, createdAt: serverTimestamp()
            });
            setReportModal({ show: false, studentId: "", studentName: "" });
            setReportReason("");
            setSuccess("İhbarınız başarıyla merkeze iletildi! 🛡️");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Report error:", err);
            setError("İhbar iletilemedi.");
        }
        setReporting(false);
    };

    if (loading) return <div className="page-wrapper"><div className="loader">Veriler senkronize ediliyor...</div></div>;

    return (
        <div className="page-wrapper profile-page-wrapper page-enter">
            {/* OMEGA AURORA HERO */}
            <div className="profile-hero-section">
                {success && <div className="alert-omega alert-success-omega">{success}</div>}
                {error && <div className="alert-omega alert-danger-omega">{error}</div>}

                <ProfileHeader
                    profile={profile} currentUser={currentUser} isOwnProfile={isOwnProfile}
                    editMode={editMode} setEditMode={setEditMode} setShowPhotoModal={setShowPhotoModal}
                />
            </div>

            {/* OMEGA BENTO GRID */}
            <div className="profile-bento-grid">
                {/* Column 1: Info & CV */}
                <div className="bento-column">
                    <ProfileInfo
                        profile={profile} setProfile={setProfile}
                        editMode={editMode} suggestSkills={suggestSkills}
                    />

                    <ProfileCV
                        profile={profile} setProfile={setProfile} isOwnProfile={isOwnProfile}
                        uploadingCV={uploadingCV} handleCVUpload={handleCVUpload}
                        handleDeleteCV={handleDeleteCV}
                    />
                </div>

                {/* Column 2: Skills & Heatmap (Wide/Center) */}
                <div className="bento-column" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <ProfileSkills
                        profile={profile} setProfile={setProfile}
                        editMode={editMode} availableSkills={availableSkills}
                    />
                </div>

                {/* Column 3: Stats & Reviews */}
                <div className="bento-column">
                    <ProfileReviews
                        reviews={reviews} effectiveId={effectiveId} isOwnProfile={isOwnProfile}
                        userProfile={userProfile} currentUser={currentUser}
                        onRatingSubmit={handleCompanyRating}
                        reportModal={reportModal} setReportModal={setReportModal}
                        reportReason={reportReason} setReportReason={setReportReason}
                        onReportSubmit={handleReportSubmit} reporting={reporting}
                    />
                </div>
            </div>

            {/* OMEGA ACTIONS */}
            <div className="profile-footer-omega">
                {editMode && (
                    <div style={{ marginBottom: 40, display: 'flex', gap: 16 }}>
                        <button className="btn btn-secondary" onClick={() => setEditMode(false)} style={{ flex: 1, borderRadius: 20 }}>Vazgeç</button>
                        <button className="btn-save-omega" onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
                            {saving ? "Kod İşleniyor..." : "PROTOKOLÜ KAYDET"}
                        </button>
                    </div>
                )}

                <ProfileSettings
                    isOwnProfile={isOwnProfile} editMode={editMode}
                    isGoogleSignIn={isGoogleSignIn} hasPassword={hasPassword}
                    newPassword={newPassword} setNewPassword={setNewPassword}
                    handleSetPassword={handleSetPassword} settingPassword={settingPassword}
                    authErrorModal={authErrorModal} setAuthErrorModal={setAuthErrorModal}
                    passwordSuccessModal={passwordSuccessModal} logout={logout}
                />
            </div>

            {/* Fotoğraf Modalı */}
            <PhotoModal
                show={showPhotoModal} onClose={() => setShowPhotoModal(false)}
                handlePhotoUpload={handlePhotoUpload} uploadingPhoto={uploadingPhoto}
            />
        </div>
    );
}

