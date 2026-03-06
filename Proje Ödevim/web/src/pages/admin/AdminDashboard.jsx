import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    collection,
    getDocs,
    query,
    orderBy,
    limit,
    deleteDoc,
    doc,
    where,
    updateDoc
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import "./AdminDashboard.css";

export default function AdminDashboard() {
    const { isAdmin } = useAuth();
    const [stats, setStats] = useState({
        students: 0,
        companies: 0,
        jobs: 0,
        applications: 0,
        reviews: 0,
        chats: 0
    });
    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(true);

    // Data lists
    const [users, setUsers] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [reviews, setReviews] = useState([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Stats
            const [stdSnap, compSnap, jobSnap, appSnap, revSnap, chatSnap] = await Promise.all([
                getDocs(collection(db, "students")),
                getDocs(collection(db, "companies")),
                getDocs(collection(db, "jobs")),
                getDocs(collection(db, "applications")),
                getDocs(collection(db, "reviews")),
                getDocs(collection(db, "chats"))
            ]);

            setStats({
                students: stdSnap.size,
                companies: compSnap.size,
                jobs: jobSnap.size,
                applications: appSnap.size,
                reviews: revSnap.size,
                chats: chatSnap.size
            });

            // Overview data
            const recentJobsQ = query(collection(db, "jobs"), orderBy("createdAt", "desc"), limit(10));
            const recentJobsSnap = await getDocs(recentJobsQ);
            setJobs(recentJobsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // User list (for users tab)
            const usersQ = query(collection(db, "users"), limit(50));
            const usersSnap = await getDocs(usersQ);
            setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // Reviews list
            const revQ = query(collection(db, "reviews"), orderBy("createdAt", "desc"), limit(20));
            const reviewItems = revSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setReviews(reviewItems);

        } catch (err) {
            console.error("Fetch error:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isAdmin) fetchData();
    }, [isAdmin]);

    const handleDeleteUser = async (uid) => {
        if (!window.confirm("Bu kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
        try {
            await deleteDoc(doc(db, "users", uid));
            // Note: student/company docs should also be deleted in a real app
            setUsers(users.filter(u => u.id !== uid));
            alert("Kullanıcı başarıyla silindi.");
            window.location.reload();
        } catch (err) { alert("Hata: " + err.message); }
    };

    const handleDeleteJob = async (jobId) => {
        if (!window.confirm("İlanı silmek istiyor musunuz?")) return;
        try {
            await deleteDoc(doc(db, "jobs", jobId));
            setJobs(jobs.filter(j => j.id !== jobId));
            alert("İlan silindi.");
            window.location.reload();
        } catch (err) { alert("Hata: " + err.message); }
    };

    const handleDeleteReview = async (revId) => {
        if (!window.confirm("Yorumu silmek istiyor musunuz?")) return;
        try {
            await deleteDoc(doc(db, "reviews", revId));
            setReviews(reviews.filter(r => r.id !== revId));
            alert("Yorum silindi.");
            window.location.reload();
        } catch (err) { alert("Hata: " + err.message); }
    };

    if (!isAdmin) return <div className="page-wrapper">Yetkisiz Erişim.</div>;

    if (loading) return (
        <div className="page-wrapper">
            <div className="content-wrapper skeleton-loading">
                <div className="skeleton" style={{ height: 200, marginBottom: 20 }} />
                <div className="skeleton" style={{ height: 400 }} />
            </div>
        </div>
    );

    return (
        <div className="page-wrapper">
            <div className="content-wrapper admin-pro-container">
                <header className="admin-header-pro">
                    <div className="header-content">
                        <h1 className="admin-title-pro">👑 Kurucu Dashboard</h1>
                        <p className="admin-status">Sistem Durumu: <span className="status-online">Çevrimiçi</span></p>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={fetchData}>🔄 Verileri Yenile</button>
                </header>

                <div className="stats-grid-pro">
                    <div className="stat-card-pro">
                        <div className="stat-icon">👥</div>
                        <div className="stat-info">
                            <h3>{stats.students + stats.companies}</h3>
                            <p>Toplam Kullanıcı</p>
                        </div>
                    </div>
                    <div className="stat-card-pro">
                        <div className="stat-icon">📄</div>
                        <div className="stat-info">
                            <h3>{stats.jobs}</h3>
                            <p>Aktif İlan</p>
                        </div>
                    </div>
                    <div className="stat-card-pro">
                        <div className="stat-icon">📨</div>
                        <div className="stat-info">
                            <h3>{stats.applications}</h3>
                            <p>Toplam Başvuru</p>
                        </div>
                    </div>
                    <div className="stat-card-pro">
                        <div className="stat-icon">⭐</div>
                        <div className="stat-info">
                            <h3>{stats.reviews}</h3>
                            <p>Yorum & Puan</p>
                        </div>
                    </div>
                </div>

                <div className="admin-tabs">
                    <button className={activeTab === "overview" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("overview")}>🏠 Genel Bakış</button>
                    <button className={activeTab === "users" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("users")}>👥 Kullanıcılar</button>
                    <button className={activeTab === "jobs" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("jobs")}>📋 İlan Yönetimi</button>
                    <button className={activeTab === "reviews" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("reviews")}>⭐ Yorumlar</button>
                </div>

                <div className="tab-content card">
                    {activeTab === "overview" && (
                        <div className="overview-section">
                            <h2 className="section-title">En Son İlanlar</h2>
                            <div className="pro-table-container">
                                <table className="pro-table">
                                    <thead>
                                        <tr>
                                            <th>İlan Başlığı</th>
                                            <th>Şirket</th>
                                            <th>Konum</th>
                                            <th>Tarih</th>
                                            <th>İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jobs.slice(0, 5).map(job => (
                                            <tr key={job.id}>
                                                <td className="font-bold">{job.title}</td>
                                                <td>{job.companyName}</td>
                                                <td>{job.location}</td>
                                                <td>{new Date(job.createdAt?.toMillis()).toLocaleDateString("tr-TR")}</td>
                                                <td><Link to={`/jobs/${job.id}`} className="link-text">İncele</Link></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "users" && (
                        <div className="users-section">
                            <h2 className="section-title">Kayıtlı Kullanıcılar</h2>
                            <div className="pro-table-container">
                                <table className="pro-table">
                                    <thead>
                                        <tr>
                                            <th>Kullanıcı</th>
                                            <th>E-posta</th>
                                            <th>Tip</th>
                                            <th>Kayıt Tarihi</th>
                                            <th>İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(user => (
                                            <tr key={user.id}>
                                                <td>
                                                    <div className="user-cell">
                                                        <div className="avatar-mini">{user.displayName?.charAt(0)}</div>
                                                        <span>{user.displayName}</span>
                                                    </div>
                                                </td>
                                                <td>{user.email}</td>
                                                <td><span className={`badge badge-${user.type === "student" ? "info" : "success"}`}>{user.type}</span></td>
                                                <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("tr-TR") : "-"}</td>
                                                <td>
                                                    <button className="btn-icon danger" onClick={() => handleDeleteUser(user.id)} title="Sil">🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "jobs" && (
                        <div className="jobs-section">
                            <h2 className="section-title">İlan Havuzu</h2>
                            <div className="pro-table-container">
                                <table className="pro-table">
                                    <thead>
                                        <tr>
                                            <th>Başlık</th>
                                            <th>Şirket</th>
                                            <th>Durum</th>
                                            <th>İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jobs.map(job => (
                                            <tr key={job.id}>
                                                <td>{job.title}</td>
                                                <td>{job.companyName}</td>
                                                <td><span className={`badge ${job.status === "active" ? "badge-success" : "badge-muted"}`}>{job.status}</span></td>
                                                <td>
                                                    <div className="action-row">
                                                        <Link to={`/jobs/${job.id}`} className="btn-icon" title="Git">👁️</Link>
                                                        <button className="btn-icon danger" onClick={() => handleDeleteJob(job.id)} title="Sil">🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "reviews" && (
                        <div className="reviews-section">
                            <h2 className="section-title">Kullanıcı Değerlendirmeleri</h2>
                            <div className="review-cards-admin">
                                {reviews.length === 0 ? <p>Yorum bulunamadı.</p> : reviews.map(rev => (
                                    <div key={rev.id} className="admin-review-card">
                                        <div className="rev-header">
                                            <span className="rating-stars">{"⭐".repeat(rev.rating)}</span>
                                            <button className="btn-icon danger btn-xs" onClick={() => handleDeleteReview(rev.id)}>🗑️ Sil</button>
                                        </div>
                                        <p className="rev-comment">"{rev.comment}"</p>
                                        <div className="rev-footer">
                                            <span>Kimden ID: {rev.fromId?.slice(0, 8)}...</span>
                                            <span>Kime ID: {rev.toId?.slice(0, 8)}...</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
