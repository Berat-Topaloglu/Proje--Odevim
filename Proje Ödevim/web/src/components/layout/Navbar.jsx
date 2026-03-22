import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, LayoutDashboard, Send, Briefcase, PlusCircle, MessageSquare, User, Bell, LogOut, Menu, X, ChevronDown, ChevronUp, ClipboardCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { collection, query, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import "./Navbar.css";

export default function Navbar() {
    const { currentUser, userProfile, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (!currentUser) return;
        
        const q = query(
            collection(db, `notifications/${currentUser.uid}/items`), 
            orderBy("createdAt", "desc"), 
            limit(10)
        );
        
        let initialLoad = true;
        const unsubscribe = onSnapshot(q, (snap) => {
            const notifs = snap.docs.map(d => ({id: d.id, ...d.data()}));
            const unreads = notifs.filter(n => !n.read);
            setUnreadCount(unreads.length);
            
            if (!initialLoad) {
                // Find newly added unread notification
                snap.docChanges().forEach(change => {
                    if (change.type === "added" && !change.doc.data().read) {
                        setToast({ ...change.doc.data(), id: change.doc.id });
                        setTimeout(() => setToast(null), 5000);
                    }
                });
            }
            initialLoad = false;
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (err) {
            console.error("Çıkış yapılamadı:", err);
        }
    };

    const isActive = (path) => location.pathname.startsWith(path);
    const isStudent = userProfile?.type === "student";

    const initials = (currentUser?.displayName || currentUser?.email || "?")
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                {/* Logo */}
                <Link to="/" className="navbar-logo">
                    <div className="logo-icon">
                        <img src="/stajhub-icon.svg" alt="logo" style={{ width: '100%', height: '100%' }} />
                    </div>
                    <span className="logo-text">Staj<span>Hub</span></span>
                </Link>

                {/* Desktop Nav */}
                {currentUser && (
                    <div className="navbar-links hide-mobile">
                        <Link to="/jobs" className={`nav-link ${isActive("/jobs") ? "active" : ""}`}>
                            <Search size={18} /> İlanlar
                        </Link>
                        {isStudent ? (
                            <>
                                <Link to="/student/dashboard" className={`nav-link ${isActive("/student/dashboard") ? "active" : ""}`}>
                                    <LayoutDashboard size={18} /> Dashboard
                                </Link>
                                <Link to="/student/applications" className={`nav-link ${isActive("/student/applications") ? "active" : ""}`}>
                                    <ClipboardCheck size={18} /> Başvurularım
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link to="/company/dashboard" className={`nav-link ${isActive("/company/dashboard") ? "active" : ""}`}>
                                    <LayoutDashboard size={18} /> Dashboard
                                </Link>
                                <Link to="/company/jobs" className={`nav-link ${isActive("/company/jobs") ? "active" : ""}`}>
                                    <Briefcase size={18} /> İlanlarım
                                </Link>
                                <Link to="/company/post-job" className={`nav-link ${isActive("/company/post-job") ? "active" : ""}`}>
                                    <PlusCircle size={18} /> İlan Ver
                                </Link>
                            </>
                        )}
                        <Link to="/messages" className={`nav-link ${isActive("/messages") ? "active" : ""}`}>
                            <MessageSquare size={18} /> Mesajlar
                        </Link>
                    </div>
                )}

                {/* Right Side */}
                <div className="navbar-right">
                    {currentUser ? (
                        <div className="user-menu" onClick={() => setDropdownOpen(!dropdownOpen)}>
                            <div className="avatar avatar-sm user-avatar">
                                {(userProfile?.photoUrl || userProfile?.logoUrl || currentUser?.photoURL) ? (
                                    <img src={userProfile?.photoUrl || userProfile?.logoUrl || currentUser?.photoURL} alt="avatar" />
                                ) : (
                                    initials
                                )}
                            </div>
                            <span className="user-name hide-mobile">{currentUser.displayName}</span>
                            <span className="dropdown-arrow">
                                {dropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </span>

                            {dropdownOpen && (
                                <div className="dropdown-menu">
                                    <Link
                                        to={isStudent ? "/student/profile" : "/company/profile"}
                                        className="dropdown-item"
                                        onClick={() => setDropdownOpen(false)}
                                    >
                                        <User size={16} /> Profilim
                                    </Link>
                                    <Link to="/notifications" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                                        <Bell size={16} /> Bildirimler 
                                        {unreadCount > 0 && <span className="badge-unread-nav">{unreadCount}</span>}
                                    </Link>
                                    {userProfile?.isAdmin && (
                                        <Link to="/admin" className="dropdown-item" style={{ color: "var(--primary)" }} onClick={() => setDropdownOpen(false)}>
                                            👑 Kurucu Paneli
                                        </Link>
                                    )}
                                    <div className="dropdown-divider" />
                                    <button className="dropdown-item danger" onClick={handleLogout}>
                                        <LogOut size={16} /> Çıkış Yap
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="auth-buttons">
                            <Link to="/login" className="btn btn-secondary btn-sm">Giriş Yap</Link>
                            <Link to="/register" className="btn btn-primary btn-sm">Kayıt Ol</Link>
                        </div>
                    )}

                    {/* Mobile hamburger */}
                    {currentUser && (
                        <button className="hamburger hide-desktop" onClick={() => setMenuOpen(!menuOpen)}>
                            <span /><span /><span />
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile Menu */}
            {menuOpen && currentUser && (
                <div className="mobile-menu">
                    <Link to="/jobs" className="mobile-nav-link" onClick={() => setMenuOpen(false)}><Search size={18} /> İlanlar</Link>
                    {isStudent ? (
                        <>
                            <Link to="/student/dashboard" className="mobile-nav-link" onClick={() => setMenuOpen(false)}><LayoutDashboard size={18} /> Dashboard</Link>
                            <Link to="/student/applications" className="mobile-nav-link" onClick={() => setMenuOpen(false)}><ClipboardCheck size={18} /> Başvurularım</Link>
                            <Link to="/student/profile" className="mobile-nav-link" onClick={() => setMenuOpen(false)}><User size={18} /> Profilim</Link>
                        </>
                    ) : (
                        <>
                            <Link to="/company/dashboard" className="mobile-nav-link" onClick={() => setMenuOpen(false)}><LayoutDashboard size={18} /> Dashboard</Link>
                            <Link to="/company/jobs" className="mobile-nav-link" onClick={() => setMenuOpen(false)}><Briefcase size={18} /> İlanlarım</Link>
                            <Link to="/company/post-job" className="mobile-nav-link" onClick={() => setMenuOpen(false)}><PlusCircle size={18} /> İlan Ver</Link>
                            <Link to="/company/profile" className="mobile-nav-link" onClick={() => setMenuOpen(false)}><User size={18} /> Profilim</Link>
                        </>
                    )}
                    <Link to="/notifications" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
                        <Bell size={18} /> Bildirimler
                        {unreadCount > 0 && <span className="badge-unread-nav" style={{ marginLeft: 5 }}>{unreadCount}</span>}
                    </Link>
                    <Link to="/messages" className="mobile-nav-link" onClick={() => setMenuOpen(false)}><MessageSquare size={18} /> Mesajlar</Link>
                    {userProfile?.isAdmin && (
                        <Link to="/admin" className="mobile-nav-link" onClick={() => setMenuOpen(false)} style={{ color: "var(--primary)", fontWeight: "bold" }}>
                            👑 Kurucu Paneli
                        </Link>
                    )}
                    <button className="mobile-nav-link danger" onClick={handleLogout}><LogOut size={18} /> Çıkış Yap</button>
                </div>
            )}

            {/* Global Toast Notification */}
            {toast && (
                <div className="global-toast fade-in" onClick={() => {
                    setToast(null);
                    navigate(toast.link || "/notifications");
                }}>
                    <Bell size={20} color="#6366f1" />
                    <div className="toast-text">
                        <strong>Yeni Bildirim</strong>
                        <p>{toast.message}</p>
                    </div>
                </div>
            )}
        </nav>
    );
}
