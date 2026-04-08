import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { getSafeCvUrl, getDownloadCvUrl } from "../../utils/file_utils";
import "./Applicants.css";

const handleViewCV = (cvUrl) => {
    if (!cvUrl) return;

    try {
        if (cvUrl.startsWith('http')) {
            window.open(cvUrl, '_blank');
            return;
        }

        const parts = cvUrl.split(',');
        const byteString = atob(parts[1]);
        const mimeString = parts[0].split(':')[1].split(';')[0];
        
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        
        const blob = new Blob([ab], { type: mimeString });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
        console.error("PDF açma hatası:", err);
        alert("PDF görüntülenirken bir hata oluştu.");
    }
};

export default function Applicants() {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const [studentPhotos, setStudentPhotos] = useState({}); // uid -> photoURL
    const [studentEmails, setStudentEmails] = useState({}); // uid -> email
    const [ratingModal, setRatingModal] = useState({ show: false, studentId: "", studentName: "", appId: "" });
    const [ratingValue, setRatingValue] = useState(5);
    const [ratingComment, setRatingComment] = useState("");
    const [reportModal, setReportModal] = useState({ show: false, studentId: "", studentName: "" });
    const [reportReason, setReportReason] = useState("");

    useEffect(() => {
        if (!jobId) return;

        const unsubscribeJob = onSnapshot(doc(db, "jobs", jobId), (snap) => {
            if (snap.exists()) setJob({ id: snap.id, ...snap.data() });
        }, (err) => {
            console.error("İş verisi çekilemedi:", err);
            setError("İş bilgileri yüklenirken hata oluştu.");
        });

        const q = query(collection(db, "applications"), where("jobId", "==", jobId));
        const unsubscribeApps = onSnapshot(q, async (snap) => {
            const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            apps.sort((a, b) => {
                const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return dateB - dateA;
            });

            setApplicants(apps);
            setLoading(false);

            // Fetch each student's profile photo and email
            const photoMap = {};
            const emailMap = {};
            
            await Promise.all(apps.map(async (app) => {
                if (app.studentId) {
                    try {
                        const sDoc = await getDoc(doc(db, "students", app.studentId));
                        const uDoc = await getDoc(doc(db, "users", app.studentId));

                        if (sDoc.exists() && sDoc.data().photoUrl) {
                            photoMap[app.studentId] = sDoc.data().photoUrl;
                        } else if (uDoc.exists()) {
                            photoMap[app.studentId] = uDoc.data().photoURL || uDoc.data().photoUrl || "";
                        }

                        if (uDoc.exists() && uDoc.data().email) {
                            emailMap[app.studentId] = uDoc.data().email;
                        } else if (sDoc.exists() && sDoc.data().email) {
                            emailMap[app.studentId] = sDoc.data().email;
                        }
                    } catch (e) {
                        console.error("Öğrenci verisi çekilemedi:", e);
                    }
                }
            }));
            setStudentPhotos(photoMap);
            setStudentEmails(emailMap);

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

    const handleReportSubmit = async () => {
        if (!reportReason.trim()) return;
        try {
            // Write report
            await addDoc(collection(db, "reports"), {
                reporterId: job.companyId,
                reporterName: job.companyName,
                targetId: reportModal.studentId,
                targetName: reportModal.studentName,
                reason: reportReason,
                status: "pending",
                createdAt: serverTimestamp()
            });

            // Notify company
            await addDoc(collection(db, `notifications/${job.companyId}/items`), {
                type: "system",
                message: `${reportModal.studentName} hakkındaki ihbarınız merkeze iletildi. Gereği yapılacaktır.`,
                read: false,
                createdAt: serverTimestamp()
            });

            setReportModal({ show: false, studentId: "", studentName: "" });
            setReportReason("");
            setSuccess("İhbarınız başarıyla merkeze iletildi! 🛡️");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Report error:", err);
            setError("İhbar iletilemedi.");
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
                        {applicants.map(app => {
                            const isAccepted = app.status === "accepted";
                            const isRejected = app.status === "rejected";
                            const photoUrl = studentPhotos[app.studentId];
                            return (
                                <div key={app.id} className="applicant-card card">
                                    <div className="applicant-info">
                                        <div className="avatar avatar-md applicant-avatar">
                                            {photoUrl ? (
                                                <img src={photoUrl} alt={app.studentName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                                            ) : (
                                                <span>{app.studentName?.charAt(0)?.toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="applicant-name">{app.studentName}</h3>
                                            <p className="applicant-email">{studentEmails[app.studentId] || app.email || "E-posta belirtilmedi"}</p>
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
                                        {/* Status buttons: only show if NOT accepted or rejected */}
                                        {!isAccepted && !isRejected && (
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
                                        )}
                                        <div className="view-actions">
                                            {/* Profile button - navigates to student profile */}
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => navigate(`/student/profile/${app.studentId}`)}
                                            >
                                                👤 Profil
                                            </button>
                                            {app.cvUrl && (
                                                <>
                                                    <button
                                                        onClick={() => handleViewCV(app.cvUrl)}
                                                        className="btn btn-info btn-sm"
                                                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                                                    >
                                                        👁️ Görüntüle
                                                    </button>
                                                    <a
                                                        href={getDownloadCvUrl(app.cvUrl)}
                                                        download
                                                        className="btn btn-secondary btn-sm"
                                                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                                                    >
                                                        ⬇️ İndir
                                                    </a>
                                                </>
                                            )}
                                            <button
                                                className="btn btn-sm"
                                                style={{ backgroundColor: "rgba(255, 68, 68, 0.1)", color: "#ff4444", border: "1px solid rgba(255, 68, 68, 0.2)" }}
                                                onClick={() => setReportModal({ show: true, studentId: app.studentId, studentName: app.studentName })}
                                            >
                                                🛡️ Bildir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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

            {reportModal.show && (
                <div className="modal-overlay" style={{ zIndex: 11000 }}>
                    <div className="modal-content card" style={{ border: "1px solid #ff4444" }}>
                        <h3 style={{ color: "#ff4444" }}>🛡️ {reportModal.studentName} İhbar Et</h3>
                        <p className="mt-8 text-muted" style={{ fontSize: "14px" }}>
                            Bu öğrenci hakkında uygunsuz bir durum tespit ettiyseniz lütfen detaylandırın. 
                            Yönetici ihbarınızı inceleyecektir.
                        </p>
                        <div className="mt-16">
                            <p className="form-label">İhbar Nedeni</p>
                            <textarea
                                className="form-input"
                                style={{ borderColor: "rgba(255, 68, 68, 0.3)" }}
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                placeholder="Örn: Uygunsuz davranış, sahte özgeçmiş, mülakata gelmedi..."
                                rows={4}
                            />
                        </div>
                        <div className="modal-actions mt-24">
                            <button className="btn btn-secondary" onClick={() => setReportModal({ ...reportModal, show: false })}>İptal</button>
                            <button className="btn btn-danger" onClick={handleReportSubmit} disabled={!reportReason.trim()}>
                                İhbarı Gönder
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
