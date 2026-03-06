import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import "./Applicants.css";

export default function Applicants() {
    const { jobId } = useParams();
    const [job, setJob] = useState(null);
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const [ratingModal, setRatingModal] = useState({ show: false, studentId: "", studentName: "", appId: "" });
    const [ratingValue, setRatingValue] = useState(5);
    const [ratingComment, setRatingComment] = useState("");

    useEffect(() => {
        if (!jobId) return;

        // İşi çek (onSnapshot ile anlık dinle)
        const unsubscribeJob = onSnapshot(doc(db, "jobs", jobId), (snap) => {
            if (snap.exists()) setJob({ id: snap.id, ...snap.data() });
        }, (err) => {
            console.error("İş verisi çekilemedi:", err);
            setError("İş bilgileri yüklenirken hata oluştu.");
        });

        // Başvuranları anlık dinle
        const q = query(collection(db, "applications"), where("jobId", "==", jobId));
        const unsubscribeApps = onSnapshot(q, (snap) => {
            const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Memory sort
            apps.sort((a, b) => {
                const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return dateB - dateA;
            });

            setApplicants(apps);
            setLoading(false);
        }, (err) => {
            console.error("Başvuranlar yüklenemedi:", err);
            setError("Başvurular yüklenirken hata oluştu.");
            setLoading(false);
        });

        return () => {
            unsubscribeJob();
            unsubscribeApps();
        };
    }, [jobId]);

    const updateStatus = async (appId, newStatus) => {
        setUpdating(appId);
        try {
            await updateDoc(doc(db, "applications", appId), { status: newStatus });

            const app = applicants.find(a => a.id === appId);
            await addDoc(collection(db, `notifications/${app.studentId}/items`), {
                type: "application",
                message: `"${job.title}" başvurunuzun durumu "${newStatus === 'reviewing' ? 'İnceleniyor' : newStatus === 'accepted' ? 'Kabul Edildi' : 'Reddedildi'}" olarak güncellendi.`,
                read: false,
                createdAt: serverTimestamp()
            });

            setSuccess("Durum güncellendi! ✅");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Durum güncellenemedi:", err);
            setError("Güncelleme sırasında bir hata oluştu.");
        }
        setUpdating(null);
    };

    const handleRatingSubmit = async () => {
        try {
            await addDoc(collection(db, "reviews"), {
                fromId: job.companyId,
                toId: ratingModal.studentId,
                rating: ratingValue,
                comment: ratingComment,
                type: "company_to_student",
                jobTitle: job.title,
                createdAt: serverTimestamp()
            });

            await addDoc(collection(db, `notifications/${ratingModal.studentId}/items`), {
                type: "review",
                message: `${job.companyName} size bir değerlendirme bıraktı.`,
                read: false,
                createdAt: serverTimestamp()
            });

            setRatingModal({ show: false, studentId: "", studentName: "", appId: "" });
            setRatingComment("");
            setSuccess("Değerlendirme paylaşıldı! ⭐");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Rating hatası:", err);
            setError("Değerlendirme kaydedilemedi.");
        }
    };

    if (loading) return (
        <div className="page-wrapper">
            <div className="content-wrapper">
                <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
            </div>
        </div>
    );

    return (
        <div className="page-wrapper">
            <div className="content-wrapper page-enter">
                <Link to="/company/dashboard" className="back-link">← Dashboard'a Dön</Link>

                {success && <div className="alert alert-success mt-16">{success}</div>}
                {error && <div className="alert alert-danger mt-16">{error}</div>}

                <div className="applicants-header card mt-16">
                    <h1 className="applicants-title">{job?.title} İlanına Başvuranlar</h1>
                    <p className="applicants-count">{applicants.length} toplam başvuru</p>
                </div>

                {applicants.length === 0 ? (
                    <div className="empty-state card mt-24">
                        <span>📭</span>
                        <p>Henüz başvuru yok</p>
                    </div>
                ) : (
                    <div className="applicants-list mt-24">
                        {applicants.map(app => (
                            <div key={app.id} className="applicant-card card">
                                <div className="applicant-info">
                                    <div className="avatar avatar-md applicant-avatar">
                                        {app.studentName?.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="applicant-name">{app.studentName}</h3>
                                        <p className="applicant-email">{app.email || "E-posta belirtilmedi"}</p>
                                        <div className="applicant-status-badge">
                                            <span className={`badge badge-${app.status === "pending" ? "warning" :
                                                app.status === "accepted" ? "success" :
                                                    app.status === "rejected" ? "danger" : "info"
                                                }`}>
                                                {app.status === "pending" ? "Bekliyor" :
                                                    app.status === "reviewing" ? "İnceleniyor" :
                                                        app.status === "accepted" ? "Kabul Edildi" : "Reddedildi"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="applicant-message mt-16">
                                    <p className="form-label">Ön Yazı:</p>
                                    <p className="cover-letter-text">{app.coverLetter || "Ön yazı belirtilmedi."}</p>
                                </div>

                                <div className="applicant-actions mt-16">
                                    <div className="status-buttons">
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => updateStatus(app.id, "reviewing")}
                                            disabled={updating === app.id}
                                        >
                                            👀 İnceleniyor
                                        </button>
                                        <button
                                            className="btn btn-sm btn-success"
                                            onClick={() => updateStatus(app.id, "accepted")}
                                            disabled={updating === app.id}
                                        >
                                            ✅ Kabul Et
                                        </button>
                                        <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => updateStatus(app.id, "rejected")}
                                            disabled={updating === app.id}
                                        >
                                            ❌ Reddet
                                        </button>
                                    </div>
                                    <div className="view-actions">
                                        <Link to={`/student/profile/${app.studentId}`} className="btn btn-primary btn-sm">
                                            Profil
                                        </Link>
                                        {app.status === "accepted" && (
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => setRatingModal({ show: true, studentId: app.studentId, studentName: app.studentName, appId: app.id })}
                                            >
                                                ⭐ Değerlendir
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {ratingModal.show && (
                <div className="modal-overlay">
                    <div className="modal-content card">
                        <h3>{ratingModal.studentName} Değerlendir</h3>
                        <div className="rating-input mt-16">
                            <p className="form-label">Puan (1-5)</p>
                            <input
                                type="range" min="1" max="5"
                                value={ratingValue}
                                onChange={(e) => setRatingValue(parseInt(e.target.value))}
                            />
                            <span className="rating-display">{ratingValue} / 5</span>
                        </div>
                        <div className="mt-16">
                            <p className="form-label">Yorum</p>
                            <textarea
                                className="form-input"
                                value={ratingComment}
                                onChange={(e) => setRatingComment(e.target.value)}
                                placeholder="Stajyer hakkındaki görüşleriniz..."
                            />
                        </div>
                        <div className="modal-actions mt-24">
                            <button className="btn btn-secondary" onClick={() => setRatingModal({ ...ratingModal, show: false })}>İptal</button>
                            <button className="btn btn-primary" onClick={handleRatingSubmit}>Kaydet</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
