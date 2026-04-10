import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc, arrayUnion, query, where, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { ArrowLeft, Star, MapPin, Briefcase, DollarSign, Clock, Calendar, Send, MessageCircle, AlertCircle, Trash2 } from "lucide-react";
import "./JobDetail.css";

const DEMO_JOBS = {
    "1": { title: "Frontend Geliştirici Stajyeri", companyName: "TechCorp A.Ş.", sector: "Yazılım", type: "remote", location: "İstanbul", skills: ["React", "JavaScript", "CSS"], salary: "", status: "active", createdAt: new Date().toISOString(), description: "TechCorp olarak dinamik Frontend Geliştirici Stajyeri arıyoruz.\n\n**Görev ve Sorumluluklar:**\n- React ile web uygulamaları geliştirme\n- UI/UX tasarımlarını koda dönüştürme", duration: 3, deadline: "2025-06-01", companyId: "comp1" },
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
                let total = 0, count = 0, currentUserRating = 0;
                snap.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.rating) { total += data.rating; count++; }
                    if (currentUser && data.fromId === currentUser.uid) currentUserRating = data.rating || 0;
                });
                if (count > 0) { setCompanyAvgRating((total / count).toFixed(1)); setCompanyReviewCount(count); }
                setUserRating(currentUserRating);
            } catch (err) { }
        };
        fetchReviews();
    }, [job?.companyId, currentUser]);

    const handleApply = async () => {
        setApplying(true); setError("");
        const { containsForbiddenContent } = await import("../utils/wordFilter");
        const { isForbidden } = containsForbiddenContent(coverLetter);

        if (isForbidden) {
            showNotification("Ön yazınız yasaklı kelimeler içeriyor.", "warning", "Uyarı");
            setApplying(false); return;
        }

        try {
            const studentName = currentUser.displayName || "Öğrenci";
            await addDoc(collection(db, "applications"), {
                jobId: id, studentId: currentUser.uid, companyId: job.companyId,
                coverLetter, status: "pending", createdAt: serverTimestamp(),
                jobTitle: job.title, companyName: job.companyName, studentName: studentName,
            });

            await setDoc(doc(db, "students", currentUser.uid), { appliedJobs: arrayUnion(id) }, { merge: true });

            // Create chat
            const q = query(collection(db, "chats"), where("participants", "array-contains", currentUser.uid), where("jobId", "==", id));
            const snap = await getDocs(q);
            let existingChat = snap.docs.find(d => d.data().participants?.includes(job.companyId));
            
            let chatId = existingChat ? existingChat.id : (await addDoc(collection(db, "chats"), {
                participants: [currentUser.uid, job.companyId], jobId: id, jobTitle: job.title,
                participantDetails: [{ id: currentUser.uid, name: studentName }, { id: job.companyId, name: job.companyName }],
                lastMessage: "", lastMessageAt: serverTimestamp(), createdAt: serverTimestamp()
            })).id;

            const autoMsg = `Merhaba ben ${studentName}, "${job.title}" ilanınız için başvurumu yaptım. İşte ön yazım: ${coverLetter}`;
            await addDoc(collection(db, `chats/${chatId}/messages`), { senderId: currentUser.uid, text: autoMsg, createdAt: serverTimestamp() });
            await updateDoc(doc(db, "chats", chatId), { lastMessage: autoMsg, lastMessageAt: serverTimestamp() });

            setApplied(true); setShowApplyModal(false);
            setSuccess("Başvurunuz başarıyla gönderildi! 🎉");
            setTimeout(() => navigate('/student/dashboard'), 2000);
        } catch (err) { setError("Başvuru yapılamadı."); }
        setApplying(false);
    };

    const handleStartChat = async () => {
        if (!currentUser) { navigate("/login"); return; }
        if (!job?.companyId) { setError("Şirket bilgisi eksik."); return; }
        try {
            const q = query(collection(db, "chats"), where("participants", "array-contains", currentUser.uid), where("jobId", "==", id));
            const snap = await getDocs(q);
            let existingChat = snap.docs.find(d => d.data().participants?.includes(job.companyId));

            if (existingChat) { navigate(`/messages/${existingChat.id}`); } else {
                const chatRef = await addDoc(collection(db, "chats"), {
                    participants: [currentUser.uid, job.companyId], jobId: id, jobTitle: job.title,
                    participantDetails: [{ id: currentUser.uid, name: currentUser.displayName }, { id: job.companyId, name: job.companyName }],
                    lastMessage: "Merhaba, ilanınızla ilgileniyorum.", lastMessageAt: serverTimestamp(), createdAt: serverTimestamp()
                });
                await addDoc(collection(db, `chats/${chatRef.id}/messages`), { senderId: currentUser.uid, text: "Merhaba, ilanınızla ilgileniyorum.", createdAt: serverTimestamp() });
                await addDoc(collection(db, `notifications/${job.companyId}/items`), { type: "message", message: `${currentUser.displayName} size mesaj gönderdi.`, link: "/messages", createdAt: serverTimestamp(), read: false });
                navigate(`/messages/${chatRef.id}`);
            }
        } catch (err) { setError("Sohbet başlatılamadı."); }
    };

    const handleRating = async (ratingValue) => {
        if (!currentUser || userProfile?.type !== "student") return;
        setSubmittingRating(true);
        try {
            const reviewId = `${currentUser.uid}_${job.companyId}`;
            const reviewRef = doc(db, "reviews", reviewId);
            const reviewData = { fromId: currentUser.uid, toId: job.companyId, rating: ratingValue, createdAt: serverTimestamp() };
            const snap = await getDoc(reviewRef);
            if (snap.exists()) { await updateDoc(reviewRef, { rating: ratingValue, updatedAt: serverTimestamp() }); } 
            else { await setDoc(reviewRef, reviewData); }
            setUserRating(ratingValue); setSuccess("Değerlendirmeniz kaydedildi! 🌟");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) { setError("Değerlendirme kaydedilemedi."); }
        setSubmittingRating(false);
    };

    const handleDeleteJob = async () => {
        const confirmed = await showConfirm("Bu ilanı silmek istediğinizden emin misiniz?", "İlan Silme");
        if (!confirmed) return;
        setDeleting(true);
        try { await updateDoc(doc(db, "jobs", id), { status: "deleted" }); setSuccess("İlan başarıyla silindi! ✅"); setTimeout(() => navigate("/jobs"), 2000); } 
        catch (err) { setError("Silme başarısız."); }
        setDeleting(false);
    };

    if (loading) return (
        <div className="page-wrapper job-detail-page">
            <div className="job-hero"><h1 style={{color: 'white', marginTop: 100}}>Yükleniyor...</h1></div>
        </div>
    );

    if (!job) return (
        <div className="page-wrapper job-detail-page">
            <div className="job-hero">
                <h1 style={{color: 'white', marginTop: 100, fontSize: 60}}>😕 İlan bulunamadı</h1>
                <Link to="/jobs" className="btn btn-primary" style={{marginTop: 32}}>İlanlara Dön</Link>
            </div>
        </div>
    );

    const TYPE_LABELS = { remote: "Uzaktan", hybrid: "Hibrit", onsite: "Ofis" };

    const safeDeadline = (() => {
        if (!job.deadline) return null;
        let d;
        if (job.deadline?.toDate) d = job.deadline.toDate();
        else if (job.deadline?.toMillis) d = new Date(job.deadline.toMillis());
        else d = new Date(job.deadline);
        return d && !isNaN(d.getTime()) ? d.toLocaleDateString("tr-TR") : null;
    })();

    // --- YAPAY ZEKA EŞLEŞME SKORU HESAPLAMA ---
    const userSkills = userProfile?.profileData?.skills || [];
    const jobSkills = job?.skills || [];
    let matchPercentage = 0;
    
    if (userSkills.length > 0 && jobSkills.length > 0) {
        const userSkillsLower = userSkills.map(s => s.toLowerCase());
        const matched = jobSkills.filter(s => userSkillsLower.includes(s.toLowerCase()));
        matchPercentage = Math.round((matched.length / jobSkills.length) * 100);
    } else if (jobSkills.length === 0) {
        matchPercentage = 100; // İlanın beceri şartı yoksa %100 uyumlu
    }

    const getMatchColor = (score) => {
        if (score >= 80) return "var(--success)";
        if (score >= 50) return "var(--warning)";
        return "var(--danger)";
    };

    return (
        <div className="page-wrapper job-detail-page page-enter">
            {/* HERO BAR */}
            <div className="job-hero">
                <Link to="/jobs" className="back-link-hero"><ArrowLeft size={16}/> İlanlara Dön</Link>
                <div className="job-hero-content">
                    <div className="job-hero-logo">
                        {job.companyLogo ? <img src={job.companyLogo} alt={job.companyName} /> : (job.companyName[0] || "?").toUpperCase()}
                    </div>
                    <h1 className="job-hero-title">{job.title}</h1>
                    <div className="job-hero-company">
                        {job.companyName}
                        <div className="job-hero-rating">
                            <Star size={16} fill="#fbbf24" color="#fbbf24"/> {companyAvgRating > 0 ? companyAvgRating : "Yeni"} 
                            <span style={{color: 'var(--text-muted)'}}>({companyReviewCount})</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN GRID */}
            <div className="job-detail-grid">
                
                {/* LEFT: Content */}
                <div className="job-content-main">
                    {success && <div className="alert alert-success">{success}</div>}
                    {error && <div className="alert alert-danger">{error}</div>}

                    <div className="job-glass-panel">
                        <h2 className="section-title"><Briefcase size={24} color="var(--primary)"/> İlan Açıklaması</h2>
                        <div className="job-description-text">
                            {(job.description || "Detaylı açıklama bulunmuyor.").split("\n").map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}
                        </div>
                    </div>

                    {(job.skills || []).length > 0 && (
                        <div className="job-glass-panel">
                            <h2 className="section-title"><Star size={24} color="var(--warning)"/> İstenen Beceriler</h2>
                            <div className="job-skills-list">
                                {job.skills.map((s) => <span key={s} className="skill-tag">{s}</span>)}
                            </div>
                        </div>
                    )}

                    {currentUser && userProfile?.type === "student" && (
                        <div className="job-glass-panel" style={{textAlign: 'center'}}>
                            <h2 className="section-title" style={{justifyContent: 'center'}}><Star size={24} color="#fbbf24"/> Şirketi Değerlendir</h2>
                            <p style={{color: 'var(--text-secondary)', marginBottom: 24}}>Eğer bu şirketle deneyiminiz olduysa başkalarına fikir verin.</p>
                            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <span 
                                        key={star} onClick={() => handleRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)}
                                        style={{ cursor: submittingRating ? 'wait' : 'pointer', fontSize: 48, color: star <= (hoverRating || userRating) ? '#fbbf24' : '#475569', transition: 'color 0.2s', userSelect: 'none' }}
                                    >★</span>
                                ))}
                            </div>
                            {userRating > 0 && <p style={{color: 'var(--success)', marginTop: 16, fontWeight: 'bold'}}>Puanınız: {userRating}/5</p>}
                        </div>
                    )}
                </div>

                {/* RIGHT: Sidebar */}
                <div className="job-sidebar">
                    {/* Apply Actions */}
                    <div className="job-actions-panel">
                        {/* YAPAY ZEKA EŞLEŞME SKORU GÖSTERGESİ */}
                        {currentUser && userProfile?.type === "student" && jobSkills.length > 0 && (
                            <div className="match-score-card" style={{
                                background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 'var(--radius-lg)', 
                                border: `1px solid ${getMatchColor(matchPercentage)}`, marginBottom: 24, textAlign: 'center',
                                boxShadow: `0 0 20px ${getMatchColor(matchPercentage)}20`
                            }}>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8}}>
                                    Yapay Zeka Eşleşme Skoru
                                </div>
                                <div style={{ fontSize: 36, fontWeight: 900, color: getMatchColor(matchPercentage), lineHeight: 1}}>
                                    %{matchPercentage}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8}}>
                                    {matchPercentage >= 80 ? 'Bu staj pozisyonu için mükemmel bir adaysın! 🚀' : 
                                     matchPercentage >= 50 ? 'Gereksinimlerin bir kısmını karşılıyorsun. 👍' :
                                     'Bu pozisyon için yeni beceriler öğrenmen gerekebilir. 🎯'}
                                </div>
                            </div>
                        )}

                        {isAdmin && (
                            <button className="action-btn-glow" style={{background: 'var(--danger)', color: 'white', marginBottom: 24}} onClick={handleDeleteJob} disabled={deleting}>
                                <Trash2 size={20}/> {deleting ? "Siliniyor..." : "İlanı Sistemden Sil"}
                            </button>
                        )}

                        {currentUser && userProfile?.type === "student" && (
                            <>
                                {applied ? (
                                    <div className="action-btn-glow" style={{background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', cursor: 'default', border: '1px solid var(--success)'}}>✅ Başvuru Yapıldı</div>
                                ) : (
                                    <button className="action-btn-glow action-btn-apply" onClick={() => setShowApplyModal(true)} disabled={!isProfileComplete}>
                                        <Send size={20}/> Hemen Başvur
                                    </button>
                                )}
                                <button className="action-btn-glow action-btn-secondary" onClick={handleStartChat} disabled={!isProfileComplete}>
                                    <MessageCircle size={20}/> Mesaj Gönder
                                </button>
                                {!isProfileComplete && <p style={{color: '#fca5a5', fontSize: 13, marginTop: 12, textAlign: 'center'}}>Profil bilgilerinizi tamamlamanız gerekiyor.</p>}
                            </>
                        )}

                        {!currentUser && (
                            <Link to="/login" className="action-btn-glow action-btn-apply" style={{textAlign: 'center', display: 'block'}}>Giriş Yap & Başvur</Link>
                        )}
                        
                        {safeDeadline && (
                            <div className="deadline-alert"><AlertCircle size={14} style={{display: 'inline', verticalAlign: 'middle', marginRight: 4}}/> Son Başvuru: {safeDeadline}</div>
                        )}
                    </div>

                    {/* Quick Facts */}
                    <div className="job-glass-panel" style={{padding: '32px'}}>
                        <h3 style={{color: 'white', fontWeight: 800, fontSize: 18, marginBottom: 24}}>Özet Bilgiler</h3>
                        <div className="job-facts-grid">
                            <div className="job-fact-item primary">
                                <div className="fact-icon"><Briefcase size={24}/></div>
                                <div className="fact-info"><div className="fact-label">Çalışma Tipi</div><div className="fact-value">{TYPE_LABELS[job.type] || job.type}</div></div>
                            </div>
                            {job.location && (
                                <div className="job-fact-item">
                                    <div className="fact-icon"><MapPin size={24}/></div>
                                    <div className="fact-info"><div className="fact-label">Lokasyon</div><div className="fact-value">{job.location}</div></div>
                                </div>
                            )}
                            {job.sector && (
                                <div className="job-fact-item warning">
                                    <div className="fact-icon"><Star size={24}/></div>
                                    <div className="fact-info"><div className="fact-label">Sektör</div><div className="fact-value">{job.sector}</div></div>
                                </div>
                            )}
                            {job.salary && (
                                <div className="job-fact-item success">
                                    <div className="fact-icon"><DollarSign size={24}/></div>
                                    <div className="fact-info"><div className="fact-label">Maaş</div><div className="fact-value">{job.salary}</div></div>
                                </div>
                            )}
                            {job.duration && (
                                <div className="job-fact-item">
                                    <div className="fact-icon"><Clock size={24}/></div>
                                    <div className="fact-info"><div className="fact-label">Staj Süresi</div><div className="fact-value">{job.duration} Ay</div></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Apply Modal */}
            {showApplyModal && (
                <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Başvuru: <span style={{color: 'var(--primary)'}}>{job.title}</span></h2>
                        <p className="modal-subtitle">{job.companyName}</p>
                        <div className="form-group" style={{ marginTop: 24 }}>
                            <label className="form-label" style={{color: 'white', marginBottom: 12}}>Ön Yazı (İsteğe Bağlı)</label>
                            <textarea
                                className="form-input"
                                style={{background: 'rgba(0,0,0,0.5)', minHeight: 120, padding: 16}}
                                placeholder="Kendinizi tanıtın, neden bu pozisyon için uygun olduğunuzu belirtin..."
                                value={coverLetter}
                                onChange={(e) => setCoverLetter(e.target.value)}
                            />
                        </div>
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
    );
}
