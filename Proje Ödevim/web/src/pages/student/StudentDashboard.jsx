import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { Send, Clock, CheckCircle2, XCircle, Search, Star, Edit3, Sparkles, LayoutGrid, MapPin, Globe } from "lucide-react";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { sortByDateDesc } from "../../utils/helpers";
import "./Dashboard.css"; // now using Bento Box CSS

export default function StudentDashboard() {
    const { currentUser, userProfile } = useAuth();
    const [applications, setApplications] = useState([]);
    const [recommendedJobs, setRecommendedJobs] = useState([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        let unsubscribeApps = () => { };
        let unsubscribeJobs = () => { };

        try {
            const appsQ = query(collection(db, "applications"), where("studentId", "==", currentUser.uid), limit(50));
            unsubscribeApps = onSnapshot(appsQ, (snap) => {
                const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                apps.sort(sortByDateDesc);
                setApplications(apps.slice(0, 5));
                setStats({
                    total: apps.length,
                    pending: apps.filter(a => a.status === "pending").length,
                    accepted: apps.filter(a => a.status === "accepted").length,
                    rejected: apps.filter(a => a.status === "rejected").length,
                });
                setLoading(false);
            });

            const jobsQ = query(collection(db, "jobs"), where("status", "==", "active"), limit(20));
            unsubscribeJobs = onSnapshot(jobsQ, (snap) => {
                const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                jobs.sort(sortByDateDesc);
                setRecommendedJobs(jobs.slice(0, 5));
            });
        } catch (err) {
            console.error(err); setLoading(false);
        }

        return () => { unsubscribeApps(); unsubscribeJobs(); };
    }, [currentUser]);

    const statusMap = {
        "pending": { color: "warning", icon: <Clock /> },
        "reviewing": { color: "primary", icon: <Star /> },
        "accepted": { color: "success", icon: <CheckCircle2 /> },
        "rejected": { color: "danger", icon: <XCircle /> },
    };

    // --- MEGA FEATURE: PROFIL TAMAMLAMA (Profile Completeness Engine) ---
    const calculateProfileCompletion = () => {
        let score = 0;
        if (currentUser?.displayName) score += 15;
        if (userProfile?.photoUrl) score += 15;
        if (userProfile?.department) score += 15;
        if (userProfile?.university) score += 15;
        if (userProfile?.gpa) score += 10;
        if (userProfile?.bio) score += 15;
        if (userProfile?.skills && userProfile.skills.length > 0) score += 15;
        return score > 100 ? 100 : score;
    };
    const completionScore = calculateProfileCompletion();

    if (loading) return (
        <div className="page-wrapper page-enter">
            <h1 style={{color: 'white', padding: 40}}>Bento Yükleniyor...</h1>
        </div>
    );

    return (
        <div className="page-wrapper page-enter">
            <div className="bento-container">
                
                {/* 1. Welcome Hero (Spans 8 cols, 2 rows) */}
                <div className="bento-card bento-welcome">
                    <h1>
                        Tasarımcı,<br/>
                        Hoşgeldin {currentUser?.displayName?.split(" ")[0]} <Sparkles color="var(--primary)" size={32}/>
                    </h1>
                    <p>
                        Staj arayışında yeni bir boyuta hoşgeldin. Kariyerini şekillendirecek ilanlar ve başvuruların hepsi tek bir devasa yapıda.
                    </p>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <Link to="/jobs" className="btn btn-primary" style={{ padding: '16px 32px', borderRadius: 'var(--radius-full)', fontSize: 16 }}>
                            <Search size={20} style={{ marginRight: 8 }} /> İlan Keşfet
                        </Link>
                    </div>
                </div>

                {/* 2. Mini Profile Widget (Spans 4 cols, 2 rows) */}
                <div className="bento-card bento-profile">
                    <div className="bento-profile-inner">
                        <div style={{display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24}}>
                            <div className="avatar-xl" style={{marginBottom: 0, width: 80, height: 80}}>
                                {userProfile?.photoUrl ? <img src={userProfile?.photoUrl} alt="Avatar"/> : (currentUser?.displayName?.[0] || "S")}
                            </div>
                            
                            {/* PROFİL TAMAMLAMA WIDGET */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{
                                    width: 80, height: 80, borderRadius: '50%',
                                    background: `conic-gradient(var(--secondary) ${completionScore}%, rgba(255,255,255,0.05) 0)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: `0 0 20px rgba(168, 85, 247, ${completionScore / 200})`
                                }}>
                                    <div style={{
                                        width: 70, height: 70, borderRadius: '50%', background: 'var(--bg-card)', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 20, fontWeight: 900, color: 'white'
                                    }}>
                                        %{completionScore}
                                    </div>
                                </div>
                                <span style={{fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontWeight: 700, textTransform: 'uppercase'}}>Doluluk</span>
                            </div>
                        </div>

                        <h3 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: 0 }}>{currentUser?.displayName}</h3>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, marginTop: 4, marginBottom: 24 }}>
                            {userProfile?.department || "Bölüm Belirtilmedi"}
                        </p>
                        <Link to="/student/profile" className="profile-btn-glow">
                            <Edit3 size={18} style={{marginRight: 8, verticalAlign: 'text-bottom'}}/> Profesyonel Görünüm
                        </Link>
                    </div>
                </div>

                {/* 3. The 4 Stats (Each spans 3 cols, 1 row) */}
                <div className="bento-card bento-stat primary">
                    <div>
                        <span className="stat-large-val">{stats.total}</span>
                        <span className="stat-large-label">Başvuru Özeti</span>
                    </div>
                    <div className="icon-wrapper"><Send /></div>
                </div>

                <div className="bento-card bento-stat warning">
                    <div>
                        <span className="stat-large-val">{stats.pending}</span>
                        <span className="stat-large-label">Beklemede</span>
                    </div>
                    <div className="icon-wrapper"><Clock /></div>
                </div>

                <div className="bento-card bento-stat success">
                    <div>
                        <span className="stat-large-val">{stats.accepted}</span>
                        <span className="stat-large-label">Kabul Edilen</span>
                    </div>
                    <div className="icon-wrapper"><CheckCircle2 /></div>
                </div>

                <div className="bento-card bento-stat danger">
                    <div>
                        <span className="stat-large-val">{stats.rejected}</span>
                        <span className="stat-large-label">Reddedilen</span>
                    </div>
                    <div className="icon-wrapper"><XCircle /></div>
                </div>

                {/* 4. Applications Board (Spans 6 cols, 3 rows) */}
                <div className="bento-card bento-tall amber">
                    <div className="bento-title">
                        <span><LayoutGrid size={24} style={{marginRight: 10, verticalAlign: 'text-bottom', color: 'var(--primary)'}} /> Aksiyon Bekleyenler</span>
                        <Link to="/student/applications" className="bento-title-link">Tümü</Link>
                    </div>
                    {applications.length === 0 ? (
                        <div className="bento-empty">
                            <Send />
                            <p>Tüm radar temiz. Yeni bir maceraya atıl.</p>
                        </div>
                    ) : (
                        <div className="bento-list">
                            {applications.map(app => {
                                const s = statusMap[app.status] || statusMap.pending;
                                return (
                                    <div key={app.id} className="bento-list-item">
                                        <div className="item-avatar" style={{background: `rgba(var(--${s.color}-rgb), 0.15)`, color: `var(--${s.color})`}}>
                                            {s.icon}
                                        </div>
                                        <div className="item-info">
                                            <div className="item-title">{app.jobTitle}</div>
                                            <div className="item-meta">{app.companyName}</div>
                                        </div>
                                        <span className={`badge badge-${s.color}`}>{app.status.toUpperCase()}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* 5. Recommended Jobs Feed (Spans 6 cols, 3 rows) */}
                <div className="bento-card bento-wide">
                    <div className="bento-title">
                        <span><Star size={24} style={{marginRight: 10, verticalAlign: 'text-bottom', color: 'var(--warning)'}} /> Sizin İçin Vitrin Yıldızları</span>
                        <Link to="/jobs" className="bento-title-link" style={{background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)'}}>Vitrin</Link>
                    </div>
                    {recommendedJobs.length === 0 ? (
                        <div className="bento-empty">
                            <Search />
                            <p>Şu an sana uygun yıldız bulamadık.</p>
                        </div>
                    ) : (
                        <div className="bento-list">
                            {recommendedJobs.map(job => {
                                const matchPercentage = (() => {
                                    if (!job.skills || job.skills.length === 0) return 0;
                                    const sSkills = (userProfile?.skills || []).map(s => s.toLowerCase().trim());
                                    const jSkills = job.skills.map(s => s.toLowerCase().trim());
                                    const matchCount = jSkills.filter(js => sSkills.includes(js)).length;
                                    return Math.round((matchCount / jSkills.length) * 100);
                                })();

                                return (
                                <Link to={`/jobs/${job.id}`} key={job.id} className="bento-list-item">
                                    <div className="item-avatar">{job.companyName?.charAt(0)}</div>
                                    <div className="item-info">
                                        <div className="item-title">{job.title}</div>
                                        <div className="item-meta">
                                            {job.type === "remote" ? <Globe size={14} /> : <MapPin size={14} />} 
                                            {job.companyName} • {job.location || "Lokasyon Yok"}
                                        </div>
                                        <div style={{marginTop: 8}}>
                                            <span style={{
                                                fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 4,
                                                background: matchPercentage >= 75 ? 'rgba(34, 197, 94, 0.15)' : matchPercentage >= 40 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                                                color: matchPercentage >= 75 ? '#4ade80' : matchPercentage >= 40 ? '#fbbf24' : 'var(--text-muted)'
                                            }}>
                                                ⚡ {matchPercentage > 0 ? `%${matchPercentage} Otonom Uyum` : 'Analiz Ediliyor'}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
