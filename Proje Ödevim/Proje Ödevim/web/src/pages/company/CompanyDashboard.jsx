import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { LayoutDashboard, PlusCircle, Briefcase, CheckCircle2, Send, Clock, Inbox } from "lucide-react";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import "../student/Dashboard.css";

export default function CompanyDashboard() {
    const { currentUser } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        let unsubscribeJobs = () => { };
        let unsubscribeApps = () => { };

        try {
            // Real-time ilan dinleyicisi
            const jobsQ = query(
                collection(db, "jobs"),
                where("companyId", "==", currentUser.uid),
                limit(50)
            );

            unsubscribeJobs = onSnapshot(jobsQ, (snap) => {
                try {
                    const jobsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                    // Safe memory sort
                    jobsData.sort((a, b) => {
                        const getMs = (val) => {
                            if (!val) return 0;
                            if (val.toMillis) return val.toMillis();
                            const d = new Date(val).getTime();
                            return isNaN(d) ? 0 : d;
                        };
                        return getMs(b.createdAt) - getMs(a.createdAt);
                    });

                    setJobs(jobsData);
                } catch (err) {
                    console.error("Dashboard jobs processing error:", err);
                }
            }, (err) => {
                console.error("Dashboard jobs fetch error:", err);
                setJobs(DEMO_JOBS);
            });

            // Real-time başvuru dinleyicisi
            const appsQ = query(
                collection(db, "applications"),
                where("companyId", "==", currentUser.uid),
                limit(100)
            );

            unsubscribeApps = onSnapshot(appsQ, (snap) => {
                try {
                    const appsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                    // Safe memory sort
                    appsData.sort((a, b) => {
                        const getMs = (val) => {
                            if (!val) return 0;
                            if (val.toMillis) return val.toMillis();
                            const d = new Date(val).getTime();
                            return isNaN(d) ? 0 : d;
                        };
                        return getMs(b.createdAt) - getMs(a.createdAt);
                    });

                    setApplications(appsData);
                    setLoading(false);
                } catch (err) {
                    console.error("Dashboard apps processing error:", err);
                    setLoading(false);
                }
            }, (err) => {
                console.error("Dashboard apps fetch error:", err);
                setApplications(DEMO_APPS);
                setLoading(false);
            });
        } catch (err) {
            console.error("Dashboard init error:", err);
            setLoading(false);
        }

        return () => {
            unsubscribeJobs();
            unsubscribeApps();
        };
    }, [currentUser]);

    if (loading) return (
        <div className="page-wrapper">
            <div className="content-wrapper">
                <div className="dashboard-welcome">
                    <h1 className="dashboard-title">⌛ Yükleniyor...</h1>
                </div>
                <div className="stats-grid">
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
                </div>
            </div>
        </div>
    );

    const activeJobs = jobs.filter(j => j.status === "active").length;
    const pendingApps = applications.filter(a => a.status === "pending").length;

    return (
        <div className="page-wrapper">
            <div className="content-wrapper page-enter">
                <div className="dashboard-welcome">
                    <div>
                        <h1 className="dashboard-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            Şirket Paneli <LayoutDashboard size={28} color="var(--primary)" />
                        </h1>
                        <p className="dashboard-subtitle">İlanlarınızı ve başvuruları yönetin</p>
                    </div>
                    <Link to="/company/post-job" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <PlusCircle size={18} /> İlan Ver
                    </Link>
                </div>

                {/* Stats */}
                <div className="stats-grid">
                    <StatCard icon={<Briefcase size={22} />} label="Toplam İlan" value={jobs.length} color="primary" />
                    <StatCard icon={<CheckCircle2 size={22} />} label="Aktif İlan" value={activeJobs} color="success" />
                    <StatCard icon={<Send size={22} />} label="Toplam Başvuru" value={applications.length} color="info" />
                    <StatCard icon={<Clock size={22} />} label="Bekleyen" value={pendingApps} color="warning" />
                </div>

                <div className="dashboard-grid">
                    {/* Active Jobs */}
                    <div className="card">
                        <div className="section-header">
                            <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Briefcase size={20} color="var(--primary)" /> Son İlanlar
                            </h2>
                            <Link to="/company/jobs" className="see-all">Tümünü Gör →</Link>
                        </div>
                        {loading ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8 }} />)}
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="empty-state text-center" style={{ padding: '32px 16px' }}>
                                <Briefcase size={40} style={{ opacity: 0.3, marginBottom: 16, color: 'var(--primary)' }} />
                                <p style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-secondary)', maxWidth: '280px', margin: '0 auto' }}>
                                    Geleceğin yeteneklerini keşfetmeye hazır mısınız? <br/>
                                    <strong>İstediğiniz kriterlerde ilk ilanınızı hemen oluşturun!</strong>
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {jobs.slice(0, 4).map(job => (
                                    <div key={job.id} className="app-item">
                                        <div className="app-info">
                                            <p className="app-title">{job.title}</p>
                                            <p className="app-company">{job.type === "remote" ? "Uzaktan" : job.type === "hybrid" ? "Hibrit" : "Ofis"} · {job.location}</p>
                                        </div>
                                        <span className={`badge badge-${job.status === "active" ? "success" : "muted"}`}>
                                            {job.status === "active" ? "Aktif" : "Kapalı"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Applications */}
                    <div className="card">
                        <div className="section-header">
                            <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Send size={20} color="var(--info)" /> Son Başvurular
                            </h2>
                            <Link to="/company/jobs" className="see-all">Tümünü Gör →</Link>
                        </div>
                        {loading ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8 }} />)}
                            </div>
                        ) : applications.length === 0 ? (
                            <div className="empty-state">
                                <Inbox size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                                <p>Henüz başvuru yok</p>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {applications
                                    .slice(0, 4)
                                    .map(app => (
                                    <div key={app.id} className="app-item">
                                        <div className="app-info">
                                            <p className="app-title">{app.studentName}</p>
                                            <p className="app-company">{app.jobTitle}</p>
                                        </div>
                                        <span className={`badge badge-${app.status === "pending" ? "warning" : app.status === "accepted" ? "success" : "danger"}`}>
                                            {app.status === "pending" ? "⏳ Bekliyor" : app.status === "accepted" ? "✅ Kabul" : "❌ Red"}
                                        </span>
                                    </div>
                                ))}
                                {applications.filter(a => a.status === "pending").length === 0 && (
                                    <p className="text-center p-8 text-xs animate-pulse" style={{ color: "var(--success)", background: "rgba(74, 222, 128, 0.05)", borderRadius: 8, marginTop: 8 }}>
                                        ✨ Bekleyen başvuru yok
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
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

const DEMO_JOBS = [
    { id: "j1", title: "Frontend Geliştirici Stajyeri", type: "remote", location: "İstanbul", status: "active" },
    { id: "j2", title: "Backend Developer Stajyeri", type: "hybrid", location: "Ankara", status: "active" },
];
const DEMO_APPS = [
    { id: "a1", studentName: "Ahmet Yılmaz", jobTitle: "Frontend Geliştirici Stajyeri", status: "pending" },
    { id: "a2", studentName: "Zeynep Kaya", jobTitle: "Backend Developer Stajyeri", status: "accepted" },
    { id: "a3", studentName: "Mehmet Demir", jobTitle: "Frontend Geliştirici Stajyeri", status: "pending" },
];
