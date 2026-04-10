import { Link, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import "./Navbar.css";

// This is now purely the "Floating Top Bar" for public pages or non-authenticated views
export default function Navbar() {
    const location = useLocation();

    // Sadece public/auth sayfalarında veya sidebar'ın olmadığı yerlerde Top Navbar'ı göstermek için
    // Eğer sidebar sistemine geçilirse, burayı sadece "Jobs" veya "Login/Register" sayfalarında tutabiliriz.
    // Ancak App.jsx üzerinden render kontrolünü yapacağımız için bu component her render edildiğinde şık görünecek.

    return (
        <nav className="floating-navbar-wrapper">
            <div className="floating-navbar" role="navigation" aria-label="Ana navigasyon">
                {/* Logo */}
                <Link to="/" className="navbar-logo" aria-label="StajHub Ana Sayfa">
                    <div className="logo-icon">
                        <img src="/stajhub-icon.svg" alt="" style={{ width: '60%', height: '60%' }} aria-hidden="true" />
                    </div>
                    <span className="logo-text">Staj<span>Hub</span></span>
                </Link>

                {/* Center Links */}
                <div className="navbar-links">
                    <Link to="/jobs" className={`nav-link ${location.pathname.startsWith("/jobs") ? "active" : ""}`}>
                        <Search size={18} /> İlan Vitrini
                    </Link>
                </div>

                {/* Right Side */}
                <div className="navbar-right">
                    <Link to="/login" className="btn btn-secondary btn-sm">Giriş Yap</Link>
                    <Link to="/register" className="btn btn-primary btn-sm">Kayıt Ol</Link>
                </div>
            </div>
        </nav>
    );
}
