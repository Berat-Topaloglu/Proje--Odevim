import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import "./Auth.css";

export default function Register() {
    const [step, setStep] = useState(1);
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
                "Geçici e-posta servisleri desteklenmemektedir.",
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
            
            {/* Visual Side */}
            <div className="auth-visual-side" style={{background: 'radial-gradient(circle at top left, rgba(139, 92, 246, 0.1) 0%, transparent 60%), radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.1) 0%, transparent 60%)'}}>
                <div className="auth-bg">
                    <div className="auth-blob blob-1" style={{background: 'var(--secondary)'}} />
                    <div className="auth-blob blob-2" style={{background: 'var(--primary)'}} />
                </div>
                <div className="auth-visual-content">
                    <h1 className="auth-mega-title">Aramıza <br/>Katıl. <Sparkles color="var(--secondary)" size={48} style={{verticalAlign: 'middle'}}/></h1>
                    <p className="auth-mega-subtitle">Kariyer yolculuğunda sana en uygun şirketleri keşfet veya ekibini mükemmel yeteneklerle büyüt.</p>
                </div>
            </div>

            {/* Form Side */}
            <div className="auth-form-side">
                <div className="auth-container page-enter">
                    <Link to="/" className="auth-logo">
                        <div className="logo-icon">
                            <img src="/stajhub-icon.svg" alt="logo" style={{ width: '100%', height: '100%' }} />
                        </div>
                        <span className="logo-text" style={{ fontSize: 24 }}>Staj<span>Hub</span></span>
                    </Link>

                    {step === 1 ? (
                        <>
                            <div>
                                <h1 className="auth-title">Nasıl Katılıyorsun? 🚀</h1>
                                <p className="auth-subtitle">Sana özel deneyim için hesap türünü seç.</p>
                            </div>

                            <div className="type-select-grid">
                                <button className="type-select-card" onClick={() => handleTypeSelect("student")}>
                                    <div className="type-icon">🎓</div>
                                    <h3>Öğrenci / Mezun</h3>
                                    <p>İlanlara göz at, başvur, şirketlerle iletişim kur.</p>
                                    <div style={{marginTop: 16, color: 'var(--primary)', opacity: 0.8}}><ArrowRight size={20}/></div>
                                </button>
                                <button className="type-select-card" onClick={() => handleTypeSelect("company")}>
                                    <div className="type-icon">🏢</div>
                                    <h3>Şirket Yetkilisi</h3>
                                    <p>Stajyer ilanı ver, Türkiye'nin yeteneklerini keşfet.</p>
                                    <div style={{marginTop: 16, color: 'var(--primary)', opacity: 0.8}}><ArrowRight size={20}/></div>
                                </button>
                            </div>

                            <p className="auth-switch">
                                Zaten hesabın var mı? <Link to="/login">Giriş Yap</Link>
                            </p>
                        </>
                    ) : (
                        <>
                            <button className="back-btn" onClick={() => setStep(1)}>← Geri</button>
                            <div>
                                <h1 className="auth-title">
                                    {userType === "student" ? "Öğrenci Kaydı 🎓" : "Şirket Kaydı 🏢"}
                                </h1>
                                <p className="auth-subtitle">Hesabını oluşturmak için bilgilerini gir.</p>
                            </div>

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
                                    <label className="form-label">E-posta Adresi</label>
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
                                    <label className="form-label">Şifre Belirle</label>
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

                                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} style={{ padding: '16px', fontSize: 16 }}>
                                    {loading ? <span className="loading-spinner" style={{ width: 18, height: 18 }} /> : "Kayıt Ol"}
                                </button>
                            </form>

                            <div className="auth-divider"><span>veya Google ile</span></div>

                            <button className="btn-google" onClick={handleGoogle} disabled={loading} type="button">
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Google Hızlı Kayıt
                            </button>

                            <p className="auth-switch">
                                Zaten hesabın var mı? <Link to="/login">Buradan Giriş Yap</Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
