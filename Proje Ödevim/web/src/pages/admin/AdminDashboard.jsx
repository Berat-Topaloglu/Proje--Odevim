import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    collection, getDocs, query, orderBy, limit, deleteDoc,
    doc, getDoc, setDoc, where, updateDoc, addDoc,
    serverTimestamp, onSnapshot
} from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import { sendPasswordResetEmail } from "firebase/auth";
import { FORBIDDEN_WORDS } from "../../utils/wordFilter";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { 
    Crown, Eye, Trash2, Edit3, CheckCircle, XCircle, Shield, 
    RotateCcw, MessageSquare, AlertTriangle, Settings, Users, 
    ClipboardList, ShieldAlert, Cpu, Terminal, Zap, Activity
} from "lucide-react";
import "./AdminDashboard.css";

export default function AdminDashboard() {
    const { isAdmin, userProfile } = useAuth();
    const { showNotification, showConfirm, showPrompt } = useNotification();
    const [stats, setStats] = useState({
        students: 0, companies: 0, jobs: 0, applications: 0,
        reviews: 0, chats: 0, reports: 0
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
    const [selectedChatMessages, setSelectedChatMessages] = useState([]); 
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
            showNotification("Siber veriler çekilemedi.", "error", "BAĞLANTI HATASI");
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
            showNotification("Kullanıcı başarıyla silindi.", "success", "Sistem Güncelleme");
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

    if (loading) return <div className="page-wrapper"><div className="loader">Sistem Verileri Yükleniyor...</div></div>;

    return (
        <div className="admin-wrapper-pro" style={{ paddingTop: 'calc(var(--navbar-height) + 24px)' }}>
            <div className="admin-pro-container">
                <header className="admin-header-pro">
                    <div className="admin-title-area">
                        <h1 className="admin-title-pro">
                            <Shield size={32} color="var(--secondary)" /> Yönetim Merkezi
                        </h1>
                        <p className="admin-status">Sistem Durumu: <span className="status-online">● Çevrimiçi</span></p>
                    </div>
                    <div className="admin-actions">
                        <button className="btn-pro btn-outline" onClick={fetchData}>
                            <RotateCcw size={18} /> Verileri Senkronize Et
                        </button>
                    </div>
                </header>

                <div className="admin-stats-grid">
                    <StatCard icon={Users} label="TOPLAM ÜYELER" value={stats.students + stats.companies} color="#8b5cf6" />
                    <StatCard icon={Zap} label="AKTİF İLANLAR" value={stats.jobs} color="#10b981" />
                    <StatCard icon={Activity} label="CANLI TRAFİK" value={stats.chats} color="#3b82f6" />
                    <StatCard icon={ShieldAlert} label="KRİTİK İHBARLAR" value={reports.length} color="#ef4444" />
                </div>

                <div className="admin-tabs-pro">
                    <button className={`tab-btn-luxe ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}><Activity size={18} /> GENEL BAKIŞ</button>
                    <button className={`tab-btn-luxe ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}><Users size={18} /> KULLANICI YÖNETİMİ</button>
                    <button className={`tab-btn-luxe ${activeTab === "jobs" ? "active" : ""}`} onClick={() => setActiveTab("jobs")}><ClipboardList size={18} /> İLAN DENETİMİ</button>
                    <button className={`tab-btn-luxe ${activeTab === "chats" ? "active" : ""}`} onClick={() => setActiveTab("chats")}><MessageSquare size={18} /> İLETİŞİM GÖZLEM</button>
                    <button className={`tab-btn-luxe ${activeTab === "reports" ? "active" : ""}`} onClick={() => setActiveTab("reports")}>
                        <ShieldAlert size={18} /> İHBAR MERKEZİ {reports.length > 0 && <span className="sidebar-badge" style={{ position: 'static', marginLeft: 8 }}>{reports.length}</span>}
                    </button>
                    <button className={`tab-btn-luxe ${activeTab === "filters" ? "active" : ""}`} onClick={() => setActiveTab("filters")}><Shield size={18} /> GÜVENLİK FİLTRELERİ</button>
                    <button className={`tab-btn-luxe ${activeTab === "system" ? "active" : ""}`} onClick={() => setActiveTab("system")}><Settings size={18} /> SİSTEM AYARLARI</button>
                </div>

                <div className="tab-container-glass">
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
                        <div className="overview-container-pro">
                            <div className="overview-grid">
                                <div className="overview-section">
                                    <h2 className="section-title"><Zap size={20} /> EN SON İLANLAR</h2>
                                    <div className="pro-table-wrapper">
                                        {jobs.length === 0 ? (
                                            <div className="empty-state-mini">
                                                <Zap size={32} opacity={0.2} />
                                                <p>Henüz ilan yayınlanmadı.</p>
                                            </div>
                                        ) : (
                                            <table className="pro-table">
                                                <thead>
                                                    <tr>
                                                        <th>İLAN BAŞLIĞI</th>
                                                        <th>ŞİRKET</th>
                                                        <th>İŞLEM</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {jobs.slice(0, 5).map(job => (
                                                        <tr key={job.id}>
                                                            <td className="name-bold">{job.title}</td>
                                                            <td className="text-muted">{job.companyName}</td>
                                                            <td><Link to={`/jobs/${job.id}`} className="btn-icon-styled"><Eye size={14} /></Link></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>

                                <div className="overview-section">
                                    <h2 className="section-title"><Users size={20} /> YENİ BAĞLANTILAR</h2>
                                    <div className="pro-table-wrapper">
                                        {users.length === 0 ? (
                                            <div className="empty-state-mini">
                                                <Users size={32} opacity={0.2} />
                                                <p>Henüz yeni üye kaydı yok.</p>
                                            </div>
                                        ) : (
                                            <table className="pro-table">
                                                <thead>
                                                    <tr>
                                                        <th>ÜYE</th>
                                                        <th>ERİŞİM</th>
                                                        <th>İŞLEM</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {users.slice(0, 5).map(user => (
                                                        <tr key={user.id}>
                                                            <td>
                                                                <div className="user-profile-cell">
                                                                    <div className="avatar-admin" style={{ width: 32, height: 32, fontSize: 12 }}>
                                                                        {user.photoURL ? <img src={user.photoURL} alt="" /> : user.displayName?.charAt(0)}
                                                                    </div>
                                                                    <span className="name-bold" style={{ fontSize: 13 }}>{user.displayName}</span>
                                                                </div>
                                                            </td>
                                                            <td className="text-muted" style={{ fontSize: 12 }}>{user.email}</td>
                                                            <td>
                                                                <button className="btn-icon-styled" style={{ width: 32, height: 32 }} onClick={async () => {
                                                                    setLoading(true);
                                                                    const roleDoc = await getDoc(doc(db, user.type === "student" ? "students" : "companies", user.id));
                                                                    setSelectedDetail({ ...user, profileData: roleDoc.exists() ? roleDoc.data() : {} });
                                                                    setLoading(false);
                                                                }}><Eye size={12} /></button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "users" && (
                        <div className="users-section">
                            <h2 className="section-title"><Users size={24} /> KAYITLI ÜYELER</h2>
                            <div className="pro-table-wrapper">
                                <table className="pro-table">
                                    <thead>
                                        <tr>
                                            <th>ÜYE KİMLİĞİ</th>
                                            <th>ERİŞİM ADRESİ</th>
                                            <th>YETKİ</th>
                                            <th className="text-right">İŞLEM</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.filter(u =>
                                            (u.displayName || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
                                            (u.email || "").toLowerCase().includes((searchQuery || "").toLowerCase())
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
                                                <td><span className={`role-badge ${user.type}`}>{user.type === 'student' ? 'ÖĞRENCİ' : 'ŞİRKET'}</span></td>
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
                            <h2 className="section-title"><ClipboardList size={24} /> İLAN HAVUZU</h2>
                            <div className="pro-table-wrapper">
                                <table className="pro-table">
                                    <thead>
                                        <tr>
                                            <th>İLAN TANIMI</th>
                                            <th>ŞİRKET</th>
                                            <th className="text-right">İŞLEM</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jobs.filter(j => (j.title || "").toLowerCase().includes((searchQuery || "").toLowerCase())).map(job => (
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
                            <h2 className="section-title"><MessageSquare size={24} /> TELSİZ GÖZLEM</h2>
                            <div className="pro-table-wrapper">
                                <table className="pro-table">
                                    <thead>
                                        <tr>
                                            <th>SİNAL KAYNAĞI (IDs)</th>
                                            <th>SON PAKET</th>
                                            <th>İŞLEM</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {chats.map(chat => (
                                            <tr key={chat.id}>
                                                <td className="font-mono text-xs" style={{ color: 'var(--primary)' }}>{chat.participants?.join(", ").slice(0, 30)}...</td>
                                                <td className="text-muted italic">"{chat.lastMessage?.slice(0, 20)}..."</td>
                                                <td className="text-right">
                                                    <button className="btn-icon-styled" onClick={() => handleViewChat(chat)}><Eye size={14} /> DETAY</button>
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
                            <h2 className="section-header-pro" style={{ marginBottom: 32 }}><ShieldAlert size={32} /> İHBAR MERKEZİ</h2>
                            <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}>
                                {reports.length === 0 ? <p className="empty-msg">Sistem temiz. Aktif ihbar bulunamadı.</p> : reports.map(rep => (
                                    <div key={rep.id} className="bento-card" style={{ padding: 32 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--secondary)', letterSpacing: '0.1em' }}>⚠️ KRİTİK İHBAR</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>#{rep.id.slice(0, 8)}</span>
                                        </div>
                                        <div style={{ marginBottom: 24 }}>
                                            <p style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{rep.targetName || rep.targetId}</p>
                                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>"{rep.reason?.slice(0, 100)}..."</p>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <button className="btn-pro btn-outline" style={{ fontSize: 12 }} onClick={() => handleClearReport(rep.id)}>RAPORU KAPAT</button>
                                            <button className="btn-pro" style={{ fontSize: 12, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeleteUser(rep.targetId)}>ÜYEYİ YASAKLA</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "filters" && (
                        <div className="filters-section">
                            <h2 className="section-title"><Shield size={24} /> İÇERİK DENETİM FİLTRELERİ</h2>
                            <div className="filter-grid-pro" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                <div className="filter-card-pro">
                                    <h3 className="section-title" style={{ fontSize: 18 }}><AlertTriangle size={18} /> YASAKLI VERİLER</h3>
                                    <div className="add-word-box" style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                                        <input
                                            type="text"
                                            className="glass-input"
                                            placeholder="Yasaklı veri ekle..."
                                            value={newWord}
                                            onChange={(e) => setNewWord(e.target.value)}
                                        />
                                        <button className="btn-save-omega" onClick={handleAddWord}>EKLE</button>
                                    </div>
                                    <div className="pro-table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        <table className="pro-table">
                                            <thead>
                                                <tr>
                                                    <th>SAVUNMA KELİMESİ</th>
                                                    <th className="text-right">KOMUT</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(forbidden.words || []).map((word, idx) => (
                                                    <tr key={idx}>
                                                        <td>
                                                            {editingIndex === idx ? (
                                                                <input value={editText} onChange={e => setEditText(e.target.value)} className="table-edit-input" />
                                                            ) : (
                                                                <strong style={{ color: 'var(--admin-cyan)' }}>{word}</strong>
                                                            )}
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
                                    <button className="btn-infaz" style={{ marginTop: '20px', width: '100%' }} onClick={handleImportStaticWords}>
                                        <Cpu size={14} /> STANDART VERİTABANINDAN AKTAR
                                    </button>
                                </div>

                                <div className="filter-card-pro">
                                    <h3 className="section-title" style={{ fontSize: 18 }}><ShieldAlert size={18} /> OTOMATİK SAVUNMA</h3>
                                    <p className="text-muted">Sistem, yasaklı kelimeleri içeren içerikleri otomatik olarak karantinaya alır.</p>
                                    <div className="security-status-box" style={{ marginTop: '24px', padding: '24px', border: '1px solid var(--admin-border)', borderRadius: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: 12 }}>DENETİM SEVİYESİ</span>
                                            <span style={{ color: 'var(--primary)', fontWeight: 800 }}>YÜKSEK</span>
                                        </div>
                                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                                            <div style={{ width: '100%', height: '100%', background: 'var(--primary)' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "system" && (
                        <div className="system-section">
                            <h2 className="section-title"><Cpu size={24} /> ÇEKİRDEK KONTROL</h2>
                            <div className="lock-box">
                                <div className="lock-info">
                                    <h3 style={{ color: 'white' }}>SİSTEM ERİŞİM KİLİDİ</h3>
                                    <p className="text-muted">Bakım modu aktif edildiğinde sistem yazma erişimine kapatılır.</p>
                                </div>
                                <button className={`btn-omega ${systemSettings.maintenance ? 'active' : ''}`} onClick={async () => {
                                    const next = !systemSettings.maintenance;
                                    await setDoc(doc(db, "settings", "stajhub"), { maintenance: next });
                                    setSystemSettings({ maintenance: next });
                                    showNotification(`Sistem Durumu: ${next ? 'KİLİTLİ' : 'AÇIK'}`, "info", "SİSTEM");
                                }}>
                                    {systemSettings.maintenance ? 'ERİŞİMİ AÇ' : 'TÜM SİSTEMİ KİLİTLE'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {selectedDetail && (
                    <div className="modal-overlay-pro" onClick={() => { setSelectedDetail(null); if (chatUnsubscribe) chatUnsubscribe(); }}>
                        <div className="modal-content-luxe" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
                                <h2 style={{ fontSize: 24, fontWeight: 900 }}>{selectedDetail.participants ? "İLETİŞİM GÖZLEM" : "KULLANICI PROFİLİ"}</h2>
                                <button onClick={() => setSelectedDetail(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: 32, cursor: 'pointer' }}>×</button>
                            </div>
                            
                            <div className="modal-body-pro" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {selectedDetail.participants ? (
                                    <div className="chat-obs-ui">
                                        <div style={{ padding: 24, background: 'rgba(255,255,255,0.02)', borderRadius: 16, marginBottom: 24 }}>
                                            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--secondary)' }}>SİNYAL AKTİF ⚡</p>
                                            <p style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>{selectedDetail.participantNames?.join(" ↔ ")}</p>
                                        </div>
                                        {chatLoading ? <div className="loader">Yükleniyor...</div> : (
                                            <div className="msg-log" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                {selectedChatMessages.map(m => (
                                                    <div key={m.id} style={{ padding: 16, borderRadius: 16, background: m.senderId === userProfile?.id ? 'rgba(139,92,246,0.1)' : 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                                                        <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>{selectedDetail.senderMap?.[m.senderId] || "Anonim Sinyal"}</p>
                                                        <p style={{ fontSize: 14 }}>{m.text}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <button className="btn-pro" style={{ width: '100%', marginTop: 32, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} onClick={() => handleDeleteChat(selectedDetail.id)}>İLETİŞİM KAYDINI SİL</button>
                                    </div>
                                ) : (
                                    <div className="user-detail-pro">
                                        <div style={{ textAlign: 'center', marginBottom: 40 }}>
                                            <div style={{ width: 120, height: 120, borderRadius: 32, background: 'var(--bg-elevated)', margin: '0 auto 20px', border: '2px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyCenter: 'center', overflow: 'hidden' }}>
                                                {selectedDetail.photoURL ? <img src={selectedDetail.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 48, fontWeight: 800, color: 'var(--secondary)' }}>{selectedDetail.displayName?.charAt(0)}</span>}
                                            </div>
                                            <h3 style={{ fontSize: 24, fontWeight: 900 }}>{selectedDetail.displayName}</h3>
                                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--secondary)', display: 'inline-block', marginTop: 8 }}>{selectedDetail.type === 'student' ? 'ÖĞRENCİ' : 'ŞİRKET'}</span>
                                        </div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                            <button className="btn-pro btn-outline" onClick={() => handleResetPassword(selectedDetail.email)}><RotateCcw size={18} /> ŞİFRE SIFIRLA</button>
                                            <button className="btn-pro btn-outline" onClick={() => handleSendWarning(selectedDetail.id)}><AlertTriangle size={18} /> UYARI GÖNDER</button>
                                            <button className="btn-pro" style={{ gridColumn: 'span 2', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} onClick={() => handleDeleteUser(selectedDetail.id)}><Trash2 size={18} /> HESABI TAMAMEN SİL</button>
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

function StatCard({ icon: Icon, label, value, color }) {
    return (
        <div className="stat-card-luxe">
            <div className="stat-icon-pro" style={{ background: `${color}15`, color: color, borderColor: `${color}30` }}>
                <Icon size={32} />
            </div>
            <div className="stat-info-pro">
                <h3>{value}</h3>
                <p>{label}</p>
            </div>
        </div>
    );
}
