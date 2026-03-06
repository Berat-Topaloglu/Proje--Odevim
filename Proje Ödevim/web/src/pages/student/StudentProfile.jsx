import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { updateProfile, updatePassword } from "firebase/auth";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import "./StudentProfile.css";

const SKILLS_LIST = ["JavaScript", "React", "Python", "Java", "Node.js", "CSS", "HTML", "Figma", "SQL", "Git", "TypeScript", "Vue.js", "C#", "C++", "PHP", "Swift", "Kotlin", "Flutter", "Django", "MongoDB", "PostgreSQL", "MySQL", "AWS", "Docker", "Machine Learning"];

export default function StudentProfile() {
    const { currentUser, userProfile, updateDisplayName, logout } = useAuth();
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
    const [skillInput, setSkillInput] = useState("");
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
        const fetchData = async () => {
            if (!currentUser) return;
            try {
                const snap = await getDoc(doc(db, "students", currentUser.uid));
                if (snap.exists()) {
                    const data = snap.data();
                    setProfile(prev => ({
                        ...prev,
                        ...data,
                        skills: data.skills || [],
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
            } catch (err) { console.error(err); }
            setLoading(false);
        };
        fetchData();

        // Cleanup camera on unmount
        return () => {
            stopCamera();
        };
    }, [currentUser]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Update auth and users table
            if (profile.displayName !== currentUser.displayName) {
                await updateDisplayName(profile.displayName);
            }

            const { displayName, ...roleData } = profile;
            await setDoc(doc(db, "students", currentUser.uid), roleData, { merge: true });
            
            setEditMode(false);
            setSuccess("Profil güncellendi! ✅");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error(err);
        }
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
            setPreviewPhoto(null);
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Fotoğraf yüklenemedi:", err);
            setError("Fotoğraf yüklenirken bir hata oluştu.");
            setTimeout(() => setError(""), 3000);
        }
        setUploadingPhoto(false);
    };

    const startCamera = async () => {
        setIsCameraActive(true);
        setPreviewPhoto(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: false
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Kamera açılamadı:", err);
            setError("Kameraya erişilemedi. Lütfen izinleri kontrol edin.");
            setIsCameraActive(false);
            setTimeout(() => setError(""), 3000);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => {
                track.stop();
                track.enabled = false;
            });
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
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL("image/jpeg");
            setPreviewPhoto(dataUrl);
            stopCamera(); // Stop camera as soon as photo is taken
        }
    };

    const saveCapturedPhoto = () => {
        if (previewPhoto) {
            fetch(previewPhoto)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
                    handlePhotoUpload(file);
                });
        }
    };

    const retakePhoto = () => {
        setPreviewPhoto(null);
        startCamera(); // Restart camera for retake
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
        if (!window.confirm("CV'nizi silmek istediğinizden emin misiniz?")) return;
        try {
            await updateDoc(doc(db, "students", currentUser.uid), { cvUrl: "" });
            setProfile(p => ({ ...p, cvUrl: "" }));
            setSuccess("CV başarıyla silindi! ✅");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("CV silinemedi:", err);
        }
    };

    const toggleSkill = (skill) => {
        setProfile((p) => {
            const currentSkills = p.skills || [];
            return {
                ...p,
                skills: currentSkills.includes(skill)
                    ? currentSkills.filter((s) => s !== skill)
                    : [...currentSkills, skill],
            };
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
            "bilgisayar": ["JavaScript", "React", "Node.js", "SQL", "Git", "Python"],
            "yazılım": ["JavaScript", "React", "Node.js", "SQL", "Git", "Java"],
            "tasarım": ["Figma", "CSS", "HTML", "UI/UX"],
            "endüstri": ["SQL", "Python", "Data Analysis", "Excel"],
            "elektrik": ["C++", "Python", "MATLAB", "Embedded Systems"],
            "makine": ["AutoCAD", "SolidWorks", "Python"],
            "pazarlama": ["SEO", "Google Analytics", "Content Marketing"],
        };

        const lowerDept = (dept || "").toLowerCase();
        let foundSkills = [];
        
        Object.keys(mapping).forEach(key => {
            if (lowerDept.includes(key)) {
                foundSkills = [...foundSkills, ...mapping[key]];
            }
        });

        if (foundSkills.length > 0) {
            setProfile(p => ({
                ...p,
                skills: Array.from(new Set([...(p.skills || []), ...foundSkills]))
            }));
            setSuccess("Bölümüne uygun beceriler eklendi! ✨");
            setTimeout(() => setSuccess(""), 3000);
        }
    };

    const initials = (currentUser?.displayName || currentUser?.email || "?")
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    if (loading) return (
        <div className="page-wrapper">
            <div className="content-wrapper" style={{ maxWidth: 700 }}>
                <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
            </div>
        </div>
    );

    return (
        <div className="page-wrapper">
            <div className="content-wrapper page-enter" style={{ maxWidth: 750 }}>
                {success && <div className="alert alert-success mb-16">{success}</div>}

                {/* Profile Header */}
                <div className="profile-header card">
                    <div className="profile-avatar-container">
                        <div className="avatar avatar-xl profile-avatar" onClick={() => setShowPhotoModal(true)} style={{ cursor: "pointer" }}>
                            {profile.photoUrl ? (
                                <img src={profile.photoUrl} alt="Profil" className="avatar-img" />
                            ) : initials}
                        </div>
                        <button className="photo-upload-badge" title="Fotoğraf Değiştir" onClick={() => setShowPhotoModal(true)}>
                            📷
                        </button>
                    </div>
                    <div className="profile-header-info">
                        <h1 className="profile-name">{currentUser?.displayName}</h1>
                        <p className="profile-email">{currentUser?.email}</p>
                        <span className="badge badge-primary">
                            🎓 Öğrenci
                        </span>
                    </div>
                    {!editMode && (
                        <button className="btn btn-secondary" onClick={() => setEditMode(true)}>
                            ✏️ Düzenle
                        </button>
                    )}
                </div>

                {/* Info */}
                <div className="card mt-24">
                    <div className="section-header-profile">
                        <h2 className="section-title2">👤 Kişisel Bilgiler</h2>
                    </div>

                    {editMode ? (
                        <div className="profile-form">
                            <div className="form-group">
                                <label className="form-label">Ad Soyad</label>
                                <input className="form-input" value={profile.displayName} onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))} placeholder="Adınız Soyadınız" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Üniversite</label>
                                <input className="form-input" value={profile.university} onChange={e => setProfile(p => ({ ...p, university: e.target.value }))} placeholder="Örn: İTÜ" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Bölüm (Enter: Becerileri Öner)</label>
                                <input 
                                    className="form-input" 
                                    value={profile.department} 
                                    onChange={e => setProfile(p => ({ ...p, department: e.target.value }))} 
                                    onKeyDown={e => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            suggestSkills(profile.department);
                                        }
                                    }}
                                    placeholder="Örn: Bilgisayar Mühendisliği" 
                                />
                                <small style={{ color: "var(--text-muted)", fontSize: 11 }}>Enter'a basarak bölüme uygun becerileri ekleyebilirsiniz.</small>
                            </div>
                            <div className="form-group">
                                <label className="form-label">GPA / Not Ortalaması</label>
                                <input className="form-input" value={profile.gpa} onChange={e => setProfile(p => ({ ...p, gpa: e.target.value }))} placeholder="Örn: 3.50 / 4.00" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Hakkımda</label>
                                <textarea className="form-textarea" value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Kendinizi kısaca tanıtın..." rows={4} />
                            </div>
                        </div>
                    ) : (
                        <div className="profile-info-grid">
                            <InfoItem icon="🏛️" label="Üniversite" value={profile.university || "—"} />
                            <InfoItem icon="📚" label="Bölüm" value={profile.department || "—"} />
                            <InfoItem icon="📊" label="GPA" value={profile.gpa || "—"} />
                            <InfoItem icon="📝" label="Hakkımda" value={profile.bio || "—"} wide />
                        </div>
                    )}
                </div>

                {/* Skills */}
                <div className="card mt-24">
                    <h2 className="section-title2">🛠️ Beceriler</h2>
                    {editMode ? (
                        <>
                            <div className="skills-grid">
                                {SKILLS_LIST.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => toggleSkill(s)}
                                        className={`skill-chip ${(profile.skills || []).includes(s) ? "selected" : ""}`}
                                        type="button"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                            <div className="custom-skill-row">
                                <input
                                    className="form-input"
                                    placeholder="Özel beceri ekle..."
                                    value={skillInput}
                                    onChange={(e) => setSkillInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
                                />
                                <button className="btn btn-secondary" onClick={addCustomSkill} type="button">Ekle</button>
                            </div>
                            <div className="selected-skills-preview">
                                <p className="form-label">Seçilen: {(profile.skills || []).length}</p>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                                    {(profile.skills || []).map((s) => (
                                        <span key={s} className="badge badge-primary">
                                            {s}
                                            <button onClick={() => toggleSkill(s)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", marginLeft: 4, padding: 0 }}>×</button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {profile.skills.length === 0 ? (
                                <p style={{ color: "var(--text-muted)" }}>Henüz beceri eklenmedi</p>
                            ) : profile.skills.map((s) => (
                                <span key={s} className="badge badge-primary" style={{ fontSize: 13, padding: "6px 12px" }}>{s}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* CV */}
                <div className="card mt-24">
                    <h2 className="section-title2">📄 CV</h2>
                    <div className="cv-section">
                        {profile.cvUrl ? (
                            <div className="cv-item-box">
                                <div className="cv-uploaded">
                                    <span className="cv-icon">📄</span>
                                    <div>
                                        <p className="cv-label">CV Yüklendi</p>
                                        <div className="cv-links">
                                            <a
                                                href={profile.cvUrl.includes("/upload/") ? profile.cvUrl.replace("/upload/", "/upload/fl_attachment:false/") : profile.cvUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="cv-view-link"
                                            >
                                                👁️ Görüntüle
                                            </a>
                                            <button className="cv-delete-btn" onClick={handleDeleteCV}>🗑️ Sil</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Henüz CV yüklenmedi</p>
                        )}
                        <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
                            {uploadingCV ? "Yükleniyor..." : (profile.cvUrl ? "📤 Güncelle" : "📤 CV Yükle")}
                            <input type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={handleCVUpload} disabled={uploadingCV} />
                        </label>
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
                                        <span style={{ fontWeight: 700, color: "var(--primary-color)" }}>{r.jobTitle}</span>
                                        <span style={{ color: "var(--warning)" }}>{"⭐".repeat(r.rating)}</span>
                                    </div>
                                    <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>{r.comment}</p>
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                        {r.createdAt?.toDate()?.toLocaleDateString("tr-TR")}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

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
