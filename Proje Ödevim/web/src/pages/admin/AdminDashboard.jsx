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
    getDoc,
    setDoc,
    where,
    updateDoc,
    addDoc,
    serverTimestamp,
    onSnapshot
} from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import { sendPasswordResetEmail } from "firebase/auth";
import { FORBIDDEN_WORDS } from "../../utils/wordFilter";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { Crown, Eye, Trash2, Edit3, CheckCircle, XCircle, Shield, RotateCcw, MessageSquare, AlertTriangle, Settings, Users, ClipboardList, ShieldAlert, Cpu, TextAlignCenter, AlignJustify, AlignHorizontalJustifyCenter } from "lucide-react";
import "./AdminDashboard.css";

export default function AdminDashboard() {
    const { isAdmin, userProfile } = useAuth();
    const { showNotification, showConfirm, showPrompt } = useNotification();
    const [stats, setStats] = useState({
        students: 0,
        companies: 0,
        jobs: 0,
        applications: 0,
        reviews: 0,
        chats: 0,
        reports: 0
    });
    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(true);

    // Data lists
    const [users, setUsers] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [chats, setChats] = useState([]);
    const [reports, setReports] = useState([]);
    const [forbidden, setForbidden] = useState({ words: [], patterns: [] });

    // UI States
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDetail, setSelectedDetail] = useState(null);
    const [newWord, setNewWord] = useState("");
    const [saving, setSaving] = useState(false);
    const [systemSettings, setSystemSettings] = useState({ maintenance: false });
    const [selectedChatMessages, setSelectedChatMessages] = useState([]); // FOR OMEGA SPY
    const [chatLoading, setChatLoading] = useState(false);
    const [editingIndex, setEditingIndex] = useState(-1);
    const [editText, setEditText] = useState("");
    const [chatUnsubscribe, setChatUnsubscribe] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Stats
            const [stdSnap, compSnap, jobSnap, appSnap, revSnap, chatSnap, reportsSnap] = await Promise.all([
                getDocs(collection(db, "students")).catch(() => ({ size: 0, docs: [] })),
                getDocs(collection(db, "companies")).catch(() => ({ size: 0, docs: [] })),
                getDocs(collection(db, "jobs")).catch(() => ({ size: 0, docs: [] })),
                getDocs(collection(db, "applications")).catch(() => ({ size: 0, docs: [] })),
                getDocs(collection(db, "reviews")).catch(() => ({ size: 0, docs: [] })),
                getDocs(collection(db, "chats")).catch(() => ({ size: 0, docs: [] })),
                getDocs(collection(db, "reports")).catch(() => ({ size: 0, docs: [] }))
            ]);

            setStats({
                students: stdSnap.size || 0,
                companies: compSnap.size || 0,
                jobs: jobSnap.size || 0,
                applications: appSnap.size || 0,
                reviews: revSnap.size || 0,
                chats: chatSnap.size || 0,
                reports: reportsSnap.size || 0
            });

            // Fetch dynamic filters
            getDoc(doc(db, "settings", "forbiddenContent")).then(d => d.exists() && setForbidden(d.data()));
            getDoc(doc(db, "settings", "stajhub")).then(d => d.exists() && setSystemSettings(d.data()));

            // Fetch Data Lists
            try {
                const [chatSnapDocs, repSnapDocs] = await Promise.all([
                    getDocs(collection(db, "chats")),
                    getDocs(collection(db, "reports"))
                ]);
                setChats(chatSnapDocs.docs.map(d => ({ id: d.id, ...d.data() })));
                setReports(repSnapDocs.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) { console.error("Omega Data Fetch Error:", e); }

            // Overview data
            try {
                const recentJobsQ = query(collection(db, "jobs"), orderBy("createdAt", "desc"), limit(10));
                const recentJobsSnap = await getDocs(recentJobsQ);
                setJobs(recentJobsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                setJobs(jobSnap.docs ? jobSnap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 10) : []);
            }

            // User list
            try {
                const usersQ = query(collection(db, "users"), limit(100));
                const usersSnap = await getDocs(usersQ);
                const usersData = await Promise.all(usersSnap.docs.map(async (d) => {
                    const data = d.data();
                    const resolvedType = data.type || (data.roles && data.roles.length > 0 ? data.roles[0] : "student");
                    const baseData = { id: d.id, ...data, type: resolvedType };
                    
                    // If no photoURL, check role collection
                    if (!baseData.photoURL) {
                        const roleDoc = await getDoc(doc(db, resolvedType === "student" ? "students" : "companies", d.id));
                        if (roleDoc.exists()) {
                            const rData = roleDoc.data();
                            return { ...baseData, photoURL: rData.photoUrl || rData.logoUrl };
                        }
                    }
                    return baseData;
                }));
                setUsers(usersData);
            } catch (e) { setUsers([]); }

            setReviews(revSnap.docs ? revSnap.docs.map(d => ({ id: d.id, ...d.data() })) : []);

        } catch (err) {
            console.error("Fetch error:", err);
            showNotification("Veriler yüklenirken bir sorun oluştu.", "error", "Hata");
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!isAdmin) return;
        fetchData();
        const qReports = query(collection(db, "reports"), orderBy("createdAt", "desc"));
        const unsubscribeReports = onSnapshot(qReports, (snap) => {
            const reps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setReports(reps);
            setStats(prev => ({ ...prev, reports: snap.size }));
        });
        return () => unsubscribeReports();
    }, [isAdmin]);

    const handleDeleteUser = async (uid) => {
        const confirmed = await showConfirm("Bu kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.", "Kullanıcı Silme");
        if (!confirmed) return;
        try {
            await deleteDoc(doc(db, "users", uid));
            await deleteDoc(doc(db, "students", uid));
            await deleteDoc(doc(db, "companies", uid));
            setUsers(users.filter(u => u.id !== uid));
            showNotification("Kullanıcı başarıyla silindi.", "success", "Siber İmha");
            if (selectedDetail && (selectedDetail.id === uid || selectedDetail.targetId === uid)) {
                setSelectedDetail(null);
            }
            setTimeout(() => fetchData(), 1500);
        } catch (err) { showNotification("Hata: " + err.message, "error", "Hata"); }
    };

    const handleDeleteJob = async (jobId) => {
        const confirmed = await showConfirm("İlanı silmek istiyor musunuz? Bu ilana yapılan TÜM başvurular da silinecektir.", "İşlem Kritik");
        if (!confirmed) return;
        try {
            const q = query(collection(db, "applications"), where("jobId", "==", jobId));
            const snap = await getDocs(q);
            const deletePromises = snap.docs.map(appDoc => deleteDoc(doc(db, "applications", appDoc.id)));
            await Promise.all(deletePromises);
            await deleteDoc(doc(db, "jobs", jobId));
            setJobs(jobs.filter(j => j.id !== jobId));
            showNotification(`${snap.size} başvuru ile birlikte ilan imha edildi.`, "success", "Operasyon Tamam");
            setTimeout(() => fetchData(), 1500);
        } catch (err) { showNotification("İnfaz Hatası: " + err.message, "error", "Hata"); }
    };

    const handleDeleteReview = async (revId) => {
        const confirmed = await showConfirm("Yorumu silmek istiyor musunuz?", "Yorum Silme");
        if (!confirmed) return;
        try {
            await deleteDoc(doc(db, "reviews", revId));
            setReviews(reviews.filter(r => r.id !== revId));
            showNotification("Yorum başarıyla silindi.", "success", "Başarılı");
            setTimeout(() => fetchData(), 1500);
        } catch (err) { showNotification("Hata: " + err.message, "error", "Hata"); }
    };

    const handleDeleteReport = async (repId) => {
        const confirmed = await showConfirm("Bu ihbarı kapatmak (silmek) istediğinize emin misiniz?", "Rapor Kapat");
        if (!confirmed) return;
        try {
            await deleteDoc(doc(db, "reports", repId));
            setReports(reports.filter(r => r.id !== repId));
            showNotification("İhbar başarıyla kapatıldı.", "success", "Omega Temizlik");
            setSelectedDetail(null);
        } catch (err) { showNotification("Hata: " + err.message, "error", "Hata"); }
    };

    const handleSendWarning = async (uid) => {
        const text = await showPrompt("Kullanıcıya iletilecek uyarı mesajını yazın:", "⚠️ Siber Uyarı İlet", "Uyarı mesajınız...");
        if (!text) return;
        try {
            await addDoc(collection(db, `notifications/${uid}/items`), {
                type: "warning",
                message: `DİKKAT: Kurucu tarafından uyarıldınız! ${text}`,
                read: false,
                createdAt: serverTimestamp()
            });
            showNotification("Uyarı siber kanallardan iletildi.", "success", "İnfaz Hattı");
        } catch (err) { showNotification("Hata: " + err.message, "error", "Hata"); }
    };

    const handleAddWord = async () => {
        if (!newWord.trim()) return;
        const word = newWord.trim().toLowerCase();
        if (forbidden.words.includes(word)) {
            showNotification("Bu kelime zaten listede.", "warning", "Uyarı");
            return;
        }
        setSaving(true);
        try {
            const updatedWords = [...forbidden.words, word];
            await setDoc(doc(db, "settings", "forbiddenContent"), { ...forbidden, words: updatedWords });
            setForbidden({ ...forbidden, words: updatedWords });
            setNewWord("");
            showNotification("Kelime başarıyla eklendi.", "success", "Başarılı");
        } catch (err) { showNotification("Hata: " + err.message, "error", "Hata"); }
        setSaving(false);
    };

    const handleRemoveWord = async (word) => {
        const confirmed = await showConfirm("Bu kelimeyi filtreden kaldırmak istediğinize emin misiniz?", "Filtre Temizleme");
        if (!confirmed) return;
        setSaving(true);
        try {
            const updatedWords = forbidden.words.filter(w => w !== word);
            await setDoc(doc(db, "settings", "forbiddenContent"), { ...forbidden, words: updatedWords });
            setForbidden({ ...forbidden, words: updatedWords });
            showNotification("Kelime listeden kaldırıldı.", "success", "Başarılı");
        } catch (err) { showNotification("Hata: " + err.message, "error", "Hata"); }
        setSaving(false);
    };

    const handleUpdateWord = async () => {
        if (!editText.trim() || editingIndex === -1) return;
        const word = editText.trim().toLowerCase();
        setSaving(true);
        try {
            const updatedWords = [...forbidden.words];
            updatedWords[editingIndex] = word;
            await setDoc(doc(db, "settings", "forbiddenContent"), { ...forbidden, words: updatedWords });
            setForbidden({ ...forbidden, words: updatedWords });
            setEditingIndex(-1);
            setEditText("");
            showNotification("Kelime başarıyla güncellendi.", "success", "Başarılı");
        } catch (err) { showNotification("Hata: " + err.message, "error", "Hata"); }
        setSaving(false);
    };

    const handleViewChat = async (chat) => {
        setChatLoading(true);
        setSelectedChatMessages([]);
        if (chatUnsubscribe) chatUnsubscribe();

        try {
            // Resolve Names & Create Map
            const nameMap = {};
            const namePromises = chat.participants.map(async (pid) => {
                const uDoc = await getDoc(doc(db, "users", pid));
                const name = uDoc.exists() ? uDoc.data().displayName : pid.slice(0, 8);
                nameMap[pid] = name;
                return name;
            });
            const names = await Promise.all(namePromises);
            setSelectedDetail({ ...chat, participantNames: names, senderMap: nameMap });

            const q = query(collection(db, "chats", chat.id, "messages"), limit(100));
            const unsub = onSnapshot(q, (snap) => {
                const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                msgs.sort((a, b) => (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0) - (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0));
                setSelectedChatMessages(msgs);
                setChatLoading(false);
            });
            setChatUnsubscribe(() => unsub);
        } catch (err) {
            showNotification("Sinyal çözümleme hatası: " + err.message, "error", "Hata");
            setChatLoading(false);
        }
    };

    const handleDeleteChat = async (chatId) => {
        const confirmed = await showConfirm("Bu sohbeti tamamen silmek istediğinizden emin misiniz?", "Sinyal Kes");
        if (!confirmed) return;
        try {
            const q = query(collection(db, "chats", chatId, "messages"));
            const snap = await getDocs(q);
            await Promise.all(snap.docs.map(m => deleteDoc(doc(db, "chats", chatId, "messages", m.id))));
            await deleteDoc(doc(db, "chats", chatId));
            setChats(chats.filter(c => c.id !== chatId));
            showNotification("Sohbet kalıcı olarak silindi.", "success", "Başarılı");
            setSelectedDetail(null);
        } catch (err) { showNotification("Hata: " + err.message, "error", "Hata"); }
    };

    const handleResetPassword = async (email) => {
        const confirm = await showConfirm(`${email} adresine sıfırlama e-postası gönderilsin mi?`, "Erişim İşlemi");
        if (!confirm) return;
        try {
            await sendPasswordResetEmail(auth, email);
            showNotification("E-posta başarıyla gönderildi.", "success", "Başarılı");
        } catch (err) { showNotification("Hata: " + err.message, "error", "Hata"); }
    };

    const handleImportStaticWords = async () => {
        const confirmed = await showConfirm(`${FORBIDDEN_WORDS.length} kelime aktarılsın mı?`, "Toplu Aktarım");
        if (!confirmed) return;
        setSaving(true);
        try {
            const current = forbidden.words || [];
            const updated = [...new Set([...current, ...FORBIDDEN_WORDS.map(w => w.toLowerCase())])];
            await setDoc(doc(db, "settings", "forbiddenContent"), { ...forbidden, words: updated });
            setForbidden({ ...forbidden, words: updated });
            showNotification("Kelimeler aktarıldı.", "success", "Başarılı");
        } catch (err) { showNotification("Hata: " + err.message, "error", "Hata"); }
        setSaving(false);
    };

    const handleToggleVerify = async (userId, current) => {
        try {
            await updateDoc(doc(db, "companies", userId), { verified: !current });
            showNotification("Durum güncellendi.", "success", "Başarılı");
            fetchData();
        } catch (err) { showNotification("Hata: " + err.message, "error", "Hata"); }
    };

    if (loading) return (
        <div className="page-wrapper">
            <div className="content-wrapper skeleton-loading">
                <div className="skeleton" style={{ height: 200, marginBottom: 20 }} />
                <div className="skeleton" style={{ height: 400 }} />
            </div>
        </div>
    );

    return (
        <div className="page-wrapper" style={{ paddingTop: 'calc(var(--navbar-height) + 24px)' }}>
            <div className="content-wrapper admin-pro-container">
                <header className="admin-header-pro">
                    <div className="header-info-box">
                        <h1 className="admin-title-pro">
                            <Crown size={28} className="crown-icon" /> Kurucu Dashboard
                        </h1>
                        <p className="admin-status">Sistem Durumu: <span className="status-online">● Çevrimiçi</span></p>
                    </div>
                    <button className="btn btn-primary btn-sm sync-btn" onClick={fetchData}>
                        <RotateCcw size={16} /> Verileri Senkronize Et
                    </button>
                </header>

                <div className="stats-grid-pro">
                    <div className="stat-card-pro glass">
                        <div className="stat-icon-box"><Users size={24} /></div>
                        <div className="stat-info">
                            <h3>{stats.students + stats.companies}</h3>
                            <p>Kullanıcı Üssü</p>
                        </div>
                    </div>
                    <div className="stat-card-pro glass">
                        <div className="stat-icon-box"><ClipboardList size={24} /></div>
                        <div className="stat-info">
                            <h3>{stats.jobs}</h3>
                            <p>Aktif Görevler</p>
                        </div>
                    </div>
                    <div className="stat-card-pro glass">
                        <div className="stat-icon-box"><MessageSquare size={24} /></div>
                        <div className="stat-info">
                            <h3>{stats.chats}</h3>
                            <p>Canlı İletişim</p>
                        </div>
                    </div>
                    <div className="stat-card-pro glass">
                        <div className="stat-icon-box"><ShieldAlert size={24} /></div>
                        <div className="stat-info">
                            <h3>{reports.length}</h3>
                            <p>İnfaz Hattı</p>
                        </div>
                    </div>
                </div>

                <div className="admin-tabs glass">
                    <button className={activeTab === "overview" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("overview")}><RotateCcw size={16} /> Genel</button>
                    <button className={activeTab === "users" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("users")}><Users size={16} /> Üyeler</button>
                    <button className={activeTab === "jobs" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("jobs")}><ClipboardList size={16} /> İlanlar</button>
                    <button className={activeTab === "chats" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("chats")}><MessageSquare size={16} /> Telsiz Gözlem</button>
                    <button className={activeTab === "reports" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("reports")}>
                        <ShieldAlert size={16} /> İnfaz {reports.length > 0 && <span className="tab-badge">{reports.length}</span>}
                    </button>
                    <button className={activeTab === "filters" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("filters")}><Shield size={16} /> Savunma</button>
                    <button className={activeTab === "system" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("system")}><Settings size={16} /> Çekirdek</button>
                </div>

                <div className="tab-container-glass glass">
                    {activeTab !== "system" && activeTab !== "overview" && activeTab !== "reports" && (
                        <div className="search-box-pro">
                            <input
                                type="text"
                                placeholder="Veritabanında ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="glass-input"
                            />
                        </div>
                    )}

                    {activeTab === "overview" && (
                        <div className="overview-grid">
                            <div className="table-header-box">
                                <h2 className="section-title">En Son İlanlar</h2>
                            </div>
                            <div className="pro-table-wrapper">
                                <table className="pro-table">
                                    <thead>
                                        <tr>
                                            <th>İlan Başlığı</th>
                                            <th>Şirket</th>
                                            <th>İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jobs.slice(0, 5).map(job => (
                                            <tr key={job.id}>
                                                <td className="font-bold">{job.title}</td>
                                                <td>{job.companyName}</td>
                                                <td><Link to={`/jobs/${job.id}`} className="btn-icon-styled"><Eye size={14} /></Link></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "users" && (
                        <div className="users-section">
                            <div className="table-header-box">
                                <h2 className="section-title">Kayıtlı Kullanıcılar</h2>
                            </div>
                            <div className="pro-table-wrapper">
                                <table className="pro-table">
                                    <thead>
                                        <tr>
                                            <th>Kullanıcı</th>
                                            <th>E-posta</th>
                                            <th>Tip</th>
                                            <th className="text-right">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.filter(u =>
                                            u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                                        ).map(user => (
                                            <tr key={user.id}>
                                                <td>
                                                    <div className="user-profile-cell">
                                                        <div className="avatar-admin">
                                                            {user.photoURL ? <img src={user.photoURL} alt="" /> : user.displayName?.charAt(0)}
                                                        </div>
                                                        <div className="user-meta-name">
                                                            <span className="name-bold">{user.displayName}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-muted">{user.email}</td>
                                                <td><span className={`role-badge ${user.type}`}>{user.type === 'student' ? 'Öğrenci' : 'Şirket'}</span></td>
                                                <td className="text-right">
                                                    <div className="action-button-group">
                                                        <button className="btn-icon-styled" onClick={async () => {
                                                            setLoading(true);
                                                            const roleDoc = await getDoc(doc(db, user.type === "student" ? "students" : "companies", user.id));
                                                            setSelectedDetail({ ...user, profileData: roleDoc.exists() ? roleDoc.data() : {} });
                                                            setLoading(false);
                                                        }}><Eye size={14} /></button>
                                                        {user.type === "company" && (
                                                            <button className={`btn-icon-styled ${user.profileData?.verified ? "active" : ""}`} onClick={() => handleToggleVerify(user.id, user.profileData?.verified)}>
                                                                <Shield size={14} />
                                                            </button>
                                                        )}
                                                        <button className="btn-icon-styled danger" onClick={() => handleDeleteUser(user.id)}><Trash2 size={14} /></button>
                                                    </div>
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
                            <h2 className="section-title">Görev Havuzu</h2>
                            <div className="pro-table-wrapper">
                                <table className="pro-table">
                                    <thead>
                                        <tr>
                                            <th>Başlık</th>
                                            <th>Şirket</th>
                                            <th className="text-right">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jobs.filter(j => j.title?.toLowerCase().includes(searchQuery.toLowerCase())).map(job => (
                                            <tr key={job.id}>
                                                <td className="name-bold">{job.title}</td>
                                                <td className="text-muted">{job.companyName}</td>
                                                <td className="text-right">
                                                    <div className="action-button-group">
                                                        <Link to={`/jobs/${job.id}`} className="btn-icon-styled"><Eye size={14} /></Link>
                                                        <button className="btn-icon-styled danger" onClick={() => handleDeleteJob(job.id)}><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "chats" && (
                        <div className="chats-section">
                            <h2 className="section-title">🛰️ Telsiz Gözlem</h2>
                            <div className="pro-table-wrapper">
                                <table className="pro-table">
                                    <thead>
                                        <tr>
                                            <th>Katılımcı IDs</th>
                                            <th>Son Sinyal</th>
                                            <th className="text-right">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {chats.map(chat => (
                                            <tr key={chat.id}>
                                                <td className="font-mono text-xs">{chat.participants?.join(", ").slice(0, 30)}...</td>
                                                <td className="text-muted italic">"{chat.lastMessage?.slice(0, 20)}..."</td>
                                                <td className="text-right">
                                                    <button className="btn-icon-styled" onClick={() => handleViewChat(chat)}><MessageSquare size={14} /> Dinle</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "reports" && (
                        <div className="reports-section">
                            <h2 className="section-title">⚖️ İnfaz Hattı</h2>
                            <div className="reports-grid-admin">
                                {reports.length === 0 ? <p className="empty-msg">Sistem temiz. Aktif ihbar bulunamadı.</p> : reports.map(rep => (
                                    <div key={rep.id} className="infaz-card glass">
                                        <div className="infaz-header">
                                            <span className="infaz-tag">⚠️ İHBAR</span>
                                            <span className="infaz-id">#{rep.id.slice(0, 6)}</span>
                                        </div>
                                        <div className="infaz-body">
                                            <p><strong>Hedef:</strong> {rep.targetName || rep.targetId}</p>
                                            <p className="reason-text">"{rep.reason?.slice(0, 50)}..."</p>
                                        </div>
                                        <div className="infaz-actions">
                                            <button className="btn-infaz warning" onClick={() => setSelectedDetail(rep)}><Eye size={14} /> İncele</button>
                                            <button className="btn-infaz secondary" onClick={() => handleDeleteReport(rep.id)}><CheckCircle size={14} /> Kapat</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "filters" && (
                        <div className="defense-section">
                            <h2 className="section-title">Dinamik Savunma Hattı 🛡️</h2>
                            <div className="defense-input-card glass">
                                <input type="text" placeholder="Yasaklı kelime ekle..." value={newWord} onChange={e => setNewWord(e.target.value)} className="glass-input" />
                                <div className="defense-btn-row">
                                    <button className="btn btn-primary" onClick={handleAddWord} disabled={saving}>Ekle</button>
                                    <button className="btn btn-secondary" onClick={handleImportStaticWords}>Statik Yükle</button>
                                </div>
                            </div>
                            <div className="pro-table-wrapper" style={{ marginTop: 24 }}>
                                <table className="pro-table">
                                    <thead>
                                        <tr>
                                            <th>Savunma Kelimesi</th>
                                            <th className="text-right">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {forbidden.words
                                            .filter(word => word.toLowerCase().includes(searchQuery.toLowerCase()))
                                            .map((word, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    {editingIndex === idx ? <input value={editText} onChange={e => setEditText(e.target.value)} className="table-edit-input" /> : <strong>{word}</strong>}
                                                </td>
                                                <td className="text-right">
                                                    <div className="action-button-group">
                                                        {editingIndex === idx ? (
                                                            <>
                                                                <button className="btn-icon-styled" onClick={handleUpdateWord}><CheckCircle size={14} /></button>
                                                                <button className="btn-icon-styled danger" onClick={() => setEditingIndex(-1)}><XCircle size={14} /></button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button className="btn-icon-styled" onClick={() => { setEditingIndex(idx); setEditText(word); }}><Edit3 size={14} /></button>
                                                                <button className="btn-icon-styled danger" onClick={() => handleRemoveWord(word)}><Trash2 size={14} /></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "system" && (
                        <div className="system-section">
                            <h2 className="section-title"><Cpu size={24} /> Çekirdek Kontrol</h2>
                            <div className="lock-box glass">
                                <div className="lock-info">
                                    <h3>Bakım Protokolü (Omega Lock)</h3>
                                    <p>Tüm sistem erişimini sınırlandırır.</p>
                                </div>
                                <button className={`btn-omega ${systemSettings.maintenance ? 'active' : ''}`} onClick={async () => {
                                    const next = !systemSettings.maintenance;
                                    await setDoc(doc(db, "settings", "stajhub"), { maintenance: next });
                                    setSystemSettings({ maintenance: next });
                                    showNotification(`Protokol: ${next ? 'AKTİF' : 'KAPALI'}`, "info", "Sistem");
                                }}>
                                    {systemSettings.maintenance ? 'KİLİDİ AÇ' : 'SİSTEMİ KİLİTLE'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {selectedDetail && (
                    <div className="omega-overlay" onClick={() => { setSelectedDetail(null); if (chatUnsubscribe) chatUnsubscribe(); }}>
                        <div className="omega-modal glass" onClick={e => e.stopPropagation()}>
                            <div className="modal-top">
                                <h2>{selectedDetail.participants ? "🛰️ Telsiz Gözlem" : selectedDetail.reason ? "⚖️ İhbar Dosyası" : "👤 Üye Detayı"}</h2>
                                <button className="close-x" onClick={() => setSelectedDetail(null)}>×</button>
                            </div>
                            <div className="modal-mid scrollable">
                                {selectedDetail.reason ? (
                                    <div className="report-detail-ui">
                                        <div className="header-banner warning">İHBAR #{selectedDetail.id.slice(0, 6)}</div>
                                        <div className="party-box">
                                            <div className="party"><span>İhbarcı:</span> {selectedDetail.reporterName}</div>
                                            <div className="party danger"><span>Hedef:</span> {selectedDetail.targetName}</div>
                                        </div>
                                        <div className="reason-box">"{selectedDetail.reason}"</div>
                                        <div className="admin-actions-grid">
                                            <button className="action-tile warning" onClick={() => handleSendWarning(selectedDetail.targetId)}><AlertTriangle /><span>Uyarı Gönder</span></button>
                                            <button className="action-tile danger" onClick={() => handleDeleteUser(selectedDetail.targetId)}><Trash2 /><span>Hesabı Sil</span></button>
                                            <button className="action-tile success" onClick={() => handleDeleteReport(selectedDetail.id)}><CheckCircle /><span>Dosyayı Kapat</span></button>
                                        </div>
                                    </div>
                                ) : selectedDetail.participants ? (
                                    <div className="spy-log-ui">
                                        <div className="log-top">
                                            <span>Canlı Sinyal Aktif 📡</span>
                                            <div className="signal-participants">
                                                {selectedDetail.participantNames?.join(" ↔ ")}
                                            </div>
                                        </div>
                                        {chatLoading ? <div className="loading-dots">...</div> : (
                                            <div className="msg-list">
                                                {selectedChatMessages.map(m => (
                                                    <div key={m.id} className={`msg-item-spy ${m.senderId === userProfile?.id ? 'admin' : ''}`}>
                                                        <small>{selectedDetail.senderMap?.[m.senderId] || "Bilinmeyen Sinyal"}</small>
                                                        <p>{m.text}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <button className="btn-full danger" onClick={() => handleDeleteChat(selectedDetail.id)}>Sohbeti Temizle</button>
                                    </div>
                                ) : (
                                    <div className="user-detail-ui">
                                        <div className="profile-hero">
                                            <div className="avatar-lg">
                                                {selectedDetail.photoURL ? <img src={selectedDetail.photoURL} alt="" /> : selectedDetail.displayName?.charAt(0)}
                                            </div>
                                            <h3>{selectedDetail.displayName}</h3>
                                            <span className={`label-type ${selectedDetail.type}`}>
                                                {selectedDetail.type === 'student' ? 'Öğrenci' : 'Şirket'}
                                            </span>
                                        </div>
                                        
                                        <div className="meta-container-glass">
                                            <div className="meta-row">
                                                <div className="meta-icon"><Shield size={18} /></div>
                                                <div className="meta-content">
                                                    <label>Kimlik Tanımlayıcı (ID)</label>
                                                    <span>{selectedDetail.id}</span>
                                                </div>
                                            </div>
                                            <div className="meta-row">
                                                <div className="meta-icon"><MessageSquare size={18} /></div>
                                                <div className="meta-content">
                                                    <label>İletişim Kanalı (E-posta)</label>
                                                    <span>{selectedDetail.email}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="admin-actions-grid-pro">
                                            <button className="tile-btn orange" onClick={() => handleResetPassword(selectedDetail.email)}>
                                                <div className="tile-icon"><RotateCcw size={20} /></div>
                                                <span>Şifre Sıfırla</span>
                                            </button>
                                            <button className="tile-btn yellow" onClick={() => handleSendWarning(selectedDetail.id)}>
                                                <div className="tile-icon"><AlertTriangle size={20} /></div>
                                                <span>Uyarı Ver</span>
                                            </button>
                                            <button className="tile-btn red" onClick={() => handleDeleteUser(selectedDetail.id)}>
                                                <div className="tile-icon"><Trash2 size={20} /></div>
                                                <span>İmha Et</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
