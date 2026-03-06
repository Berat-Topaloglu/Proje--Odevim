import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import "../student/StudentProfile.css";
import "./CompanyProfile.css";

export default function CompanyProfile() {
    const { currentUser, updateDisplayName, logout } = useAuth();
    const [profile, setProfile] = useState({
        companyName: "", sector: "", website: "", description: "", logoUrl: "",
        verified: false, employeeCount: "", foundationYear: "", location: "",
        vision: "", mission: "", linkedin: "", twitter: "", instagram: "", facebook: "", youtube: "",
        displayName: currentUser?.displayName || ""
    });
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const [reviews, setReviews] = useState([]);
    
    // Auth error modal
    const [authErrorModal, setAuthErrorModal] = useState(false);

    // Password state
    const [newPassword, setNewPassword] = useState("");
    const [settingPassword, setSettingPassword] = useState(false);
    const isGoogleSignIn = currentUser?.providerData?.some(provider => provider.providerId === 'google.com');

    // Camera & Modal States
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!currentUser) return;
            try {
                const snap = await getDoc(doc(db, "companies", currentUser.uid));
                if (snap.exists()) {
                    setProfile(prev => ({ 
                        ...prev, 
                        ...snap.data(),
                        displayName: currentUser?.displayName || ""
                    }));
                }

                const q = query(
                    collection(db, "reviews"),
                    where("toId", "==", currentUser.uid)
                );
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
            } catch (err) { console.error("Profil yüklenemedi:", err); }
            setLoading(false);
        };
        fetchProfile();

        return () => stopCamera();
    }, [currentUser]);

    const handleSave = async () => {
        setSaving(true);
        try {
            if (profile.displayName !== currentUser.displayName) {
                await updateDisplayName(profile.displayName);
            }

            const { displayName, ...roleData } = profile;
            // Sync companyName with displayName for the Firestore document as well
            roleData.companyName = profile.displayName; 
            await setDoc(doc(db, "companies", currentUser.uid), roleData, { merge: true });
            
            setEditMode(false);
            setSuccess("Şirket profili güncellendi! ✅");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) { console.error("Hata:", err); }
        setSaving(false);
    };

    const handleSetPassword = async () => {
        if (newPassword.length < 6) return;
        setSettingPassword(true);
        try {
            await updatePassword(currentUser, newPassword);
            setSuccess("Şifreniz başarıyla oluşturuldu! ✅");
            setNewPassword("");
            setTimeout(() => setSuccess(""), 3000);
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

    const handleLogoUpload = async (e) => {
        const file = e instanceof File ? e : e.target.files[0];
        if (!file) return;
        setUploadingLogo(true);
        try {
            const url = await uploadToCloudinary(file);
            setProfile(p => ({ ...p, logoUrl: url }));
            await updateDoc(doc(db, "companies", currentUser.uid), { logoUrl: url });
            await updateDoc(doc(db, "users", currentUser.uid), { logoUrl: url });
            setSuccess("Logo güncellendi! ✅");
            setShowPhotoModal(false);
            setPreviewPhoto(null);
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) { 
            console.error("Logo hatası:", err);
            setError("Logo yüklenirken bir hata oluştu.");
            setTimeout(() => setError(""), 3000);
        }
        setUploadingLogo(false);
    };

    const startCamera = async () => {
        setIsCameraActive(true);
        setPreviewPhoto(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            console.error("Kamera açılamadı:", err);
            setError("Kameraya erişilemedi!");
            setIsCameraActive(false);
            setTimeout(() => setError(""), 3000);
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop());
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
            canvas.getContext("2d").drawImage(video, 0, 0);
            setPreviewPhoto(canvas.toDataURL("image/jpeg"));
            stopCamera();
        }
    };

    const saveCapturedPhoto = () => {
        if (previewPhoto) {
            fetch(previewPhoto).then(res => res.blob()).then(blob => {
                const file = new File([blob], "logo.jpg", { type: "image/jpeg" });
                handleLogoUpload(file);
            });
        }
    };

    const initials = profile.companyName?.charAt(0).toUpperCase() || "C";

    const validReviews = reviews.filter(r => r.rating);
    const avgRating = validReviews.length > 0 
        ? (validReviews.reduce((acc, curr) => acc + curr.rating, 0) / validReviews.length).toFixed(1) 
        : 0;

    if (loading) return (
        <div className="page-wrapper"><div className="content-wrapper"><div className="skeleton" style={{ height: 400, borderRadius: 16 }} /></div></div>
    );

    return (
        <div className="page-wrapper">
            <div className="content-wrapper page-enter" style={{ maxWidth: 850 }}>
                {success && <div className="alert alert-success mb-16">{success}</div>}
                {error && <div className="alert alert-error mb-16">{error}</div>}

                {/* Header Card */}
                <div className="profile-header card corporate-section-card">
                    <div className="profile-avatar-container">
                        <div className="avatar avatar-xl profile-avatar" onClick={() => setShowPhotoModal(true)} style={{ cursor: "pointer", borderRadius: "16px" }}>
                            {profile.logoUrl ? <img src={profile.logoUrl} alt="Logo" className="avatar-img" /> : initials}
                        </div>
                        <button className="photo-upload-badge" onClick={() => setShowPhotoModal(true)}>📷</button>
                    </div>
                    <div className="profile-header-info">
                        <h1 className="profile-name">{profile.displayName || profile.companyName}</h1>
                        <p className="profile-email">{currentUser?.email}</p>
                        <div className="company-badge-container">
                            <span className="badge badge-info">🏢 Kurumsal</span>
                            {profile.verified && <span className="badge badge-success">✓ Onaylı Partner</span>}
                            <span className="badge badge-primary">📍 {profile.location || "Konum Belirtilmedi"}</span>
                        </div>
                    </div>
                    {!editMode && <button className="btn btn-secondary" onClick={() => setEditMode(true)}>✏️ Profili Düzenle</button>}
                </div>

                <div className="company-stats-row mt-24">
                    <div className="company-stat-card">
                        <span className="company-stat-value">{profile.employeeCount || "—"}</span>
                        <span className="company-stat-label">Çalışan Sayısı</span>
                    </div>
                    <div className="company-stat-card">
                        <span className="company-stat-value">{profile.foundationYear || "—"}</span>
                        <span className="company-stat-label">Kuruluş Yılı</span>
                    </div>
                    <div className="company-stat-card">
                        <span className="company-stat-value" style={{ color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                            ⭐ {avgRating > 0 ? avgRating : "Yeni"}
                        </span>
                        <span className="company-stat-label">{validReviews.length} Değerlendirme</span>
                    </div>
                </div>

                {/* Main Content */}
                <div className="card mt-24">
                    <h2 className="section-title2">📋 Şirket Özeti</h2>
                    {editMode ? (
                        <div className="profile-form">
                            <div className="profile-info-grid">
                                <div className="form-group">
                                    <label className="form-label">Şirket Adı</label>
                                    <input className="form-input" value={profile.displayName} onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Sektör</label>
                                    <input className="form-input" value={profile.sector} onChange={e => setProfile(p => ({ ...p, sector: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Konum / Şehir</label>
                                    <input className="form-input" value={profile.location} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Web Sitesi</label>
                                    <input className="form-input" value={profile.website} onChange={e => setProfile(p => ({ ...p, website: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Çalışan Sayısı</label>
                                    <input className="form-input" placeholder="Örn: 10-50" value={profile.employeeCount || ""} onChange={e => setProfile(p => ({ ...p, employeeCount: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Kuruluş Yılı</label>
                                    <input type="number" className="form-input" placeholder="Örn: 2020" value={profile.foundationYear || ""} onChange={e => setProfile(p => ({ ...p, foundationYear: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Şirket Açıklaması</label>
                                <textarea className="form-textarea" rows={4} value={profile.description} onChange={e => setProfile(p => ({ ...p, description: e.target.value }))} />
                            </div>
                        </div>
                    ) : (
                        <div className="profile-info-grid">
                            <InfoItem icon="🏷️" label="Sektör" value={profile.sector || "—"} />
                            <InfoItem icon="📍" label="Konum" value={profile.location || "—"} />
                            <InfoItem icon="🔗" label="Web Sitesi" value={profile.website ? <a href={profile.website} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)' }}>{profile.website}</a> : "—"} />
                            <InfoItem icon="📝" label="Açıklama" value={profile.description || "—"} wide />
                        </div>
                    )}
                </div>

                {/* Vision & Mission */}
                <div className="card mt-24 corporate-section-card">
                    <h2 className="section-title2">🎯 Vizyon & Misyon</h2>
                    {editMode ? (
                        <div className="profile-form">
                            <div className="form-group">
                                <label className="form-label">Vizyonumuz</label>
                                <textarea className="form-textarea" rows={3} value={profile.vision} onChange={e => setProfile(p => ({ ...p, vision: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Misyonumuz</label>
                                <textarea className="form-textarea" rows={3} value={profile.mission} onChange={e => setProfile(p => ({ ...p, mission: e.target.value }))} />
                            </div>
                        </div>
                    ) : (
                        <div className="mission-mission-box">
                            <div className="mb-16">
                                <strong style={{ color: 'var(--primary-light)', display: 'block', marginBottom: '8px' }}>🌟 Vizyon</strong>
                                <p style={{ fontSize: '14px', lineHeight: '1.6' }}>{profile.vision || "Vizyon belirtilmedi."}</p>
                            </div>
                            <div>
                                <strong style={{ color: 'var(--primary-light)', display: 'block', marginBottom: '8px' }}>🚀 Misyon</strong>
                                <p style={{ fontSize: '14px', lineHeight: '1.6' }}>{profile.mission || "Misyon belirtilmedi."}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Social Media */}
                <div className="card mt-24">
                    <h2 className="section-title2">🌐 Sosyal Medya & İletişim</h2>
                    {editMode ? (
                        <div className="social-links-grid">
                            <div className="social-input-group">
                                <span className="social-icon">👔</span>
                                <input className="form-input" placeholder="LinkedIn URL" value={profile.linkedin} onChange={e => setProfile(p => ({ ...p, linkedin: e.target.value }))} />
                            </div>
                            <div className="social-input-group">
                                <span className="social-icon">🐦</span>
                                <input className="form-input" placeholder="Twitter URL" value={profile.twitter} onChange={e => setProfile(p => ({ ...p, twitter: e.target.value }))} />
                            </div>
                            <div className="social-input-group">
                                <span className="social-icon">📸</span>
                                <input className="form-input" placeholder="Instagram URL" value={profile.instagram} onChange={e => setProfile(p => ({ ...p, instagram: e.target.value }))} />
                            </div>
                            <div className="social-input-group">
                                <span className="social-icon">👥</span>
                                <input className="form-input" placeholder="Facebook URL" value={profile.facebook} onChange={e => setProfile(p => ({ ...p, facebook: e.target.value }))} />
                            </div>
                            <div className="social-input-group">
                                <span className="social-icon">🎬</span>
                                <input className="form-input" placeholder="YouTube URL" value={profile.youtube} onChange={e => setProfile(p => ({ ...p, youtube: e.target.value }))} />
                            </div>
                        </div>
                    ) : (
                        <div className="social-links-grid">
                            {profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer" className="company-stat-card" style={{ padding: '12px', textDecoration: 'none' }}>👔 LinkedIn</a>}
                            {profile.twitter && <a href={profile.twitter} target="_blank" rel="noreferrer" className="company-stat-card" style={{ padding: '12px', textDecoration: 'none' }}>🐦 Twitter / X</a>}
                            {profile.instagram && <a href={profile.instagram} target="_blank" rel="noreferrer" className="company-stat-card" style={{ padding: '12px', textDecoration: 'none' }}>📸 Instagram</a>}
                            {profile.facebook && <a href={profile.facebook} target="_blank" rel="noreferrer" className="company-stat-card" style={{ padding: '12px', textDecoration: 'none' }}>👥 Facebook</a>}
                            {profile.youtube && <a href={profile.youtube} target="_blank" rel="noreferrer" className="company-stat-card" style={{ padding: '12px', textDecoration: 'none' }}>🎬 YouTube</a>}
                            {!profile.linkedin && !profile.twitter && !profile.instagram && !profile.facebook && !profile.youtube && <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Sosyal medya bağlantısı eklenmedi.</p>}
                        </div>
                    )}
                </div>

                {/* Photo Modal */}
                {showPhotoModal && (
                    <div className="modal-overlay" onClick={() => { stopCamera(); setPreviewPhoto(null); setShowPhotoModal(false); }}>
                        <div className="modal-content photo-modal company-modal card" onClick={e => e.stopPropagation()}>
                            <h3>Şirket Logosu</h3>
                            {(!isCameraActive && !previewPhoto) ? (
                                <div className="photo-options mt-24">
                                    <label className="photo-option-btn card"><span>📁</span><p>Logoyu Yükle</p><input type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} /></label>
                                    <button className="photo-option-btn card" onClick={startCamera}><span>📷</span><p>Tabela/Ofis Çek</p></button>
                                </div>
                            ) : (
                                <div className="camera-wrapper mt-16">
                                    <div className="camera-container">
                                        {previewPhoto ? <img src={previewPhoto} className="photo-preview-img" alt="Önizleme" /> : <video ref={videoRef} autoPlay playsInline className="video-preview" />}
                                        <canvas ref={canvasRef} style={{ display: "none" }} />
                                        {!previewPhoto && <button className="shutter-btn" onClick={capturePhoto}><div className="shutter-icon"></div></button>}
                                    </div>
                                    <div className="camera-controls mt-16">
                                        {previewPhoto ? (
                                            <div style={{ display: "flex", gap: "12px", width: "100%", flexDirection: "column" }}>
                                                <button className="btn btn-primary w-full" onClick={saveCapturedPhoto} disabled={uploadingLogo}>{uploadingLogo ? "Yükleniyor..." : "✅ Logo Yap"}</button>
                                                <button className="btn btn-secondary w-full" onClick={() => { setPreviewPhoto(null); startCamera(); }}>🔄 Yeniden Çek</button>
                                            </div>
                                        ) : <button className="btn btn-secondary w-full" onClick={stopCamera}>❌ Vazgeç</button>}
                                    </div>
                                </div>
                            )}
                            <button className="btn btn-sm btn-secondary mt-24" onClick={() => { stopCamera(); setPreviewPhoto(null); setShowPhotoModal(false); }}>Kapat</button>
                        </div>
                    </div>
                )}

                {editMode && (
                    <div className="profile-actions">
                        <button className="btn btn-secondary" onClick={() => setEditMode(false)}>İptal</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Kaydediliyor..." : "💾 Değişiklikleri Kaydet"}</button>
                    </div>
                )}

                {/* Password Setting for Google Users */}
                {isGoogleSignIn && !editMode && (
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
