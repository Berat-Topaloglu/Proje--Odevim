import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { 
    Briefcase, Building2, Globe, MapPin, Users, Calendar, 
    ShieldCheck, Linkedin, Twitter, Instagram, Facebook, Youtube,
    Edit3, Save, X, Camera, UploadCloud, Lock, Star, ChevronRight
} from "lucide-react";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
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
    const hasPassword = currentUser?.providerData?.some(provider => provider.providerId === 'password');

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
            roleData.companyName = profile.displayName; 
            await setDoc(doc(db, "companies", currentUser.uid), roleData, { merge: true });
            
            setEditMode(false);
            setSuccess("Kurumsal bilgiler güncellendi! ✅");
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

    if (loading) return <div className="page-wrapper"><div className="loader">Profil Verileri Aktarılıyor...</div></div>;

    return (
        <div className="page-wrapper company-profile-omega">
            {/* HERO SECTION - REUSED FROM STUDENT BUT CORPORATE THEMED */}
            <div className="profile-hero-section-pro">
                <div className="profile-header-card-pro" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                    <div className="avatar-wrapper-pro" style={{ position: 'relative' }}>
                        <div className="squircle-avatar-pro" style={{ width: 140, height: 140, background: 'var(--bg-card)', border: '4px solid rgba(255,255,255,0.05)', borderRadius: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {(profile.logoUrl || currentUser?.photoURL) ? (
                                <img src={profile.logoUrl || currentUser?.photoURL} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : <Building2 size={60} color="var(--primary-light)" />}
                        </div>
                        <button className="btn-icon-styled" style={{ position: 'absolute', bottom: -10, right: -10, background: 'var(--primary)', color: 'white' }} onClick={() => setShowPhotoModal(true)}>
                            <Camera size={16} />
                        </button>
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <h1 className="omega-text-gradient" style={{ fontSize: 32, fontWeight: 900, margin: 0 }}>{profile.displayName || profile.companyName}</h1>
                            {profile.verified && <ShieldCheck size={24} color="#22c55e" fill="rgba(34,197,94,0.1)" />}
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 4 }}>{currentUser?.email}</p>
                        
                        <div className="company-stats-row-omega">
                            <div className="stat-pill-omega">
                                <span className="stat-pill-label">Çalışan</span>
                                <span className="stat-pill-value">{profile.employeeCount || "—"}</span>
                            </div>
                            <div className="stat-pill-omega">
                                <span className="stat-pill-label">Kuruluş</span>
                                <span className="stat-pill-value">{profile.foundationYear || "—"}</span>
                            </div>
                            <div className="stat-pill-omega">
                                <span className="stat-pill-label">Puanlama</span>
                                <span className="stat-pill-value" style={{ color: '#fbbf24' }}>⭐ {avgRating || "YENİ"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="header-actions-pro">
                        {editMode ? (
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button className="btn-save-omega" onClick={handleSave} disabled={saving}>
                                    <Save size={18} /> {saving ? "İŞLENİYOR..." : "KAYDET"}
                                </button>
                                <button className="btn-save-omega" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }} onClick={() => setEditMode(false)}>
                                    <X size={18} /> İPTAL
                                </button>
                            </div>
                        ) : (
                            <button className="btn-save-omega" onClick={() => setEditMode(true)}>
                                <Edit3 size={18} /> PROFİLİ DÜZENLE
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* CORPORATE BENTO GRID */}
            <div className="corporate-bento-grid">
                
                {/* Şirket özeti */}
                <div className="bento-card bento-col-8">
                    <div className="section-header-pro">
                        <div className="section-icon"><Building2 size={20} /></div>
                        <h2 className="section-title-pro">KURUMSAL ÖZET</h2>
                    </div>

                    {editMode ? (
                        <div className="form-grid-pro" style={{ marginTop: 24 }}>
                            <div className="form-group-pro">
                                <label className="label-pro">Şirket Adı</label>
                                <input className="modern-input" value={profile.displayName} onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))} />
                            </div>
                            <div className="form-group-pro">
                                <label className="label-pro">Sektör</label>
                                <input className="modern-input" value={profile.sector} onChange={e => setProfile(p => ({ ...p, sector: e.target.value }))} />
                            </div>
                            <div className="form-group-pro">
                                <label className="label-pro">Konum</label>
                                <input className="modern-input" value={profile.location} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} />
                            </div>
                            <div className="form-group-pro">
                                <label className="label-pro">Web Sitesi</label>
                                <input className="modern-input" value={profile.website} onChange={e => setProfile(p => ({ ...p, website: e.target.value }))} />
                            </div>
                            <div className="form-group-pro" style={{ gridColumn: 'span 2' }}>
                                <label className="label-pro">Şirket Açıklaması</label>
                                <textarea className="modern-textarea" rows={4} value={profile.description} onChange={e => setProfile(p => ({ ...p, description: e.target.value }))} />
                            </div>
                        </div>
                    ) : (
                        <div className="mt-24">
                            <div className="info-grid-pro" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div className="info-item-pro-omega">
                                    <div className="info-label-pro">SEKTÖR</div>
                                    <div className="info-value-pro">{profile.sector || "BELİRTİLMEDİ"}</div>
                                </div>
                                <div className="info-item-pro-omega">
                                    <div className="info-label-pro">WEB SİTESİ</div>
                                    <div className="info-value-pro">
                                        {profile.website ? <a href={profile.website} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)' }}>{profile.website} <Globe size={12} /></a> : "BELİRTİLMEDİ"}
                                    </div>
                                </div>
                            </div>
                            <div className="info-row-pro" style={{ marginTop: 24 }}>
                                <div className="info-label-pro">AÇIKLAMA</div>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 15 }}>{profile.description || "Şirket açıklaması girilmedi."}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sosyal bağlantılar */}
                <div className="bento-card bento-col-4">
                    <div className="section-header-pro">
                        <div className="section-icon"><Globe size={20} /></div>
                        <h2 className="section-title-pro">SOSYAL EKOSİSTEM</h2>
                    </div>

                    {editMode ? (
                        <div className="social-inputs-pro" style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div className="social-input-omega"><Linkedin size={18} /><input placeholder="LinkedIn" value={profile.linkedin} onChange={e => setProfile(p => ({ ...p, linkedin: e.target.value }))} /></div>
                            <div className="social-input-omega"><Twitter size={18} /><input placeholder="Twitter" value={profile.twitter} onChange={e => setProfile(p => ({ ...p, twitter: e.target.value }))} /></div>
                            <div className="social-input-omega"><Instagram size={18} /><input placeholder="Instagram" value={profile.instagram} onChange={e => setProfile(p => ({ ...p, instagram: e.target.value }))} /></div>
                        </div>
                    ) : (
                        <div className="social-deck-omega">
                            {profile.linkedin && <a href={profile.linkedin} className="social-link-omega"><Linkedin size={20} /> LinkedIn <ChevronRight size={14} style={{ marginLeft: 'auto' }} /></a>}
                            {profile.twitter && <a href={profile.twitter} className="social-link-omega"><Twitter size={20} /> Twitter <ChevronRight size={14} style={{ marginLeft: 'auto' }} /></a>}
                            {profile.instagram && <a href={profile.instagram} className="social-link-omega"><Instagram size={20} /> Instagram <ChevronRight size={14} style={{ marginLeft: 'auto' }} /></a>}
                            {!profile.linkedin && !profile.twitter && !profile.instagram && <p style={{ opacity: 0.5 }}>BAĞLANTI YOK</p>}
                        </div>
                    )}
                </div>

                {/* Vizyon misyon */}
                <div className="bento-card bento-col-8 mission-card-omega">
                    <div className="section-header-pro">
                        <div className="section-icon"><Star size={20} /></div>
                        <h2 className="section-title-pro">VİZYON & MİSYON</h2>
                    </div>
                    
                    <div className="mt-24" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                        <div>
                            <h4 style={{ color: 'var(--primary-light)', fontSize: 13, marginBottom: 12 }}>🌟 VİZYONUMUZ</h4>
                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{profile.vision || "Belirtilmedi."}</p>
                        </div>
                        <div>
                            <h4 style={{ color: 'var(--primary-light)', fontSize: 13, marginBottom: 12 }}>🚀 MİSYONUMUZ</h4>
                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{profile.mission || "Belirtilmedi."}</p>
                        </div>
                    </div>
                </div>

                {/* Ayarlar & Şifre */}
                <div className="bento-card bento-col-4">
                    <div className="section-header-pro">
                        <div className="section-icon"><Lock size={20} /></div>
                        <h2 className="section-title-pro">EVALÜASYON & GÜVENLİK</h2>
                    </div>

                    <div className="mt-24">
                        <div style={{ background: 'rgba(251,191,36,0.05)', padding: 16, borderRadius: 16, border: '1px solid rgba(251,191,36,0.1)', marginBottom: 20 }}>
                            <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 800 }}>KURUMSAL PUAN</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: 'white' }}>{avgRating}/5.0</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{validReviews.length} toplam değerlendirme</div>
                        </div>

                        {isGoogleSignIn && !hasPassword && (
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16 }}>
                                <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 12 }}>Google şifresiz geçiş aktif. Standart şifre belirleyin:</p>
                                <input type="password" className="modern-input" style={{ fontSize: 12 }} placeholder="Şifre" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                                <button className="btn-save-omega" style={{ width: '100%', marginTop: 12, fontSize: 11 }} onClick={handleSetPassword} disabled={newPassword.length < 6}>ŞİFRELE</button>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Photo Modal */}
            {showPhotoModal && (
                <div className="modal-overlay" onClick={() => { stopCamera(); setPreviewPhoto(null); setShowPhotoModal(false); }}>
                    <div className="modal-content company-modal-omega" onClick={e => e.stopPropagation()}>
                        <h3 className="omega-text-gradient" style={{ textAlign: 'center', fontSize: 24, fontWeight: 900, marginBottom: 24 }}>KURUMSAL LOGO</h3>
                        {(!isCameraActive && !previewPhoto) ? (
                            <div className="photo-options" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <label className="bento-card" style={{ cursor: 'pointer', textAlign: 'center', padding: 32 }}>
                                    <UploadCloud size={40} color="var(--primary-light)" style={{ marginBottom: 12 }} />
                                    <p style={{ fontSize: 14, fontWeight: 700 }}>DOSYALARDAN SEÇ</p>
                                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
                                </label>
                                <div className="bento-card" style={{ cursor: 'pointer', textAlign: 'center', padding: 32 }} onClick={startCamera}>
                                    <Camera size={40} color="var(--warning)" style={{ marginBottom: 12 }} />
                                    <p style={{ fontSize: 14, fontWeight: 700 }}>KAMERA İLE ÇEK</p>
                                </div>
                            </div>
                        ) : (
                            <div className="camera-wrapper">
                                <div className="camera-container" style={{ borderRadius: 32, overflow: 'hidden', border: '4px solid var(--border)' }}>
                                    {previewPhoto ? <img src={previewPhoto} style={{ width: '100%' }} alt="Önizleme" /> : <video ref={videoRef} autoPlay playsInline style={{ width: '100%' }} />}
                                    <canvas ref={canvasRef} style={{ display: "none" }} />
                                    {!previewPhoto && <button className="shutter-btn" onClick={capturePhoto}><div className="shutter-icon"></div></button>}
                                </div>
                                <div className="camera-controls mt-24" style={{ display: 'flex', gap: 12 }}>
                                    {previewPhoto ? (
                                        <>
                                            <button className="btn-save-omega" style={{ flex: 1 }} onClick={saveCapturedPhoto} disabled={uploadingLogo}>{uploadingLogo ? "İŞLENİYOR..." : "LOGO YAP"}</button>
                                            <button className="btn-save-omega" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }} onClick={() => { setPreviewPhoto(null); startCamera(); }}>TEKRAR</button>
                                        </>
                                    ) : <button className="btn-save-omega" style={{ width: '100%', background: 'rgba(255,b255,255,0.05)' }} onClick={stopCamera}>IPTAL</button>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

