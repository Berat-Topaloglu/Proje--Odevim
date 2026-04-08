import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc, arrayUnion, query, where, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { uploadToCloudinary } from "../utils/cloudinary";
import { getSafeCvUrl } from "../utils/file_utils";
import { 
    Briefcase, Users, GraduationCap, Globe, Calendar, Banknote, 
    MapPin, Gauge, ShieldCheck, Plane, MousePointer2, 
    Smartphone, Languages, Clock, Accessibility, UserCircle2, 
    ChevronLeft, Trash2, Send, MessageSquare,
    FileText, Target, ClipboardList, Rocket, Flag, User
} from "lucide-react";
import "./JobDetail.css";

// Demo verileri (Firebase olmadan çalışması için)
const DEMO_JOBS = {
    "1": { title: "Frontend Geliştirici Stajyeri", companyName: "TechCorp A.Ş.", sector: "Yazılım", type: "remote", location: "İstanbul", skills: ["React", "JavaScript", "CSS", "HTML"], salary: "", status: "active", createdAt: new Date().toISOString(), description: "TechCorp olarak dinamik ve öğrenmeye açık bir Frontend Geliştirici Stajyeri arıyoruz. React ekosisteminde deneyim kazanmak isteyenler için harika bir fırsat!\n\n**Görev ve Sorumluluklar:**\n- React ile web uygulamaları geliştirme\n- UI/UX tasarımlarını koda dönüştürme\n- Kod gözden geçirme süreçlerine katılım\n- Agile metodoloji ile çalışma\n\n**Aranan Özellikler:**\n- HTML, CSS, JavaScript temeli\n- React bilgisi (temel düzey yeterli)\n- Problem çözme yeteneği\n- Takım çalışmasına yatkınlık", duration: 3, deadline: "2025-06-01", companyId: "comp1" },
    "2": { title: "UI/UX Tasarım Stajyeri", companyName: "DesignHub", sector: "Tasarım", type: "hybrid", location: "Ankara", skills: ["Figma", "Photoshop", "Adobe XD"], salary: "3500₺/ay", status: "active", createdAt: new Date().toISOString(), description: "DesignHub'da yaratıcı bir UI/UX Tasarım Stajyeri arıyoruz.\n\n**Görevler:**\n- Kullanıcı arayüzü tasarımları\n- Prototip oluşturma\n- Kullanıcı araştırması\n\n**İstenilenler:**\n- Figma deneyimi\n- Tasarım temelleri", duration: 4, deadline: "2025-05-15", companyId: "comp2" },
};

