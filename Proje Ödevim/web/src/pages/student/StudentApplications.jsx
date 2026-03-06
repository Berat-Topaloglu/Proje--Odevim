import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import "../student/Dashboard.css";

const STATUS_INFO = {
    pending: { label: "Beklemede", color: "warning", icon: "⏳" },
    reviewing: { label: "İncelenen", color: "info", icon: "👀" },
    accepted: { label: "Kabul", color: "success", icon: "✅" },
    "rejected": { label: "Reddedilen", color: "danger", icon: "❌" },
};

export default function StudentApplications() {
    const { currentUser } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!currentUser) return;

        let unsubscribe = () => { };
        try {
            const q = query(
                collection(db, "applications"),
                where("studentId", "==", currentUser.uid)
            );

            unsubscribe = onSnapshot(q, (snap) => {
                try {
                    const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                    // Safler memory sort (Kritik: Hata korumalı)
                    apps.sort((a, b) => {
                        const getMs = (val) => {
                            if (!val) return 0;
                            if (val.toMillis) return val.toMillis();
                            const d = new Date(val).getTime();
                            return isNaN(d) ? 0 : d;
                        };
                        return getMs(b.createdAt) - getMs(a.createdAt);
                    });

                    setApplications(apps);
                    setLoading(false);
                    setError(null);
                } catch (err) {
                    console.error("Veri işleme hatası:", err);
                    setError("Başvurular işlenirken bir sorun oluştu.");
                    setLoading(false);
                }
            }, (err) => {
                console.error("Firebase dinleme hatası:", err);
                setError("Başvurular alınamadı. Bağlantınızı kontrol edin.");
                setLoading(false);
            });
        } catch (err) {
            console.error("Başlatma hatası:", err);
            setError("Sistem başlatılamadı.");
            setLoading(false);
        }

        return () => unsubscribe();
    }, [currentUser]);

    const filtered = applications.filter(a => filter === "all" || a.status === filter);

    if (loading) return (
        <div className="page-wrapper">
            <div className="content-wrapper">
                <div className="dashboard-welcome">
                    <h1 className="dashboard-title">⌛ Yükleniyor...</h1>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
                </div>
            </div>
        </div>
    );

    return (
        <div className="page-wrapper">
            <div className="content-wrapper page-enter">
                <div className="dashboard-welcome">
                    <div>
                        <h1 className="dashboard-title">📨 Başvurularım</h1>
                        <p className="dashboard-subtitle">{applications.length} toplam başvuru</p>
                    </div>
                    <Link to="/jobs" className="btn btn-primary">🔍 Yeni İlan Ara</Link>
                </div>

                {error && <div className="alert alert-error mb-24">{error}</div>}

                {/* Filter Tabs */}
                <div className="filter-tabs">
                    {[
                        { key: "all", label: "Tümü" },
                        { key: "pending", label: "Bekleyen" },
                        { key: "reviewing", label: "İncelenen" },
                        { key: "accepted", label: "Kabul" },
                        { key: "rejected", label: "Reddedilen" },
                    ].map(t => (
                        <button
                            key={t.key}
                            className={`filter-tab ${filter === t.key ? "active" : ""}`}
                            onClick={() => setFilter(t.key)}
                        >
                            {t.label}
                            <span className="tab-count">
                                {t.key === "all" ? applications.length : applications.filter(a => a.status === t.key).length}
                            </span>
                        </button>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div className="empty-state card">
                        <span>📭</span>
                        <p>{filter === "all" ? "Henüz başvurun yok" : "Bu kategoride başvuru yok"}</p>
                        {filter === "all" && <Link to="/jobs" className="btn btn-primary btn-sm mt-16">İlan Ara</Link>}
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {filtered.map(app => {
                            const s = STATUS_INFO[app.status] || STATUS_INFO.pending;
                            const createdDate = app.createdAt?.toMillis ? new Date(app.createdAt.toMillis()) : (app.createdAt ? new Date(app.createdAt) : null);

                            return (
                                <div key={app.id} className="app-card card">
                                    <div className="app-card-left">
                                        <div className="avatar avatar-md app-company-logo">
                                            {app.companyName?.charAt(0)}
                                        </div>
                                        <div className="app-card-info">
                                            <h3 className="app-card-title">{app.jobTitle}</h3>
                                            <p className="app-card-company">{app.companyName}</p>
                                            {createdDate && !isNaN(createdDate.getTime()) && (
                                                <p className="app-card-date">
                                                    {createdDate.toLocaleDateString("tr-TR")}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="app-card-right">
                                        <span className={`badge badge-${s.color}`}>{s.icon} {s.label}</span>
                                        <Link to={`/jobs/${app.jobId}`} className="btn btn-secondary btn-sm">
                                            İlanı Gör
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
