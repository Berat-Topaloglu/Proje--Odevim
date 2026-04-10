export default function ProfileSettings({ isOwnProfile, editMode, isGoogleSignIn, hasPassword, newPassword, setNewPassword, handleSetPassword, settingPassword, authErrorModal, setAuthErrorModal, passwordSuccessModal, logout }) {
    if (!isOwnProfile || editMode) return null;

    return (
        <>
            {/* Password Setting for Google Users */}
            {isGoogleSignIn && !hasPassword && (
                <div className="card mt-24">
                    <h2 className="section-title2">🔒 Şifre Belirle</h2>
                    <p className="text-muted" style={{ marginBottom: 16 }}>Google hesabınızla giriş yaptığınız için hesabınıza standart bir şifre de tanımlayabilirsiniz. E-posta ve belirlediğiniz şifreyle normal giriş de yapabilirsiniz.</p>
                    <div className="profile-form" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div className="form-group" style={{ width: "100%", maxWidth: 500 }}>
                            <label htmlFor="newPassword" className="form-label" style={{ textAlign: "center" }}>Yeni Şifre</label>
                            <input
                                id="newPassword"
                                type="password"
                                className="form-input"
                                style={{ textAlign: "center", padding: "12px", fontSize: "16px" }}
                                placeholder="Yeni şifrenizi girin (En az 6 hane)"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={handleSetPassword}
                            disabled={settingPassword || newPassword.length < 6}
                            style={{ marginTop: 16, padding: "12px 32px", fontSize: "15px", width: "100%", maxWidth: 500 }}
                        >
                            {settingPassword ? "Kaydediliyor..." : "Şifreyi Kaydet"}
                        </button>
                    </div>
                </div>
            )}

            {/* Auth Error Modal */}
            {authErrorModal && (
                <div className="modal-overlay" onClick={() => setAuthErrorModal(false)} role="dialog" aria-modal="true" aria-label="Oturum süresi doldu">
                    <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: "center", padding: "32px 24px" }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }} aria-hidden="true">🔐</div>
                        <h3 style={{ marginBottom: 12, color: "var(--warning)" }}>Oturum Süresi Doldu</h3>
                        <p style={{ color: "var(--text-secondary)", marginBottom: 24, fontSize: 15, lineHeight: 1.5 }}>
                            Güvenliğiniz için şifre belirlemeden önce kimliğinizi tekrar doğrulamamız gerekiyor. Lütfen çıkış yapıp tekrar giriş yapın.
                        </p>
                        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                            <button className="btn btn-secondary" onClick={() => setAuthErrorModal(false)}>İptal</button>
                            <button className="btn btn-primary" onClick={() => { logout(); window.location.href = '/login'; }}>Yeniden Giriş Yap</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Success Modal */}
            {passwordSuccessModal && (
                <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Şifre başarıyla belirlendi">
                    <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, textAlign: "center", padding: "40px 28px" }}>
                        <div style={{ fontSize: 52, marginBottom: 16 }} aria-hidden="true">🔒</div>
                        <h3 style={{ marginBottom: 12, color: "var(--success)" }}>Şifre Başarıyla Belirlendi!</h3>
                        <p style={{ color: "var(--text-secondary)", marginBottom: 28, fontSize: 15, lineHeight: 1.6 }}>
                            Şifreniz güvenli şekilde kaydedildi. Güvenliğiniz için lütfen tekrar giriş yapın.
                        </p>
                        <button
                            className="btn btn-primary"
                            style={{ width: "100%", padding: "14px", fontSize: 16 }}
                            onClick={async () => { await logout(); window.location.href = '/login'; }}
                        >
                            🚪 Çıkış Yap ve Tekrar Giriş Yap
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
