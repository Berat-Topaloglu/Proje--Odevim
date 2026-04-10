import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import "./Auth.css";

export default function Register() {
    const [step, setStep] = useState(1); // 1: tip seç, 2: form
    const [userType, setUserType] = useState("");
    const [form, setForm] = useState({ displayName: "", email: "", password: "", confirmPassword: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { register, loginWithGoogle } = useAuth();
    const { showNotification } = useNotification();
    const navigate = useNavigate();

    const handleTypeSelect = (type) => {
        setUserType(type);
        setStep(2);
    };

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const DISALLOWED_DOMAINS = [
        "temp-mail.org", "10minutemail.com", "guerrillamail.com", "sharklasers.com", 
        "getnada.com", "mailinator.com", "dispostable.com", "tempmail.net",
        "yopmail.com", "fakeinbox.com", "moakt.com"
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const emailDomain = form.email.split("@")[1]?.toLowerCase();
        if (DISALLOWED_DOMAINS.includes(emailDomain)) {
            showNotification(
                "Güvenlik nedeniyle geçici e-posta servisleri desteklenmemektedir. Lütfen kurumsal veya kişisel bir e-posta adresi kullanın.",
                "warning",
                "⚠️ Güvenlik Uyarısı"
            );
            return;
        }

        if (form.password !== form.confirmPassword) {
            return setError("Şifreler eşleşmiyor.");
        }
        if (form.password.length < 6) {
            return setError("Şifre en az 6 karakter olmalıdır.");
        }

        setLoading(true);
        try {
            await register(form.email, form.password, form.displayName, userType);
            navigate("/");
        } catch (err) {
            switch (err.code) {
                case "auth/email-already-in-use":
                    setError("Bu e-posta zaten kullanılıyor.");
                    break;
                case "auth/weak-password":
                    setError("Şifre çok zayıf.");
                    break;
                default:
                    setError("Kayıt yapılamadı: " + err.message);
            }
        }
        setLoading(false);
    };

    const handleGoogle = async () => {
        if (!userType) return;
        setLoading(true);
        try {
            await loginWithGoogle(userType);
            navigate("/");
        } catch (err) {
            setError("Google ile kayıt yapılamadı.");
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
                    {step === 1 ? (
                        <>
                            <h1 className="auth-title">Nasıl katılıyorsun? 🚀</h1>
                            <p className="auth-subtitle">Hesap türünü seç</p>

                            <div className="type-select-grid">
                                <button className="type-select-card" onClick={() => handleTypeSelect("student")}>
                                    <div className="type-icon">🎓</div>
                                    <h3>Öğrenci</h3>
                                    <p>Staj ilanlarına göz at ve başvur</p>
                                </button>
                                <button className="type-select-card" onClick={() => handleTypeSelect("company")}>
                                    <div className="type-icon">🏢</div>
                                    <h3>Şirket</h3>
                                    <p>Stajer ilanı ver, aday bul</p>
                                </button>
                            </div>

                            <p className="auth-switch">
                                Hesabın var mı? <Link to="/login">Giriş yap</Link>
                            </p>
                        </>
                    ) : (
                        <>
                            <button className="back-btn" onClick={() => setStep(1)}>← Geri</button>
                            <h1 className="auth-title">
                                {userType === "student" ? "🎓 Öğrenci Kaydı" : "🏢 Şirket Kaydı"}
                            </h1>
                            <p className="auth-subtitle">Bilgilerini gir</p>

                            {error && <div className="alert alert-error">{error}</div>}

                            <form onSubmit={handleSubmit} className="auth-form">
                                <div className="form-group">
                                    <label className="form-label">
                                        {userType === "student" ? "Ad Soyad" : "Şirket Adı"}
                                    </label>
                                    <input
                                        className="form-input"
                                        name="displayName"
                                        placeholder={userType === "student" ? "Ahmet Yılmaz" : "Teknoloji A.Ş."}
                                        value={form.displayName}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">E-posta</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        name="email"
                                        placeholder="ornek@email.com"
                                        value={form.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Şifre</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        name="password"
                                        placeholder="Min. 6 karakter"
                                        value={form.password}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Şifre Tekrar</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        name="confirmPassword"
                                        placeholder="••••••••"
                                        value={form.confirmPassword}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                                    {loading ? <span className="loading-spinner" style={{ width: 18, height: 18 }} /> : "Kayıt Ol"}
                                </button>
                            </form>

                            <div className="auth-divider"><span>veya</span></div>

                            <button className="btn-google" onClick={handleGoogle} disabled={loading} type="button">
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Google ile Kayıt Ol
                            </button>

                            <p className="auth-switch">
                                Hesabın var mı? <Link to="/login">Giriş yap</Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
