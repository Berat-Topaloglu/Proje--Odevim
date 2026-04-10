import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { 
    ClipboardCheck, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Eye, 
    Inbox, 
    LayoutGrid, 
    ShieldCheck, 
    AlertCircle,
    ArrowRightCircle,
    Search
} from "lucide-react";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import "./StudentApplications.css";

const BOARD_STEPS = [
    { key: "pending", label: "Beklemede", icon: <Clock size={14} />, color: "#f59e0b" },
    { key: "reviewing", label: "İncelemede", icon: <Eye size={14} />, color: "#6366f1" },
    { key: "accepted", label: "Sonuçlandı", icon: <CheckCircle2 size={14} />, color: "#10b981" }
];

export default function StudentApplications() {
    const { currentUser } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        if (!currentUser) return;
        let unsubscribe = () => { };
        try {
            const q = query(collection(db, "applications"), where("studentId", "==", currentUser.uid));
            unsubscribe = onSnapshot(q, (snap) => {
                const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                apps.sort((a, b) => {
                    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
                    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
                    return timeB - timeA;
                });
                setApplications(apps);
                setLoading(false);
            });
        } catch (err) { console.error(err); setLoading(false); }
        return () => unsubscribe();
    }, [currentUser]);

    const filtered = applications.filter(a => filter === "all" || a.status === filter);

    const getProgressIndex = (status) => {
        if (status === "pending") return 0;
        if (status === "reviewing") return 1;
        if (status === "accepted" || status === "rejected") return 2;
        return 0;
    };

    if (loading) return (
        <div className="page-wrapper" style={{ paddingTop: 100 }}>
            <div className="content-wrapper skeleton-loading">
                <div className="skeleton" style={{ height: 200, borderRadius: 24, marginBottom: 40 }} />
                <div className="apps-grid-omega">
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 300, borderRadius: 24 }} />)}
                </div>
            </div>
        </div>
    );

    return (
        <div className="page-wrapper" style={{ paddingTop: 'calc(var(--navbar-height) + 24px)' }}>
            <div className="content-wrapper apps-board-container">
                
                {/* OMEGA HEADER */}
                <header className="apps-header-omega">
                    <div className="header-left-pro">
                        <h1><LayoutGrid size={32} style={{ verticalAlign: 'middle', marginRight: 12, color: 'var(--primary)' }} /> Operasyon Panosu</h1>
                        <p>{applications.length} Aktif Sinyal İzleniyor</p>
                    </div>
                    <Link to="/jobs" className="btn btn-primary" style={{ padding: '16px 32px', borderRadius: 'var(--radius-full)' }}>
                        <Search size={18} style={{ marginRight: 8 }} /> Yeni Görev Ara
                    </Link>
                </header>

                {/* FILTER CONTROLLER */}
                <div className="apps-filter-bar">
                    {[
                        { key: "all", label: "TÜMÜ", icon: <Inbox size={14}/> },
                        { key: "pending", label: "BEKLEYEN", icon: <Clock size={14}/> },
                        { key: "reviewing", label: "İNCELENEN", icon: <Eye size={14}/> },
                        { key: "accepted", label: "KABUL", icon: <ShieldCheck size={14}/> },
                        { key: "rejected", label: "RET", icon: <AlertCircle size={14}/> }
                    ].map(t => (
                        <button
                            key={t.key}
                            className={`filter-btn-pro ${filter === t.key ? "active" : ""}`}
                            onClick={() => setFilter(t.key)}
                        >
                            {t.icon} {t.label} 
                            <span className="tab-count-pro">
                                {t.key === "all" ? applications.length : applications.filter(a => a.status === t.key).length}
                            </span>
                        </button>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div className="empty-omega-pro">
                        <Inbox size={64} style={{ opacity: 0.2, marginBottom: 24 }} />
                        <h3>İletişim Kesildi</h3>
                        <p>Henüz bu frekansta yakalanan bir başvuru sinyali yok.</p>
                        <Link to="/jobs" className="btn btn-primary mt-24">Taramaya Başla</Link>
                    </div>
                ) : (
                    <div className="apps-grid-omega">
                        {filtered.map(app => {
                            const pIndex = getProgressIndex(app.status);
                            const isRejected = app.status === "rejected";
                            const createdDate = app.createdAt?.toMillis ? new Date(app.createdAt.toMillis()) : new Date(app.createdAt);

                            return (
                                <div key={app.id} className={`app-card-omega ${isRejected ? 'rejected-glow' : ''}`}>
                                    <div className="card-top-omega">
                                        <div className="logo-box-omega">
                                            {app.companyName?.charAt(0)}
                                        </div>
                                        <div className="title-box-omega">
                                            <h3>{app.jobTitle}</h3>
                                            <p>{app.companyName}</p>
                                        </div>
                                    </div>

                                    {/* OMEGA STEPPER */}
                                    <div className="app-stepper">
                                        {BOARD_STEPS.map((step, idx) => (
                                            <div key={idx} className={`step-omega ${pIndex >= idx ? 'active' : ''}`} 
                                                 style={pIndex >= idx ? { borderColor: step.color, background: pIndex === idx ? step.color : '' } : {}}>
                                                {isRejected && idx === 2 ? <XCircle size={14} color="#ef4444" /> : step.icon}
                                                <span className="step-label-pro" style={pIndex >= idx ? { color: step.color, opacity: 1 } : {}}>
                                                    {isRejected && idx === 2 ? "REDDEDİLDİ" : step.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="app-footer-omega">
                                        <span className="app-date-pro">
                                            {createdDate.toLocaleDateString("tr-TR")} • {app.location || "İstanbul"}
                                        </span>
                                        <Link to={`/jobs/${app.jobId}`} className="btn-view-pro">
                                            MİSYON DETAYI <ArrowRightCircle size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

