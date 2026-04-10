import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
    LayoutDashboard, Briefcase, PlusCircle, User, 
    Bell, MessageSquare, LogOut, ChevronLeft, ChevronRight, Menu 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import "./Sidebar.css";

export default function Sidebar() {
    const { currentUser, userProfile, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const isStudent = userProfile?.type === "student";
    const isAdmin = userProfile?.isAdmin;

    useEffect(() => {
        if (!currentUser) return;
        const q = query(collection(db, `notifications/${currentUser.uid}/items`));
        const unsubscribe = onSnapshot(q, (snap) => {
            const notifs = snap.docs.map(d => ({id: d.id, ...d.data()}));
            const unreads = notifs.filter(n => !n.read);
            setUnreadCount(unreads.length);
        });
        return () => unsubscribe();
    }, [currentUser]);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (err) { console.error(err); }
    };

    const isActive = (path) => location.pathname.startsWith(path);

    const MenuLink = ({ to, icon: Icon, label, badge, danger }) => {
        const active = isActive(to);
        return (
            <Link to={to} className={`sidebar-link ${active ? "active" : ""} ${danger ? "danger" : ""}`} title={collapsed ? label : undefined}>
                <div className="sidebar-link-icon">
                    <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                    {badge > 0 && <span className="sidebar-badge">{badge > 99 ? '99+' : badge}</span>}
                </div>
                {!collapsed && <span className="sidebar-link-label">{label}</span>}
            </Link>
        );
    };

    const MenuButton = ({ onClick, icon: Icon, label, danger }) => {
        return (
            <button className={`sidebar-link ${danger ? "danger" : ""}`} onClick={onClick} title={collapsed ? label : undefined}>
                <div className="sidebar-link-icon">
                    <Icon size={22} strokeWidth={2} />
                </div>
                {!collapsed && <span className="sidebar-link-label">{label}</span>}
            </button>
        );
    };

    return (
        <>
            {/* Mobile Header (Hamburger + Logo) */}
            <div className="sidebar-mobile-header hide-desktop">
                <div className="sidebar-brand-mobile">
                    <div className="brand-logo-mobile">
                        <img src="/stajhub-icon.svg" alt="logo" />
                    </div>
                    <span>StajHub</span>
                </div>
                <button className="mobile-toggle-btn" onClick={() => setMobileOpen(true)}>
                    <Menu size={24} />
                </button>
            </div>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div className="sidebar-overlay hide-desktop" onClick={() => setMobileOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
                <div className="sidebar-top">
                    <Link to="/" className="sidebar-brand">
                        <div className="brand-logo">
                            <img src="/stajhub-icon.svg" alt="logo" />
                        </div>
                        {!collapsed && <span className="brand-text">Staj<span>Hub</span></span>}
                    </Link>
                    
                    <button className="collapse-toggle hide-mobile" onClick={() => setCollapsed(!collapsed)}>
                        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                {/* User Info (Mini Profile) */}
                <div className="sidebar-user">
                    <div className="sidebar-avatar">
                        <img src={userProfile?.photoUrl || userProfile?.logoUrl || currentUser?.photoURL || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} alt="User" />
                    </div>
                    {!collapsed && (
                        <div className="sidebar-user-info">
                            <h4>{currentUser?.displayName}</h4>
                            <p>{isStudent ? "Öğrenci" : "Şirket"}</p>
                        </div>
                    )}
                </div>

                <div className="sidebar-nav">
                    <div className="nav-section">
                        {!collapsed && <div className="nav-section-title">Ana Menü</div>}
                        
                        <MenuLink to="/jobs" icon={Briefcase} label="İlan Vitrini" />
                        
                        {isStudent ? (
                            <>
                                <MenuLink to="/student/dashboard" icon={LayoutDashboard} label="Dashboard" />
                                <MenuLink to="/student/applications" icon={Briefcase} label="Başvurularım" />
                            </>
                        ) : (
                            <>
                                <MenuLink to="/company/dashboard" icon={LayoutDashboard} label="Dashboard" />
                                <MenuLink to="/company/jobs" icon={Briefcase} label="İlan Yönetimi" />
                                <MenuLink to="/company/post-job" icon={PlusCircle} label="Yeni İlan Ver" />
                            </>
                        )}
                    </div>

                    <div className="nav-section">
                        {!collapsed && <div className="nav-section-title">İletişim & Sosyal</div>}
                        <MenuLink to="/messages" icon={MessageSquare} label="Mesajlar" />
                        <MenuLink to="/notifications" icon={Bell} label="Bildirimler" badge={unreadCount} />
                    </div>
                </div>

                <div className="sidebar-bottom">
                    {isAdmin && (
                        <MenuLink to="/admin" icon={User} label="Admin Paneli" />
                    )}
                    <MenuLink to={isStudent ? "/student/profile" : "/company/profile"} icon={User} label="Profil Ayarları" />
                    <MenuButton onClick={handleLogout} icon={LogOut} label="Çıkış Yap" danger />
                </div>
            </aside>
        </>
    );
}
