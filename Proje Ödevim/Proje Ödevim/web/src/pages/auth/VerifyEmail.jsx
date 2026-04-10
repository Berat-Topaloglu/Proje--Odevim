import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Mail, RefreshCw, LogOut, CheckCircle } from "lucide-react";
import "./Auth.css";

export default function VerifyEmail() {
    const { currentUser, reloadUser, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const navigate = useNavigate();

    // Check verification status periodically
    useEffect(() => {
        if (!currentUser) {
            navigate("/login");
            return;
        }

        if (currentUser.emailVerified) {
            navigate("/");
            return;
        }

        const interval = setInterval(async () => {
            const verified = await reloadUser();
            if (verified) {
                clearInterval(interval);
                navigate("/");
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [currentUser, navigate, reloadUser]);

    const handleRefresh = async () => {
        setLoading(true);
        const verified = await reloadUser();
        if (verified) {
            navigate("/");
        } else {
            setMessage("Henüz doğrulama yapılmamış. Lütfen gelen kutunu (ve spam klasörünü) kontrol et.");
            setTimeout(() => setMessage(""), 5000);
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <div className="auth-page">
            <div className="auth-bg">
                <div className="auth-blob blob-1" />
                <div className="auth-blob blob-2" />
            </div>

            <div className="auth-container page-enter">
                <div className="auth-logo">
                    <div className="logo-icon">S</div>
                    <span className="logo-text">Staj<span>Hub</span></span>
                </div>

                <div className="auth-card card-glass text-center">
                    <div className="verify-icon-container mb-24">
                        <div className="verify-icon-bg">
                            <Mail size={40} color="var(--primary)" />
                        </div>
                    </div>

                    <h1 className="auth-title">E-postanı Doğrula 📧</h1>
                    <p className="auth-subtitle">
                        Devam edebilmek için <strong>{currentUser?.email}</strong> adresine gönderdiğimiz doğrulama linkine tıklaman gerekiyor.
                    </p>

                    {message && <div className="alert alert-info">{message}</div>}

                    <div className="verify-actions mt-24">
                        <button 
                            className="btn btn-primary btn-lg w-full mb-12" 
                            onClick={handleRefresh} 
                            disabled={loading}
                        >
                            {loading ? <RefreshCw className="spin" size={18} /> : "Doğrulamayı Kontrol Et"}
                        </button>
                        
                        <div className="verify-footer-links">
                            <button className="btn-link" onClick={handleLogout}>
                                <LogOut size={14} /> Farklı Hesapla Giriş Yap
                            </button>
                        </div>
                    </div>

                    <div className="verify-info-box mt-24">
                        <p>💡 <strong>İpucu:</strong> Linke tıkladıktan sonra bu sayfa otomatik olarak güncellenecektir.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