export default function JobDetail() {
    const { id } = useParams();
    const { currentUser, userProfile, isAdmin } = useAuth();
    const { showNotification, showConfirm } = useNotification();
    const navigate = useNavigate();

    const isProfileComplete = userProfile?.profileData?.university && userProfile?.profileData?.department;
    const [job, setJob] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState(false);
    const [coverLetter, setCoverLetter] = useState("");
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [cvFile, setCvFile] = useState(null);
    const [portfolioUrl, setPortfolioUrl] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [companyAvgRating, setCompanyAvgRating] = useState(0);
    const [companyReviewCount, setCompanyReviewCount] = useState(0);
    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [submittingRating, setSubmittingRating] = useState(false);

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const docRef = doc(db, "jobs", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setJob({ id: docSnap.id, ...docSnap.data() });
                } else {
                    setJob(DEMO_JOBS[id] || null);
                }
            } catch {
                setJob(DEMO_JOBS[id] || null);
            }
            setLoading(false);
        };
        fetchJob();
    }, [id]);

    useEffect(() => {
        const fetchReviews = async () => {
            if (!job?.companyId) return;
            try {
                const q = query(collection(db, "reviews"), where("toId", "==", job.companyId));
                const snap = await getDocs(q);
                let total = 0;
                let count = 0;
                let currentUserRating = 0;

                snap.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.rating) {
                        total += data.rating;
                        count++;
                    }
                    if (currentUser && data.fromId === currentUser.uid) {
                        currentUserRating = data.rating || 0;
                    }
                });

                if (count > 0) {
                    setCompanyAvgRating((total / count).toFixed(1));
                    setCompanyReviewCount(count);
                }
                setUserRating(currentUserRating);
            } catch (err) {
                console.error("Değerlendirmeler çekilemedi:", err);
            }
        };
        fetchReviews();
    }, [job?.companyId, currentUser]);

    const handleApply = async () => {
        setApplying(true);
        setError("");

        // Profanity filter for cover letter
        const { containsForbiddenContent } = await import("../utils/wordFilter");
        const { isForbidden } = containsForbiddenContent(coverLetter);

        if (isForbidden) {
            showNotification(
                "Ön yazınız yasaklı kelimeler veya iletişim bilgileri içeriyor. Lütfen kurallara uygun şekilde düzenleyin.",
                "warning",
                "⚠️ Uyarı"
            );
            setApplying(false);
            return;
        }

        try {
            const studentName = currentUser.displayName || "Öğrenci";
            const jobTitle = job.title;

            let applicationCdnUrl = "";
            if (cvFile) {
                applicationCdnUrl = await uploadToCloudinary(cvFile);
            } else if (job.cvRequired) {
                setError("Bu ilan için Özgeçmiş (CV) yüklemeniz zorunludur.");
                setApplying(false);
                return;
            }

            // 1. Create Application
            await addDoc(collection(db, "applications"), {
                jobId: id,
                studentId: currentUser.uid,
                companyId: job.companyId,
                coverLetter,
                cvUrl: applicationCdnUrl,
                portfolioUrl: portfolioUrl || "",
                status: "pending",
                createdAt: serverTimestamp(),
                jobTitle: jobTitle,
                companyName: job.companyName,
                studentName: studentName,
            });

            // 2. Add to appliedJobs (Using setDoc with merge to avoid 'no document' errors if student doc is incomplete)
            await setDoc(doc(db, "students", currentUser.uid), {
                appliedJobs: arrayUnion(id),
            }, { merge: true });

            // 3. Automatic Message to Company (Job Specific)
            const q = query(
                collection(db, "chats"),
                where("participants", "array-contains", currentUser.uid),
                where("jobId", "==", id)
            );
            const snap = await getDocs(q);
            let existingChat = snap.docs.find(d => {
                const data = d.data();
                return data.participants && data.participants.includes(job.companyId);
            });

            let chatId;
            if (existingChat) {
                chatId = existingChat.id;
            } else {
                const chatData = {
                    participants: [currentUser.uid, job.companyId],
                    jobId: id,
                    jobTitle: jobTitle,
                    participantDetails: [
                        { id: currentUser.uid, name: studentName },
                        { id: job.companyId, name: job.companyName || "Şirket" }
                    ],
                    lastMessage: "",
                    lastMessageAt: serverTimestamp(),
                    createdAt: serverTimestamp()
                };
                const chatRef = await addDoc(collection(db, "chats"), chatData);
                chatId = chatRef.id;
            }

            const autoMsg = `Merhaba ben ${studentName}, "${jobTitle}" ilanınız için başvurumu yaptım. İşte ön yazım: ${coverLetter || "Belirtilmedi"}`;
            
            await addDoc(collection(db, `chats/${chatId}/messages`), {
                senderId: currentUser.uid,
                text: autoMsg,
                createdAt: serverTimestamp()
            });

            await updateDoc(doc(db, "chats", chatId), {
                lastMessage: autoMsg,
                lastMessageAt: serverTimestamp()
            });

            setApplied(true);
            setShowApplyModal(false);
            setSuccess("Başvurunuz ve mesajınız başarıyla gönderildi! 🎉");
            setTimeout(() => navigate('/student/dashboard'), 2000);
        } catch (err) {
            console.error("Başvuru hatası:", err);
            setError("Başvuru gerçekleştirilemedi. Lütfen sisteme yeniden giriş yapıp tekrar deneyin.");
        }
        setApplying(false);
    };

    const handleStartChat = async () => {
        if (!currentUser) {
            navigate("/login");
            return;
        }

        if (!job?.companyId) {
            setError("Şirket bilgisi eksik olduğu için sohbet başlatılamıyor.");
            return;
        }

        try {
            // Check if a chat for THIS SPECIFIC JOB already exists
            const q = query(
                collection(db, "chats"),
                where("participants", "array-contains", currentUser.uid),
                where("jobId", "==", id)
            );
            const snap = await getDocs(q);
            let existingChat = snap.docs.find(d => {
                const data = d.data();
                return data.participants && data.participants.includes(job.companyId);
            });

            if (existingChat) {
                navigate(`/messages/${existingChat.id}`);
            } else {
                // Create a new job-specific chat
                const chatData = {
                    participants: [currentUser.uid, job.companyId],
                    jobId: id,
                    jobTitle: job.title,
                    participantDetails: [
                        { id: currentUser.uid, name: currentUser.displayName || "İsimsiz Kullanıcı" },
                        { id: job.companyId, name: job.companyName || "Şirket" }
                    ],
                    lastMessage: "Merhaba, ilanınızla ilgileniyorum.",
                    lastMessageAt: serverTimestamp(),
                    createdAt: serverTimestamp()
                };

                const chatRef = await addDoc(collection(db, "chats"), chatData);

                // İlk mesajı ekle
                await addDoc(collection(db, `chats/${chatRef.id}/messages`), {
                    senderId: currentUser.uid,
                    text: "Merhaba, ilanınızla ilgileniyorum.",
                    createdAt: serverTimestamp()
                });

                // Şirkete anlık bildirim oluştur
                await addDoc(collection(db, `notifications/${job.companyId}/items`), {
                    type: "message",
                    message: `${currentUser.displayName || "Bir öğrenci"} ilanınızla ilgileniyor ve size mesaj gönderdi.`,
                    link: "/messages",
                    createdAt: serverTimestamp(),
                    read: false
                });

                navigate(`/messages/${chatRef.id}`);
            }
        } catch (err) {
            console.error("Sohbet hatası:", err);
            setError("Sohbet başlatılırken bir sorun oluştu. Lütfen tekrar deneyin.");
        }
    };

    const handleRating = async (ratingValue) => {
        if (!currentUser || userProfile?.type !== "student") return;
        setSubmittingRating(true);
        try {
            const reviewId = `${currentUser.uid}_${job.companyId}`;
            const reviewRef = doc(db, "reviews", reviewId);
            const reviewData = {
                fromId: currentUser.uid,
                toId: job.companyId,
                rating: ratingValue,
                createdAt: serverTimestamp()
            };
            
            const snap = await getDoc(reviewRef);
            if (snap.exists()) {
                 await updateDoc(reviewRef, { rating: ratingValue, updatedAt: serverTimestamp() });
            } else {
                 await setDoc(reviewRef, reviewData);
            }
            
            setUserRating(ratingValue);
            setSuccess("Değerlendirmeniz kaydedildi! 🌟");
            setTimeout(() => setSuccess(""), 3000);
            
            // Ortalama puanı canlı güncellemek için basit yaklaşım (refetch yerine lokal artış yapmak da seçilebilir)
        } catch (err) {
            console.error("Değerlendirme hatası:", err);
            setError("Değerlendirme kaydedilemedi.");
        }
        setSubmittingRating(false);
    };

    const TYPE_LABELS = { remote: "Uzaktan", hybrid: "Hibrit", onsite: "Ofis" };
    const typeColors = { remote: "success", hybrid: "info", onsite: "warning" };

    const handleDeleteJob = async () => {
        const confirmed = await showConfirm("Bu ilanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm başvurular da silinir.", "İlan Silme");
        if (!confirmed) return;
        
        if (!isAdmin) {
            showNotification("Bu işlemi gerçekleştirmek için yetkiniz bulunmuyor.", "error", "Hata");
            return;
        }

        setDeleting(true);
        try {
            // 1. İlana ait tüm başvuruları temizle
            const appQ = query(collection(db, "applications"), where("jobId", "==", id));
            const appSnap = await getDocs(appQ);
            await Promise.all(appSnap.docs.map(appDoc => deleteDoc(doc(db, "applications", appDoc.id))));

            // 2. İlana ait tüm sohbetleri ve mesajları temizle
            const chatQ = query(collection(db, "chats"), where("jobId", "==", id));
            const chatSnap = await getDocs(chatQ);
            
            await Promise.all(chatSnap.docs.map(async (chatDoc) => {
                const chatId = chatDoc.id;
                const msgQ = query(collection(db, "chats", chatId, "messages"));
                const msgSnap = await getDocs(msgQ);
                await Promise.all(msgSnap.docs.map(m => deleteDoc(doc(db, "chats", chatId, "messages", m.id))));
                await deleteDoc(doc(db, "chats", chatId));
            }));

            // 3. İlanın kendisini temizle
            const deleteDocRef = doc(db, "jobs", id);
            await deleteDoc(deleteDocRef);
            
            showNotification(`İlan, ${appSnap.size} başvuru ve tüm mesajlaşmalar tamamen imha edildi.`, "success", "Operasyon Tamam");
            navigate("/jobs");
        } catch (err) {
            console.error("İlan imha edilirken hata:", err);
            showNotification("İlan imha edilirken bir hata oluştu.", "error", "Hata");
        }
        setDeleting(false);
    };

    if (loading) {
        return (
            <div className="page-wrapper">
                <div className="content-wrapper" style={{ maxWidth: 800 }}>
                    <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
                </div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="page-wrapper">
                <div className="content-wrapper" style={{ textAlign: "center", paddingTop: 80 }}>
                    <div style={{ fontSize: 60 }}>😕</div>
                    <h2 style={{ marginTop: 16, marginBottom: 8 }}>İlan bulunamadı</h2>
                    <Link to="/jobs" className="btn btn-primary">İlanlara Dön</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="page-wrapper">
            <div className="content-wrapper page-enter" style={{ maxWidth: 800 }}>
                <Link to="/jobs" className="back-link">← İlanlara Dön</Link>

                {success && <div className="alert alert-success mt-16">{success}</div>}
                {error && <div className="alert alert-error mt-16">{error}</div>}

                {/* Job Header */}
                <div className="job-detail-header card">
                    <div className="job-detail-logo avatar avatar-xl">
                        {job.companyLogo ? (
                            <img src={job.companyLogo} alt={job.companyName} />
                        ) : (
                            (job.companyName || "?")
                                .split(" ")
                                .filter(Boolean)
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)
                        )}
                    </div>
                    <div className="job-detail-info">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <h1 className="job-detail-title">{job.title}</h1>
                            {isAdmin && (
                                <button className="btn btn-danger btn-sm" onClick={handleDeleteJob} disabled={deleting}>
                                    {deleting ? "Siliniyor..." : "🗑️ İlanı Sil"}
                                </button>
                            )}
                        </div>
                        <p className="job-detail-company" style={{ marginBottom: "4px" }}>{job.companyName}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                            <span style={{ color: "#fbbf24", fontSize: "15px", fontWeight: "bold" }}>⭐ {companyAvgRating > 0 ? companyAvgRating : "Yeni"}</span>
                            <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>({companyReviewCount} Değerlendirme)</span>
                        </div>
                        <div className="job-detail-badges">
                            <span className={`badge badge-${typeColors[job.type] || "muted"}`}>
                                {TYPE_LABELS[job.type] || job.type}
                            </span>
                            {job.sector && <span className="badge badge-primary">{job.sector}</span>}
                            {job.experienceLevel && <span className="badge badge-info">{job.experienceLevel}</span>}
                            {job.location && <span className="badge badge-muted">📍 {job.location}</span>}
                        </div>
                        {/* Info Sections */}
                        <div className="job-info-sections">
                            {/* Temel Bilgiler */}
                            <div className="info-group">
                                <h3 className="info-group-title">
                                    <FileText size={16} /> Temel Bilgiler
                                </h3>
                                <div className="job-meta-grid">
                                    {job.position && (
                                        <div className="meta-item">
                                            <Briefcase size={18} className="meta-icon" />
                                            <div className="meta-content">
                                                <span className="meta-label">Pozisyon</span>
                                                <span className="meta-value">{job.position}</span>
                                            </div>
                                        </div>
                                    )}
                                    {job.department && (
                                        <div className="meta-item">
                                            <ShieldCheck size={18} className="meta-icon" />
                                            <div className="meta-content">
                                                <span className="meta-label">Birim</span>
                                                <span className="meta-value">{job.department}</span>
                                            </div>
                                        </div>
                                    )}
                                    {job.openings && (
                                        <div className="meta-item">
                                            <Users size={18} className="meta-icon" />
                                            <div className="meta-content">
                                                <span className="meta-label">Kontenjan</span>
                                                <span className="meta-value">{job.openings} Kişi</span>
                                            </div>
                                        </div>
                                    )}
                                    {job.startDate && (
                                        <div className="meta-item">
                                            <Calendar size={18} className="meta-icon" />
                                            <div className="meta-content">
                                                <span className="meta-label">Başlangıç</span>
                                                <span className="meta-value">{job.startDate}</span>
                                            </div>
                                        </div>
                                    )}
                                    {job.duration && (
                                        <div className="meta-item">
                                            <Clock size={18} className="meta-icon" />
                                            <div className="meta-content">
                                                <span className="meta-label">Süre</span>
                                                <span className="meta-value">{job.duration}</span>
                                            </div>
                                        </div>
                                    )}
                                    {job.salary && (
                                        <div className="meta-item">
                                            <Banknote size={18} className="meta-icon" />
                                            <div className="meta-content">
                                                <span className="meta-label">Maaş</span>
                                                <span className="meta-value" style={{ color: 'var(--success-light)' }}>{job.salary}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Aday Kriterleri */}
                            <div className="info-group">
                                <h3 className="info-group-title">
                                    <Target size={16} /> Aday Kriterleri
                                </h3>
                                <div className="job-meta-grid">
                                    {job.minEducation && (
                                        <div className="meta-item">
                                            <GraduationCap size={18} className="meta-icon" />
                                            <div className="meta-content">
                                                <span className="meta-label">Eğitim</span>
                                                <span className="meta-value">{job.minEducation}</span>
                                            </div>
                                        </div>
                                    )}
                                    {job.experienceLevel && (
                                        <div className="meta-item">
                                            <Gauge size={18} className="meta-icon" />
                                            <div className="meta-content">
                                                <span className="meta-label">Tecrübe</span>
                                                <span className="meta-value">{job.experienceLevel}</span>
                                            </div>
                                        </div>
                                    )}
                                    {job.language && (
                                        <div className="meta-item">
                                            <Languages size={18} className="meta-icon" />
                                            <div className="meta-content">
                                                <span className="meta-label">Dil</span>
                                                <span className="meta-value">{job.language}</span>
                                            </div>
                                        </div>
                                    )}
                                    {job.gender && (
                                        <div className="meta-item">
                                            <UserCircle2 size={18} className="meta-icon" />
                                            <div className="meta-content">
                                                <span className="meta-label">Cinsiyet</span>
                                                <span className="meta-value">{job.gender}</span>
                                            </div>
                                        </div>
                                    )}
                                    {job.ageRange && (
                                        <div className="meta-item">
                                            <User size={18} className="meta-icon" />
                                            <div className="meta-content">
                                                <span className="meta-label">Yaş Aralığı</span>
                                                <span className="meta-value">{job.ageRange}</span>
                                            </div>
                                        </div>
                                    )}
                                    {job.militaryStatus && (
                                        <div className="meta-item">
                                            <Flag size={18} className="meta-icon" />
                                            <div className="meta-content">
                                                <span className="meta-label">Askerlik</span>
                                                <span className="meta-value">{job.militaryStatus ? "Tecilli / Yapıldı" : "Farketmez"}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Diğer Kriterler */}
                            <div className="info-group">
                                <h3 className="info-group-title">
                                    <ClipboardList size={16} /> Diğer Kriterler
                                </h3>
                                <div className="job-meta-grid">
                                    {job.driverLicense && (
                                        <div className="meta-item">
                                            <Smartphone size={18} className="meta-icon" />
                                            <div className="meta-content">
                                                <span className="meta-label">Ehliyet</span>
                                                <span className="meta-value">{job.driverLicense}</span>
                                            </div>
                                        </div>
                                    )}
                                    {job.travelRequirement && (
                                        <div className="meta-item">
                                            <Plane size={18} className="meta-icon" />
                                            <div className="meta-content">
                                                <span className="meta-label">Seyahat</span>
                                                <span className="meta-value">{job.travelRequirement}</span>
                                            </div>
                                        </div>
                                    )}
                                    {job.disabilityFriendly && (
                                        <div className="meta-item">
                                            <Accessibility size={18} className="meta-icon" />
                                            <div className="meta-content">
                                                <span className="meta-label">Özel Durum</span>
                                                <span className="meta-value" style={{ color: 'var(--primary-light)' }}>Engelliye Uygun</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Başvuru Şartları */}
                            {(job.cvRequired || job.portfolioRequired) && (
                                <div className="info-group">
                                    <h3 className="info-group-title">
                                        <Rocket size={16} /> Başvuru Şartları
                                    </h3>
                                    <div className="application-requirements">
                                        {job.cvRequired && (
                                            <div className="req-pill">
                                                <FileText size={14} /> Özgeçmiş (CV) Zorunlu
                                            </div>
                                        )}
                                        {job.portfolioRequired && (
                                            <div className="req-pill">
                                                <MousePointer2 size={14} /> Portfolyo / Repo Zorunlu
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Apply Button */}
                    {currentUser && userProfile?.type === "student" && (
                        <div className="job-detail-action">
                            {applied ? (
                                <span className="badge badge-success" style={{ fontSize: 14, padding: "10px 18px" }}>
                                    ✅ Başvuruldu
                                </span>
                            ) : (
                                <button
                                    className="btn btn-primary btn-lg"
                                    onClick={() => setShowApplyModal(true)}
                                    disabled={!isProfileComplete} // Disable if profile is not complete
                                >
                                    📨 Başvur
                                </button>
                            )}
                            <button
                                className="btn btn-secondary btn-lg"
                                style={{ marginTop: 12, width: "100%" }}
                                onClick={handleStartChat}
                                disabled={!isProfileComplete} // Disable if profile is not complete
                            >
                                💬 Şirkete Mesaj Yaz
                            </button>
                            {job.deadline && (
                                <p className="deadline-text">
                                    Son: {(() => {
                                        let d;
                                        if (job.deadline?.toDate) d = job.deadline.toDate();
                                        else d = new Date(job.deadline);
                                        
                                        return !isNaN(d.getTime()) ? d.toLocaleDateString("tr-TR") : "—";
                                    })()}
                                </p>
                            )}
                        </div>
                    )}

                    {!currentUser && (
                        <Link to="/login" className="btn btn-primary btn-lg">
                            Giriş Yap & Başvur
                        </Link>
                    )}
                </div>

                {/* Description */}
                <div className="card mt-24">
                    <h2 className="section-title">📋 İlan Açıklaması</h2>
                    <div className="job-description">
                        {(job.description || "Açıklama birleşik bilgi içeriyor.").split("\n").map((line, i) => (
                            <p key={i}>{line}</p>
                        ))}
                    </div>
                </div>

                {/* Skills */}
                {(job.skills || []).length > 0 && (
                    <div className="card mt-24">
                        <h2 className="section-title">🛠️ Aranan Beceriler</h2>
                        <div className="job-skills-list">
                            {job.skills.map((s) => (
                                <span key={s} className="skill-tag">{s}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Requirements */}
                {job.requirements && (
                    <div className="card mt-24">
                        <h2 className="section-title">⚖️ Aday Gereksinimleri</h2>
                        <div className="job-description">
                            {job.requirements.split("\n").map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}
                        </div>
                    </div>
                )}

                {/* Benefits */}
                {job.benefits && (
                    <div className="card mt-24">
                        <h2 className="section-title">🎁 Sosyal İmkanlar ve Yan Haklar</h2>
                        <div className="job-description">
                            {job.benefits.split("\n").map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}
                        </div>
                    </div>
                )}

                {/* Rating Section for Students */}
                {currentUser && userProfile?.type === "student" && (
                    <div className="card mt-24">
                        <h2 className="section-title text-center">⭐ Şirketi Değerlendir</h2>
                        <p className="text-muted text-center" style={{ marginBottom: 16 }}>Bu şirket hakkında ne düşünüyorsunuz? Puan verin:</p>
                        <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <span 
                                    key={star}
                                    onClick={() => handleRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    style={{ 
                                        cursor: submittingRating ? 'wait' : 'pointer', 
                                        fontSize: 32, 
                                        color: star <= (hoverRating || userRating) ? '#fbbf24' : '#475569', 
                                        transition: 'color 0.2s',
                                        userSelect: 'none'
                                    }}
                                >
                                    ★
                                </span>
                            ))}
                        </div>
                        {userRating > 0 && <p className="text-success text-center mt-8">Verdiğiniz Puan: {userRating}/5</p>}
                    </div>
                )}

                {/* Apply Modal */}
                {showApplyModal && (
                    <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
                        <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
                            <h2 className="modal-title">📨 Başvur: {job.title}</h2>
                            <p className="modal-subtitle">{job.companyName}</p>

                            <div className="form-group" style={{ marginTop: 16 }}>
                                <label className="form-label">Ön Yazı (İsteğe Bağlı)</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Kendinizi tanıtın, neden bu pozisyon için uygun olduğunuzu belirtin..."
                                    value={coverLetter}
                                    onChange={(e) => setCoverLetter(e.target.value)}
                                    rows={4}
                                />
                            </div>

                            <div className="form-row mt-16">
                                <div className="form-group">
                                    <label className="form-label">
                                        Özgeçmiş (CV) {job.cvRequired && <span style={{ color: 'var(--danger)' }}>* Zorunlu</span>}
                                    </label>
                                    <input
                                        type="file"
                                        className="form-input"
                                        accept=".pdf"
                                        onChange={(e) => setCvFile(e.target.files[0])}
                                    />
                                    <p className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Sadece PDF formatı desteklenir.</p>
                                </div>
                            </div>

                            {job.portfolioRequired && (
                                <div className="form-group mt-16">
                                    <label className="form-label">Portfolyo / LinkedIn / Repo Linki <span style={{ color: 'var(--danger)' }}>* Zorunlu</span></label>
                                    <input
                                        className="form-input"
                                        placeholder="https://..."
                                        value={portfolioUrl}
                                        onChange={(e) => setPortfolioUrl(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            <div className="modal-actions">
                                <button className="btn btn-secondary" onClick={() => setShowApplyModal(false)}>İptal</button>
                                <button className="btn btn-primary" onClick={handleApply} disabled={applying}>
                                    {applying ? "Gönderiliyor..." : "Başvuruyu Gönder"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
