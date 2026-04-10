import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { PlusCircle, Briefcase, CheckCircle2, Send, Clock, Inbox, Sparkles, LayoutGrid, ArrowRight, Zap } from "lucide-react";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import "./CompanyDashboard.css";

export default function CompanyDashboard() {
    const { currentUser, userProfile } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;
        let unsubscribeJobs = () => {};
        let unsubscribeApps = () => {};

        try {
            const jobsQ = query(collection(db, "jobs"), where("companyId", "==", currentUser.uid), limit(50));
            unsubscribeJobs = onSnapshot(jobsQ, (snap) => {
                const jobsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                jobsData.sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
                setJobs(jobsData);
            });

            const appsQ = query(collection(db, "applications"), where("companyId", "==", currentUser.uid), limit(100));
            unsubscribeApps = onSnapshot(appsQ, (snap) => {
                const appsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                appsData.sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
                setApplications(appsData);
                setLoading(false);
            });
        } catch (err) {
            console.error(err); setLoading(false);
        }
        return () => { unsubscribeJobs(); unsubscribeApps(); };
    }, [currentUser]);

    if (loading) return <div className="page-wrapper"><div className="loader">Komuta Merkezi Hazırlanıyor...</div></div>;

    const activeJobs = jobs.filter(j => j.status === "active").length;
    const pendingApps = applications.filter(a => a.status === "pending").length;

    return (
        <div className="page-wrapper company-dashboard-omega">
            <div className="command-deck-grid">
                
                {/* OMEGA HERO: Welcome Section */}
                <div className="bento-hero-omega">
                    <div className="hero-content-omega">
                        <div className="badge-omega" style={{ marginBottom: 16 }}>STATUS: OPERATIONAL</div>
                        <h1>
                            Merhaba,<br/>
                            {userProfile?.companyName || "Şirket Yöneticisi"}
                        </h1>
                        <p style={{ maxWidth: 500, opacity: 0.8, fontSize: 18, lineHeight: 1.6, marginBottom: 32 }}>
                            Yetenek havuzunuzu ve aktif ilanlarınızı tek bir otonom deck üzerinden kontrol edin.
                        </p>
                        <div style={{ display: 'flex', gap: 16 }}>
                            <Link to="/company/jobs" className="btn-save-omega" style={{ width: 'auto', padding: '16px 40px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <LayoutGrid size={20} /> İLANLARI YÖNET
                            </Link>
                        </div>
                    </div>
                </div>

                {/* QUICK LAUNCH: Post Job */}
                <div className="bento-action-omega">
                    <div className="icon-badge-omega" style={{ background: 'var(--gradient-warning)', marginBottom: 20 }}>
                        <Zap size={32} />
                    </div>
                    <h3 style={{ fontSize: 24, fontWeight: 900, color: 'white' }}>YENİ YÖRÜNGE</h3>
                    <p style={{ opacity: 0.6, fontSize: 14, marginBottom: 24 }}>Yeni bir yetenek arayışı başlatın</p>
                    <Link to="/company/post-job" className="btn-save-omega" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 8 }}>
                        <PlusCircle size={18} /> İLAN OLUŞTUR
                    </Link>
                </div>

                {/* STATS DECK */}
                <div className="stat-card-omega">
                    <div>
                        <span className="stat-label-omega">TOPLAM İLAN</span>
                        <span className="stat-value-omega" style={{ color: 'var(--primary-light)' }}>{jobs.length}</span>
                    </div>
                    <Briefcase size={40} opacity={0.1} />
                </div>

                <div className="stat-card-omega">
                    <div>
                        <span className="stat-label-omega">AKTİF YAYIN</span>
                        <span className="stat-value-omega" style={{ color: 'var(--emerald-400)' }}>{activeJobs}</span>
                    </div>
                    <CheckCircle2 size={40} opacity={0.1} />
                </div>

                <div className="stat-card-omega">
                    <div>
                        <span className="stat-label-omega">BAŞVURU AKIŞI</span>
                        <span className="stat-value-omega" style={{ color: 'var(--blue-400)' }}>{applications.length}</span>
                    </div>
                    <Send size={40} opacity={0.1} />
                </div>

                <div className="stat-card-omega">
                    <div>
                        <span className="stat-label-omega">AKSİYON BEKLEYEN</span>
                        <span className="stat-value-omega" style={{ color: 'var(--warning)' }}>{pendingApps}</span>
                    </div>
                    <Clock size={40} opacity={0.1} />
                </div>

                {/* RECENT APPLICATIONS LIST */}
                <div className="bento-list-omega">
                    <div className="list-header-omega">
                        <div className="list-title-omega">
                            <Inbox size={20} color="var(--warning)" /> SON BAŞVURULAR
                        </div>
                        <Link to="/company/jobs" style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800 }}>TÜMÜ <ArrowRight size={14} /></Link>
                    </div>
                    <div className="omega-item-stack" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {applications.length === 0 ? (
                            <p style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Henüz veri akışı yok.</p>
                        ) : (
                            applications.slice(0, 5).map(app => (
                                <div key={app.id} className="omega-item-row">
                                    <div className="item-avatar-pro" style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,180,0,0.1)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                                        {app.studentName?.charAt(0) || "U"}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 15, fontWeight: 700 }}>{app.studentName}</div>
                                        <div style={{ fontSize: 12, opacity: 0.6 }}>{app.jobTitle}</div>
                                    </div>
                                    <span className="item-badge-omega" style={{ 
                                        background: app.status === "pending" ? 'rgba(251,191,36,0.1)' : app.status === "accepted" ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                        color: app.status === "pending" ? '#fbbf24' : app.status === "accepted" ? '#22c55e' : '#ef4444'
                                    }}>
                                        {app.status === "pending" ? "BEKLİYOR" : app.status === "accepted" ? "ONAY" : "RED"}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ACTIVE JOBS LIST */}
                <div className="bento-list-omega">
                    <div className="list-header-omega">
                        <div className="list-title-omega">
                            <LayoutGrid size={20} color="var(--primary-light)" /> AKTİF İLANLAR
                        </div>
                        <Link to="/company/jobs" style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800 }}>YÖNET <ArrowRight size={14} /></Link>
                    </div>
                    <div className="omega-item-stack" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {jobs.length === 0 ? (
                            <p style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Yayında ilan bulunamadı.</p>
                        ) : (
                            jobs.slice(0, 5).map(job => (
                                <Link to={`/company/jobs`} key={job.id} className="omega-item-row">
                                    <div className="item-avatar-pro" style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.1)', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Briefcase size={20} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 15, fontWeight: 700 }}>{job.title}</div>
                                        <div style={{ fontSize: 12, opacity: 0.6 }}>{job.location} • {job.type}</div>
                                    </div>
                                    <span className={`item-badge-omega ${job.status === "active" ? "active" : ""}`} style={{
                                        background: job.status === "active" ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                                        color: job.status === "active" ? '#22c55e' : 'var(--text-muted)'
                                    }}>
                                        {job.status === "active" ? "YAYINDA" : "KAPALI"}
                                    </span>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

