import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
    confirmPasswordReset, 
    applyActionCode, 
    checkActionCode
} from "firebase/auth";
import { auth } from "../../firebase/config";
import "./Auth.css";

export default function AuthAction() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [mode, setMode] = useState("");
    const [oobCode, setOobCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [email, setEmail] = useState("");

    useEffect(() => {
        const m = searchParams.get("mode");
        const code = searchParams.get("oobCode");
        
        if (!m || !code) {
            setError("Geçersiz veya eksik işlem kodu.");
            setLoading(false);
            return;
        }

        setMode(m);
        setOobCode(code);

        // Omega Security Protocol: Clear URL parameters to hide sensitive tokens
        window.history.replaceState(null, "", window.location.pathname);

        // Verify the code
        checkActionCode(auth, code)
            .then((info) => {
                if (m === "verifyEmail") {
                    handleVerifyEmail(code);
                } else if (m === "resetPassword") {
                    setEmail(info.data.email);
                    setLoading(false);
                }
            })
            .catch((err) => {
                setError("Bu işlem kodu geçersiz, süresi dolmuş veya zaten kullanılmış.");
                setLoading(false);
            });
    }, [searchParams]);

    const handleVerifyEmail = async (code) => {
        try {
            await applyActionCode(auth, code);
            setSuccess(true);
        } catch (err) {
            setError("E-posta doğrulanırken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return setError("Şifreler eşleşmiyor.");
        }
        if (password.length < 6) {
            return setError("Şifre en az 6 karakter olmalıdır.");
        }

        setError("");
        setLoading(true);
        try {
            await confirmPasswordReset(auth, oobCode, password);
            setSuccess(true);
            setOobCode(""); // Cyber-Purge: Destroy the code once it is used
        } catch (err) {
            setError("Şifre güncellenirken bir hata oluştu veya bu link zaten kullanılmış.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-card card-glass text-center">
                        <div className="loading-spinner" style={{ margin: "0 auto 20px" }} />
                        <p>İşleminiz kontrol ediliyor...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-card card-glass text-center">
                        <div className="success-icon" style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
                        <h1 className="auth-title">İşlem Başarılı!</h1>
                        <p className="auth-subtitle">
                            {mode === "verifyEmail" 
                                ? "E-posta adresiniz başarıyla doğrulandı." 
                                : "Şifreniz başarıyla güncellendi."}
                        </p>
                        <button 
                            className="btn btn-primary btn-lg w-full mt-24" 
                            onClick={() => navigate("/login")}
                        >
                            Giriş Yap
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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

                <div className="auth-card card-glass">
                    {error ? (
                        <div className="text-center">
                            <div className="error-icon" style={{ fontSize: 48, marginBottom: 20 }}>❌</div>
                            <h1 className="auth-title">Hata!</h1>
                            <p className="auth-subtitle">{error}</p>
                            <button className="btn btn-secondary w-full mt-24" onClick={() => navigate("/login")}>
                                Giriş Sayfasına Dön
                            </button>
                        </div>
                    ) : mode === "resetPassword" ? (
                        <>
                            <h1 className="auth-title">Yeni Şifre Belirle</h1>
                            <p className="auth-subtitle">{email} adresi için yeni şifrenizi girin.</p>

                            <form onSubmit={handleResetPassword} className="auth-form">
                                <div className="form-group">
                                    <label className="form-label">Yeni Şifre</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Şifre Tekrar</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary btn-lg w-full mt-16" disabled={loading}>
                                    Şifreyi Güncelle
                                </button>
                            </form>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
