import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Auth.css";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { resetPassword } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);
        try {
            await resetPassword(email);
            setMessage("Şifre sıfırlama e-postası gönderildi. Gelen kutunu kontrol et.");
        } catch (err) {
            setError("E-posta gönderilemedi. Adresi kontrol et.");
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-bg">
                <div className="auth-blob blob-1" />
                <div className="auth-blob blob-2" />
            </div>

            <div className="auth-container page-enter">
                <div className="auth-logo">
                    <div className="logo-icon">
                        <img src="/stajhub-icon.svg" alt="logo" style={{ width: '100%', height: '100%' }} />
                    </div>
                    <span className="logo-text">Staj<span>Hub</span></span>
                </div>

                <div className="auth-card card-glass">
                    <h1 className="auth-title">Şifremi Unuttum 🔑</h1>
                    <p className="auth-subtitle">E-postana sıfırlama bağlantısı gönderelim</p>

                    {error && <div className="alert alert-error">{error}</div>}
                    {message && <div className="alert alert-success">{message}</div>}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label className="form-label">E-posta</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="ornek@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                            {loading ? <span className="loading-spinner" style={{ width: 18, height: 18 }} /> : "Sıfırlama Bağlantısı Gönder"}
                        </button>
                    </form>

                    <p className="auth-switch">
                        <Link to="/login">← Giriş sayfasına dön</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
