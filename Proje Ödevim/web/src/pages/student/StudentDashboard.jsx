import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { Send, Clock, CheckCircle2, XCircle, Search, Star, Edit3, Briefcase, Inbox, Globe, MapPin, Eye } from "lucide-react";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import "./Dashboard.css";

export default function StudentDashboard() {
    const { currentUser, userProfile } = useAuth();
    const [applications, setApplications] = useState([]);
    const [recommendedJobs, setRecommendedJobs] = useState([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!currentUser) return;

        let unsubscribeApps = () => { };
        let unsubscribeJobs = () => { };

        try {
            // Real-time başvuru dinleyicisi
            const appsQ = query(
                collection(db, "applications"),
                where("studentId", "==", currentUser.uid),
                limit(50)
            );

            unsubscribeApps = onSnapshot(appsQ, (snap) => {
                try {
                    const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                    // Safe memory sort
                    apps.sort((a, b) => {
                        const getMs = (val) => {
                            if (!val) return 0;
                            if (val.toMillis) return val.toMillis();
                            const d = new Date(val).getTime();
                            return isNaN(d) ? 0 : d;
                        };
                        return getMs(b.createdAt) - getMs(a.createdAt);
                    });

                    const recentApps = apps.slice(0, 5);
                    setApplications(recentApps);
                    setStats({
                        total: apps.length,
                        pending: apps.filter(a => a.status === "pending").length,
                        accepted: apps.filter(a => a.status === "accepted").length,
                        rejected: apps.filter(a => a.status === "rejected").length,
                    });
                    setLoading(false);
                } catch (err) {
                    console.error("Dashboard Apps processing error:", err);
                    setLoading(false);
                }
            }, (err) => {
                console.error("Dashboard Apps Fetch error:", err);
                setLoading(false);
            });

            // Real-time önerilen ilanlar
            const jobsQ = query(
                collection(db, "jobs"),
                where("status", "==", "active"),
                limit(20)
            );

            unsubscribeJobs = onSnapshot(jobsQ, (snap) => {
                try {
                    const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                    // Safe memory sort
                    jobs.sort((a, b) => {
                        const getMs = (val) => {
                            if (!val) return 0;
                            if (val.toMillis) return val.toMillis();
                            const d = new Date(val).getTime();
                            return isNaN(d) ? 0 : d;
                        };
                        return getMs(b.createdAt) - getMs(a.createdAt);
                    });

                    setRecommendedJobs(jobs.slice(0, 4));
                } catch (err) {
                    console.error("Dashboard Jobs processing error:", err);
                }
            }, (err) => {
                console.error("Dashboard Jobs Fetch error:", err);
                setRecommendedJobs(DEMO_REC_JOBS);
            });
        } catch (err) {
            console.error("Dashboard Init error:", err);
            setLoading(false);
        }

        return () => {
            unsubscribeApps();
            unsubscribeJobs();
        };
    }, [currentUser]);

    const statusInfo = {
        "pending": { label: "Beklemede", color: "warning", icon: <Clock size={14} /> },
        "reviewing": { label: "İncelenen", color: "info", icon: <Eye size={14} /> },
        "accepted": { label: "Kabul", color: "success", icon: <CheckCircle2 size={14} /> },
        "rejected": { label: "Reddedilen", color: "danger", icon: <XCircle size={14} /> },
    };

    if (loading) return (
        <div className="page-wrapper">
            <div className="content-wrapper">
                <div className="dashboard-welcome">
                    <h1 className="dashboard-title">⌛ Yükleniyor...</h1>
                </div>
                <div className="stats-grid">
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
                </div>
                <div className="dashboard-grid mt-24">
                    <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
                    <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="page-wrapper">
            <div className="content-wrapper page-enter">
                {/* Welcome */}
                <div className="dashboard-welcome">
                    <div>
                        <h1 className="dashboard-title">
                            Merhaba, {currentUser?.displayName ? currentUser.displayName.split(" ")[0] : "Öğrenci"} 👋
                        </h1>
                        <p className="dashboard-subtitle">Bugün nasıl gidiyor? İşte başvuru özetin:</p>
                    </div>
                    <Link to="/jobs" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Search size={18} /> İlan Ara
                    </Link>
                </div>

                {/* Stats */}
                <div className="stats-grid">
                    <StatCard icon={<Send size={22} />} label="Toplam Başvuru" value={stats.total} color="primary" />
                    <StatCard icon={<Clock size={22} />} label="Beklemede" value={stats.pending} color="warning" />
                    <StatCard icon={<CheckCircle2 size={22} />} label="Kabul" value={stats.accepted} color="success" />
                    <StatCard icon={<XCircle size={22} />} label="Reddedildi" value={stats.rejected} color="danger" />
                </div>

                <div className="dashboard-grid">
                    {/* Recent Applications */}
                    <div className="card">
                        <div className="section-header">
                            <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Send size={20} color="var(--info)" /> Son Başvurularım
                            </h2>
                            <Link to="/student/applications" className="see-all">Tümünü Gör →</Link>
                        </div>
                        {loading ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 8 }} />)}
                            </div>
                        ) : applications.length === 0 ? (
                            <div className="empty-state">
                                <Inbox size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                                <p>Henüz başvurun yok</p>
                                <Link to="/jobs" className="btn btn-primary btn-sm">İlan Ara</Link>
                            </div>
                        ) : (
                            <div className="apps-list">
                                {applications.map((app) => {
                                    const s = statusInfo[app.status] || statusInfo.pending;
                                    return (
                                        <div key={app.id} className="app-item">
                                            <div className="app-info">
                                                <p className="app-title">{app.jobTitle}</p>
                                                <p className="app-company">{app.companyName}</p>
                                            </div>
                                            <span className={`badge badge-${s.color}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                {s.icon} {s.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Recommended Jobs */}
                    <div className="card">
                        <div className="section-header">
                            <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Star size={20} color="var(--warning)" /> Önerilen İlanlar
                            </h2>
                            <Link to="/jobs" className="see-all">Tümünü Gör →</Link>
                        </div>
                        <div className="rec-jobs-list">
                            {recommendedJobs.map((job) => (
                                <Link to={`/jobs/${job.id}`} key={job.id} className="rec-job-item">
                                    <div className="avatar avatar-sm rec-job-logo">
                                        {job.companyName?.charAt(0)}
                                    </div>
                                    <div className="rec-job-info">
                                        <p className="rec-job-title">{job.title}</p>
                                        <p className="rec-job-company">{job.companyName} · {job.location}</p>
                                    </div>
                                    <span className="rec-job-type">
                                        {job.type === "remote" ? <Globe size={16} /> : <MapPin size={16} />}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Profile Completion / Admin Panel */}
                <div className="card profile-card">
                    <div className="profile-card-info" style={{ display: "flex", gap: 16 }}>
                        <div className="icon-box-secondary">
                            <Edit3 size={24} color="var(--primary)" />
                        </div>
                        <div>
                            <h3>Profilini Tamamla</h3>
                            <p>Şirketlerin seni bulmasını kolaylaştır. CV yükle, becerilerini ve üniversiteni ekle.</p>
                        </div>
                    </div>
                    <Link to="/student/profile" className="btn btn-secondary">Profile Git →</Link>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    return (
        <div className={`stat-card stat-card-${color}`}>
            <span className="stat-icon">{icon}</span>
            <div>
                <p className="stat-value">{value}</p>
                <p className="stat-label">{label}</p>
            </div>
        </div>
    );
}

const DEMO_APPS = [
    { id: "1", jobTitle: "Frontend Geliştirici Stajyeri", companyName: "TechCorp", status: "accepted" },
    { id: "2", jobTitle: "UI/UX Tasarım Stajyeri", companyName: "DesignHub", status: "pending" },
    { id: "3", jobTitle: "Pazarlama Stajyeri", companyName: "MarketPro", status: "rejected" },
];
const DEMO_REC_JOBS = [
    { id: "1", title: "Frontend Geliştirici Stajyeri", companyName: "TechCorp", location: "İstanbul", type: "remote" },
    { id: "2", title: "UI/UX Tasarım Stajyeri", companyName: "DesignHub", location: "Ankara", type: "hybrid" },
    { id: "4", title: "Backend Developer Stajyeri", companyName: "DataSoft", location: "Uzaktan", type: "remote" },
];
