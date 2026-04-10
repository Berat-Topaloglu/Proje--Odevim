import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, addDoc } from "firebase/firestore";
import { updateProfile, updatePassword } from "firebase/auth";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { getDownloadCvUrl } from "../../utils/file_utils";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { useValidation } from "../../hooks/useValidation";
import "./StudentProfile.css";

export default function StudentProfile() {
    const { id: paramId } = useParams();
    const { currentUser, userProfile, updateDisplayName, logout } = useAuth();
    const { showConfirm } = useNotification();
    
    const effectiveId = paramId || currentUser?.uid;
    const isOwnProfile = !paramId || paramId === currentUser?.uid;

    const [profile, setProfile] = useState({
        university: "", department: "", gpa: "", bio: "", skills: [], cvUrl: "",
        displayName: currentUser?.displayName || ""
    });
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploadingCV, setUploadingCV] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [skillInput, setSkillInput] = useState("");
    const [reviews, setReviews] = useState([]);
    const [availableSkills, setAvailableSkills] = useState([]);
    const [newPassword, setNewPassword] = useState("");
    const [settingPassword, setSettingPassword] = useState(false);
    const [passwordSuccessModal, setPasswordSuccessModal] = useState(false);
    const isGoogleSignIn = currentUser?.providerData?.some(provider => provider.providerId === 'google.com');
    const hasPassword = currentUser?.providerData?.some(provider => provider.providerId === 'password');
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [ratingValue, setRatingValue] = useState(5);
    const [ratingComment, setRatingComment] = useState("");
    const [submittingRating, setSubmittingRating] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reporting, setReporting] = useState(false);
    const [authErrorModal, setAuthErrorModal] = useState(false);

    const { 
        loading: saving, 
        setLoading: setSaving, 
        error, 
        setError, 
        modalError, 
        setModalError, 
        success, 
        setSuccess, 
        clearStatus 
    } = useValidation();

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
                        ...prev,
                        ...data,
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

                setReviews(reviewData.sort((a, b) => {
                    const getMs = (val) => {
                        if (!val) return 0;
                        if (val.toMillis) return val.toMillis();
                        const d = new Date(val).getTime();
                        return isNaN(d) ? 0 : d;
                    };
                    return getMs(b.createdAt) - getMs(a.createdAt);
                }));
            } catch (err) { console.error(err); }
            setLoading(false);
        };
        fetchData();
        return () => stopCamera();
    }, [effectiveId, currentUser]);

    const handleCompanyRating = async () => {
        if (!currentUser || userProfile?.type !== "company") return;
        setSubmittingRating(true);
        clearStatus();
        try {
            const reviewId = `${currentUser.uid}_${effectiveId}`;
            const reviewRef = doc(db, "reviews", reviewId);
            const reviewData = {
                fromId: currentUser.uid,
                toId: effectiveId,
                rating: ratingValue,
                comment: ratingComment,
                jobTitle: "Şirket Değerlendirmesi",
                createdAt: new Date().toISOString()
            };
            const snap = await getDoc(reviewRef);
            if (snap.exists()) {
                await updateDoc(reviewRef, { rating: ratingValue, comment: ratingComment, updatedAt: new Date().toISOString() });
            } else {
                await setDoc(reviewRef, reviewData);
            }
            setSuccess("Değerlendirmeniz başarıyla kaydedildi! ⭐");
            setRatingComment("");
            const q = query(collection(db, "reviews"), where("toId", "==", effectiveId));
            const reviewSnap = await getDocs(q);
            setReviews(reviewSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            setError("Değerlendirme gönderilirken bir hata oluştu.");
        }
        setSubmittingRating(false);
    };

    const handleSave = async () => {
        if (!isOwnProfile) return;
        setSaving(true);
        clearStatus();
        try {
            if (profile.displayName !== currentUser.displayName) {
                await updateDisplayName(profile.displayName);
            } else {
                await updateDoc(doc(db, "users", currentUser.uid), { displayName: profile.displayName, email: profile.email || currentUser.email });
            }
            const cleanProfile = Object.entries(profile).reduce((acc, [key, value]) => {
                if (value !== undefined) acc[key] = value;
                return acc;
            }, {});
            await setDoc(doc(db, "students", currentUser.uid), { ...cleanProfile, updatedAt: serverTimestamp() }, { merge: true });
            setProfile(prev => ({ ...prev, ...profile }));
            setEditMode(false);
            setSuccess("Profil güncellendi! ✅");
        } catch (err) {
            setError("Profil kaydedilirken bir hata oluştu.");
        }
        setSaving(false);
    };

    const handleSetPassword = async () => {
        if (newPassword.length < 6) return;
        setSettingPassword(true);
        clearStatus();
        try {
            await updatePassword(currentUser, newPassword);
            setNewPassword("");
            setPasswordSuccessModal(true);
        } catch (err) {
            if (err.code === "auth/requires-recent-login") {
                setAuthErrorModal(true);
            } else {
                setError("Şifre belirlenirken bir hata oluştu.");
            }
        }
        setSettingPassword(false);
    };

    const handlePhotoUpload = async (e) => {
        const file = e instanceof File ? e : e.target.files[0];
        if (!file) return;
        setUploadingPhoto(true);
        clearStatus();
        try {
            const url = await uploadToCloudinary(file);
            setProfile((p) => ({ ...p, photoUrl: url }));
            await setDoc(doc(db, "students", currentUser.uid), { photoUrl: url }, { merge: true });
            await updateDoc(doc(db, "users", currentUser.uid), { photoUrl: url });
            try { await updateProfile(currentUser, { photoURL: url }); } catch (e) { }
            setSuccess("Profil fotoğrafı güncellendi! ✅");
            setShowPhotoModal(false);
            setPreviewPhoto(null);
        } catch (err) {
            setError("Fotoğraf yüklenirken bir hata oluştu.");
        }
        setUploadingPhoto(false);
    };

    const startCamera = async () => {
        setIsCameraActive(true);
        setPreviewPhoto(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            setError("Kameraya erişilemedi.");
            setIsCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => { track.stop(); track.enabled = false; });
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
            setPreviewPhoto(canvas.toDataURL("image/jpeg"));
            stopCamera();
        }
    };

    const saveCapturedPhoto = () => {
        if (previewPhoto) {
            fetch(previewPhoto).then(res => res.blob()).then(blob => {
                const file = new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
                handlePhotoUpload(file);
            });
        }
    };

    const retakePhoto = () => { setPreviewPhoto(null); startCamera(); };

    const handleCVUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.type !== "application/pdf") { setError("Lütfen sadece PDF formatında bir dosya yükleyin."); return; }
        if (file.size > 800 * 1024) { setError("CV dosyası çok büyük (Maksimum 800KB)."); return; }
        setUploadingCV(true);
        clearStatus();
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const base64String = reader.result;
                await updateDoc(doc(db, "students", currentUser.uid), { cvUrl: base64String });
                setProfile(p => ({ ...p, cvUrl: base64String }));
                setSuccess("CV başarıyla kaydedildi. ✅");
            } catch (err) { setError("CV kaydedilirken bir hata oluştu."); }
            setUploadingCV(false);
        };
        reader.readAsDataURL(file);
    };

    const handleDeleteCV = async () => {
        const confirmed = await showConfirm("CV'nizi silmek istediğinizden emin misiniz?", "CV Silme", "warning");
        if (!confirmed) return;
        try {
            await updateDoc(doc(db, "students", currentUser.uid), { cvUrl: "" });
            setProfile(p => ({ ...p, cvUrl: "" }));
            setSuccess("CV başarıyla silindi! ✅");
        } catch (err) { console.error(err); }
    };

    const handleViewCV = () => {
        if (!profile.cvUrl) return;
        try {
            if (profile.cvUrl.startsWith('http')) { window.open(profile.cvUrl, '_blank'); return; }
            const parts = profile.cvUrl.split(',');
            const byteString = atob(parts[1]);
            const mimeString = parts[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
            const blob = new Blob([ab], { type: mimeString });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        } catch (err) { setError("PDF görüntülenirken bir hata oluştu."); }
    };

    const toggleSkill = (skill) => {
        setProfile((p) => {
            const currentSkills = p.skills || [];
            return { ...p, skills: currentSkills.includes(skill) ? currentSkills.filter((s) => s !== skill) : [...currentSkills, skill] };
        });
    };

    const addCustomSkill = () => {
        const s = skillInput.trim();
        const currentSkills = profile.skills || [];
        if (s && !currentSkills.includes(s)) {
            setProfile((p) => ({ ...p, skills: [...(p.skills || []), s] }));
            setSkillInput("");
        }
    };

    const suggestSkills = (dept) => {
        const mapping = {
            "bilgisayar": ["JavaScript", "React", "Node.js", "SQL", "Git", "Python", "Java", "C#", "C++", "Docker", "AWS", "TypeScript"],
            "yazılım": ["JavaScript", "React", "Node.js", "SQL", "Git", "Java", "C#", "Python", "Docker"],
            "endüstri": ["SQL", "Python", "Data Analysis", "Excel", "Optimizasyon", "ERP", "SAP"],
            "elektrik": ["C++", "Python", "MATLAB", "Embedded Systems", "PLC", "Devre Tasarımı"],
            "makine": ["AutoCAD", "SolidWorks", "Python", "Termodinamik", "CAD/CAM", "ANSYS"],
            "inşaat": ["AutoCAD", "Revit", "SAP2000", "ETABS", "Civil 3D"],
            "mimarlık": ["AutoCAD", "Revit", "SketchUp", "3ds Max", "Lumion", "Photoshop"],
            "ekonomi": ["Finansal Analiz", "Muhasebe", "Risk Yönetimi", "Bütçeleme", "Excel", "Ekonometri"],
            "işletme": ["Proje Yönetimi", "Liderlik", "Pazarlama", "Muhasebe", "Excel", "Finans"],
            "psikoloji": ["Klinik Gözlem", "Görüşme Teknikleri", "Araştırma Yöntemleri", "İstatistik (SPSS)"],
            "hukuk": ["Mevzuat Bilgisi", "Dava Takibi", "Sözleşme Hazırlama", "Araştırma", "Müzakere"]
        };
        const lowerDept = (dept || "").toLowerCase().trim();
        if (!lowerDept) { setAvailableSkills([]); return; }
        let foundSkills = [];
        Object.keys(mapping).forEach(key => { if (lowerDept.includes(key)) foundSkills = [...foundSkills, ...mapping[key]]; });
        setAvailableSkills(foundSkills.length > 0 ? Array.from(new Set(foundSkills)) : []);
    };

    const initials = (profile.displayName || profile.email || "?").split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2);

    if (loading) return <div className="page-wrapper"><div className="content-wrapper" style={{ maxWidth: 700 }}><div className="skeleton" style={{ height: 300, borderRadius: 16 }} /></div></div>;

    return (
        <div className="page-wrapper">
            <div className="content-wrapper page-enter" style={{ maxWidth: 750 }}>
                {success && <div className="alert alert-success mb-16">{success}</div>}
                {error && <div className="alert alert-danger mb-16">{error}</div>}

                <div className="profile-header card">
                    <div className="profile-avatar-container">
                        <div className="avatar avatar-xl profile-avatar" onClick={() => isOwnProfile && setShowPhotoModal(true)} style={{ cursor: isOwnProfile ? "pointer" : "default" }}>
                            {(profile.photoUrl || (isOwnProfile && currentUser?.photoURL)) ? (
                                <img src={profile.photoUrl || (isOwnProfile && currentUser?.photoURL)} alt="Profil" className="avatar-img" />
                            ) : initials}
                        </div>
                        {isOwnProfile && (
                            <button className="photo-upload-badge" title="Fotoğraf Değiştir" onClick={() => setShowPhotoModal(true)}>📷</button>
                        )}
                    </div>
                    <div className="profile-header-info">
                        <h1 className="profile-name">{profile.displayName || "İsimsiz Öğrenci"}</h1>
                        <p className="profile-email">{profile.email || "E-posta belirtilmedi"}</p>
                        <span className="badge badge-primary">🎓 Öğrenci</span>
                    </div>
                    {isOwnProfile && !editMode && <button className="btn btn-secondary" onClick={() => setEditMode(true)}>✏️ Düzenle</button>}
                </div>

                <div className="card mt-24">
                    <div className="section-header-profile"><h2 className="section-title2">👤 Kişisel Bilgiler</h2></div>
                    {editMode ? (
                        <div className="profile-form">
                            <div className="form-group">
                                <label className="form-label">Ad Soyad</label>
                                <input className="form-input" value={profile.displayName} onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Üniversite</label>
                                <input className="form-input" value={profile.university} onChange={e => setProfile(p => ({ ...p, university: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Bölüm</label>
                                <input className="form-input" value={profile.department || ""} onChange={e => { const val = e.target.value; setProfile(p => ({ ...p, department: val })); suggestSkills(val); }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">GPA</label>
                                <input className="form-input" value={profile.gpa} onChange={e => setProfile(p => ({ ...p, gpa: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Hakkımda</label>
                                <textarea className="form-textarea" value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} rows={4} />
                            </div>
                        </div>
                    ) : (
                        <div className="profile-info-grid">
                            <InfoItem icon="🏫" label="Üniversite" value={profile.university || "—"} />
                            <InfoItem icon="📚" label="Bölüm" value={profile.department || "—"} />
                            <InfoItem icon="📊" label="GPA" value={profile.gpa || "—"} />
                            <InfoItem icon="📝" label="Hakkımda" value={profile.bio || "—"} wide />
                        </div>
                    )}
                </div>

                <div className="card mt-24">
                    <h2 className="section-title2">🛠️ Beceriler</h2>
                    {editMode ? (
                        <>
                            <div className="skills-grid">
                                {availableSkills.map((s) => (
                                    <button key={s} onClick={() => toggleSkill(s)} className={`skill-chip ${(profile.skills || []).includes(s) ? "selected" : ""}`} type="button">{s}</button>
                                ))}
                            </div>
                            <div className="custom-skill-row">
                                <input className="form-input" placeholder="Özel beceri ekle..." value={skillInput} onChange={(e) => setSkillInput(e.target.value)} />
                                <button className="btn btn-secondary" onClick={addCustomSkill} type="button">Ekle</button>
                            </div>
                        </>
                    ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {(profile.skills || []).map((s) => <span key={s} className="badge badge-primary">{s}</span>)}
                        </div>
                    )}
                </div>

                <div className="card mt-24">
                    <h2 className="section-title2">📄 CV</h2>
                    <div className="cv-section">
                        {profile.cvUrl ? (
                            <div className="cv-item-box">
                                <button onClick={handleViewCV} className="cv-view-link">👁️ Görüntüle</button>
                                <a href={getDownloadCvUrl(profile.cvUrl)} download target="_blank" rel="noopener noreferrer">⬇️ İndir</a>
                                {isOwnProfile && <button className="cv-delete-btn" onClick={handleDeleteCV}>🗑️ Sil</button>}
                            </div>
                        ) : <p>Henüz CV yüklenmedi</p>}
                        {isOwnProfile && (
                            <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
                                {uploadingCV ? "Yükleniyor..." : (profile.cvUrl ? "📤 Güncelle" : "📤 CV Yükle")}
                                <input type="file" accept=".pdf" style={{ display: "none" }} onChange={handleCVUpload} disabled={uploadingCV} />
                            </label>
                        )}
                    </div>
                </div>

                {/* Photo Modal */}
                {showPhotoModal && (
                    <div className="modal-overlay" onClick={() => { stopCamera(); setPreviewPhoto(null); setShowPhotoModal(false); }}>
                        <div className="modal-content photo-modal card" onClick={e => e.stopPropagation()}>
                            <h3>Profil Fotoğrafı</h3>

                            {(!isCameraActive && !previewPhoto) ? (
                                <div className="photo-options mt-24">
                                    <label className="photo-option-btn card">
                                        <span>📁</span>
                                        <p>Dosyalarından Seç</p>
                                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
                                    </label>
                                    <button className="photo-option-btn card" onClick={startCamera}>
                                        <span>📷</span>
                                        <p>Kamera ile Çek</p>
                                    </button>
                                </div>
                            ) : (
                                <div className="camera-wrapper mt-16">
                                    <div className="camera-container">
                                        {previewPhoto ? (
                                            <img src={previewPhoto} className="photo-preview-img" alt="Önizleme" />
                                        ) : (
                                            <video ref={videoRef} autoPlay playsInline className="video-preview" />
                                        )}
                                        <canvas ref={canvasRef} style={{ display: "none" }} />

                                        {!previewPhoto && (
                                            <button className="shutter-btn" onClick={capturePhoto} title="Fotoğraf Çek">
                                                <div className="shutter-icon"></div>
                                            </button>
                                        )}
                                    </div>

                                    <div className="camera-controls mt-16">
                                        {previewPhoto ? (
                                            <div style={{ display: "flex", gap: "12px", width: "100%", flexDirection: "column" }}>
                                                <button className="btn btn-primary w-full" onClick={saveCapturedPhoto} disabled={uploadingPhoto}>
                                                    {uploadingPhoto ? "Yükleniyor..." : "✅ Profil Fotoğrafı Yap"}
                                                </button>
                                                <button className="btn btn-secondary w-full" onClick={retakePhoto}>🔄 Yeniden Çek</button>
                                            </div>
                                        ) : (
                                            <button className="btn btn-secondary w-full" onClick={() => { stopCamera(); setPreviewPhoto(null); }}>❌ Vazgeç</button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <button className="btn btn-sm btn-secondary mt-24" onClick={() => { stopCamera(); setPreviewPhoto(null); setShowPhotoModal(false); }}>Kapat</button>
                        </div>
                    </div>
                )}

                {/* Reviews */}
                <div className="card mt-24">
                    <div className="section-header-profile" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h2 className="section-title2">⭐ Değerlendirmeler</h2>
                        {reviews.length > 0 && (
                            <span className="badge badge-warning" style={{ fontSize: 16 }}>
                                ⭐️ {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)} / 5
                            </span>
                        )}
                    </div>
                    <div className="reviews-list mt-16">
                        {reviews.length === 0 ? (
                            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Henüz bir değerlendirme yapılmamış.</p>
                        ) : (
                            reviews.map((r) => (
                                <div key={r.id} className="review-item" style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                        <span style={{ fontWeight: 700, color: "var(--primary-color)" }}>{r.jobTitle || "Değerlendirme"}</span>
                                        <span style={{ color: "var(--warning)" }}>{"⭐".repeat(r.rating)}</span>
                                    </div>
                                    <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>{r.comment || "Yorum yok."}</p>
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                        {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString("tr-TR") : (r.createdAt ? new Date(r.createdAt).toLocaleDateString("tr-TR") : "—")}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Company Action: Rate Student */}
                {!isOwnProfile && userProfile?.type === "company" && (
                    <div className="card mt-24">
                        <h2 className="section-title2">⭐ Öğrenciyi Değerlendir</h2>
                        <p className="text-muted" style={{ marginBottom: 16 }}>Bu öğrencinin performansını veya profilini değerlendirin:</p>
                        <div className="rating-form">
                            <div style={{ display: "flex", justifyContent: "center", gap: "10px", fontSize: "32px", marginBottom: "16px" }}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <span 
                                        key={star} 
                                        onClick={() => setRatingValue(star)} 
                                        style={{ cursor: "pointer", color: star <= ratingValue ? "#fbbf24" : "#475569" }}
                                    >
                                        ★
                                    </span>
                                ))}
                            </div>
                            <textarea
                                className="form-textarea"
                                placeholder="Öğrenci hakkında yorumunuzu buraya yazın..."
                                value={ratingComment}
                                onChange={e => setRatingComment(e.target.value)}
                                rows={3}
                            />
                            <button 
                                className="btn btn-primary" 
                                style={{ width: "100%", marginTop: "16px" }}
                                onClick={handleCompanyRating}
                                disabled={submittingRating}
                            >
                                {submittingRating ? "Gönderiliyor..." : "Değerlendirmeyi Kaydet"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Save/Cancel */}
                {editMode && (
                    <div className="profile-actions">
                        <button className="btn btn-secondary" onClick={() => setEditMode(false)}>İptal</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? "Kaydediliyor..." : "💾 Kaydet"}
                        </button>
                    </div>
                )}

                {/* Password Setting for Google Users */}
                {isOwnProfile && isGoogleSignIn && !hasPassword && !editMode && (
                    <div className="card mt-24">
                        <h2 className="section-title2">🔒 Şifre Belirle</h2>
                        <p className="text-muted" style={{ marginBottom: 16 }}>Google hesabınızla giriş yaptığınız için hesabınıza standart bir şifre de tanımlayabilirsiniz. E-posta ve belirlediğiniz şifreyle normal giriş de yapabilirsiniz.</p>
                        <div className="profile-form" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <div className="form-group" style={{ width: "100%", maxWidth: 500 }}>
                                <input
                                    type="password"
                                    className="form-input"
                                    style={{ textAlign: "center", padding: "12px", fontSize: "16px" }}
                                    placeholder="Yeni şifrenizi girin (En az 6 hane)"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                />
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={handleSetPassword}
                                disabled={settingPassword || newPassword.length < 6}
                                style={{ marginTop: 16, padding: "12px 32px", fontSize: "15px", width: "100%", maxWidth: 500 }}
                            >
                                {settingPassword ? "Kaydediliyor..." : "Şifreyi Kaydet"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Auth Error Modal */}
                {authErrorModal && (
                    <div className="modal-overlay" onClick={() => setAuthErrorModal(false)}>
                        <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: "center", padding: "32px 24px" }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
                            <h3 style={{ marginBottom: 12, color: "var(--warning)" }}>Oturum Süresi Doldu</h3>
                            <p style={{ color: "var(--text-secondary)", marginBottom: 24, fontSize: 15, lineHeight: 1.5 }}>
                                Güvenliğiniz için şifre belirlemeden önce kimliğinizi tekrar doğrulamamız gerekiyor. Lütfen çıkış yapıp tekrar giriş yapın.
                            </p>
                            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                                <button className="btn btn-secondary" onClick={() => setAuthErrorModal(false)}>İptal</button>
                                <button className="btn btn-primary" onClick={() => { logout(); window.location.href = '/login'; }}>Yeniden Giriş Yap</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Password Success Modal - logout button */}
                {passwordSuccessModal && (
                    <div className="modal-overlay">
                        <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, textAlign: "center", padding: "40px 28px" }}>
                            <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
                            <h3 style={{ marginBottom: 12, color: "var(--success)" }}>Şifre Başarıyla Belirlendi!</h3>
                            <p style={{ color: "var(--text-secondary)", marginBottom: 28, fontSize: 15, lineHeight: 1.6 }}>
                                Şifreniz güvenli şekilde kaydedildi. Güvenliğiniz için lütfen tekrar giriş yapın.
                            </p>
                            <button
                                className="btn btn-primary"
                                style={{ width: "100%", padding: "14px", fontSize: 16 }}
                                onClick={async () => { await logout(); window.location.href = '/login'; }}
                            >
                                🚪 Çıkış Yap ve Tekrar Giriş Yap
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function InfoItem({ icon, label, value, wide }) {
    return (
        <div className={`info-item ${wide ? "wide" : ""}`}>
            <p className="info-label">{icon} {label}</p>
            <p className="info-value">{value}</p>
        </div>
    );
}
