import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Briefcase, PlusCircle, Inbox, MapPin, Clock, Calendar, CheckCircle2, XCircle, Trash2, Users } from "lucide-react";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import "./CompanyJobs.css";

export default function CompanyJobs() {
    const { currentUser } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        let unsubscribe = () => { };
        setLoading(true);

        try {
            const q = query(
                collection(db, "jobs"),
                where("companyId", "==", currentUser.uid)
            );

            unsubscribe = onSnapshot(q, (snap) => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                // Safe memory sort
                data.sort((a, b) => {
                    const getMs = (val) => {
                        if (!val) return 0;
                        if (val.toMillis) return val.toMillis();
                        const d = new Date(val).getTime();
                        return isNaN(d) ? 0 : d;
                    };
                    return getMs(b.createdAt) - getMs(a.createdAt);
                });

                setJobs(data);
                setLoading(false);
            }, (err) => {
                console.error("İlanlar dinlenemedi:", err);
                setLoading(false);
            });
        } catch (err) {
            console.error("İlanlar başlatılamadı:", err);
            setLoading(false);
        }

        return () => unsubscribe();
    }, [currentUser]);

    const toggleJobStatus = async (jobId, currentStatus) => {
        const newStatus = currentStatus === "active" ? "closed" : "active";
        try {
            await updateDoc(doc(db, "jobs", jobId), { status: newStatus });
            setJobs(jobs.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
        } catch (err) {
            console.error("Durum güncellenemedi:", err);
            alert("Durum güncellenirken hata oluştu.");
        }
    };

    const deleteJob = async (jobId) => {
        if (!window.confirm("Bu ilanı silmek istediğinizden emin misiniz?")) return;
        try {
            await deleteDoc(doc(db, "jobs", jobId));
            setJobs(jobs.filter(j => j.id !== jobId));
        } catch (err) {
            console.error("İlan silinemedi:", err);
            alert("İlan silinirken hata oluştu.");
        }
    };

    return (
        <div className="page-wrapper">
            <div className="content-wrapper page-enter">
                <div className="dashboard-welcome">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div className="icon-box-primary">
                            <Briefcase size={24} color="var(--primary)" />
                        </div>
                        <div>
                            <h1 className="dashboard-title">İlanlarım</h1>
                            <p className="dashboard-subtitle">Yayınladığınız tüm staj ilanları</p>
                        </div>
                    </div>
                    <Link to="/company/post-job" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <PlusCircle size={18} /> Yeni İlan Ver
                    </Link>
                </div>

                {loading ? (
                    <div className="jobs-loading">
                        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />)}
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="empty-state card">
                        <Inbox size={48} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: 16 }} />
                        <p>Henüz ilan yayınlamadınız</p>
                        <Link to="/company/post-job" className="btn btn-primary btn-sm">Hemen İlan Ver</Link>
                    </div>
                ) : (
                    <div className="company-jobs-list">
                        {jobs.map(job => (
                            <div key={job.id} className="job-manage-card card">
                                <div className="job-manage-info">
                                    <h3 className="job-manage-title">{job.title}</h3>
                                    <div className="job-manage-meta">
                                        <span><MapPin size={14} /> {job.location}</span>
                                        <span><Clock size={14} /> {job.duration} ay</span>
                                        <span><Calendar size={14} /> {(() => {
                                            const d = job.createdAt?.toMillis ? new Date(job.createdAt.toMillis()) : (job.createdAt ? new Date(job.createdAt) : null);
                                            return d && !isNaN(d.getTime()) ? d.toLocaleDateString("tr-TR") : "Bilinmiyor";
                                        })()}</span>
                                    </div>
                                    <div className="job-manage-badges">
                                        <span className={`badge badge-${job.status === "active" ? "success" : "muted"}`}>
                                            {job.status === "active" ? "Aktif" : "Kapalı"}
                                        </span>
                                        <span className="badge badge-info">{job.type === "remote" ? "Uzaktan" : job.type === "hybrid" ? "Hibrit" : "Ofis"}</span>
                                    </div>
                                </div>
                                <div className="job-manage-actions">
                                    <Link to={`/company/jobs/${job.id}/applicants`} className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <Users size={16} /> Başvuranlar
                                    </Link>
                                    <button
                                        className={`btn btn-sm ${job.status === "active" ? "btn-warning" : "btn-success"}`}
                                        onClick={() => toggleJobStatus(job.id, job.status)}
                                        style={{ backgroundColor: job.status === "active" ? "var(--warning)" : "var(--success)", color: "white", display: "flex", alignItems: "center", gap: 6 }}
                                    >
                                        {job.status === "active" ? <><XCircle size={16} /> Kapat</> : <><CheckCircle2 size={16} /> Aç</>}
                                    </button>
                                    <button className="btn btn-danger btn-sm" onClick={() => deleteJob(job.id)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <Trash2 size={16} /> Sil
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
