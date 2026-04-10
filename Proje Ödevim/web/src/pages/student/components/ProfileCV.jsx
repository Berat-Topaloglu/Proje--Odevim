import { FileText, Eye, Trash2, UploadCloud } from "lucide-react";

export default function ProfileCV({ profile, setProfile, isOwnProfile, uploadingCV, handleCVUpload, handleDeleteCV }) {
    return (
        <div className="bento-card">
            <div className="section-header-pro">
                <div className="section-icon"><FileText size={24} /></div>
                <h2 className="section-title-pro">Dijital Özgeçmiş</h2>
            </div>

            <div className="cv-section-pro">
                {profile.cvUrl ? (
                    <div className="cv-box-pro">
                        <div className="cv-file-display">
                            <div className="cv-file-icon">
                                <FileText size={32} color="var(--secondary)" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Özgeçmiş Belgesi.pdf</p>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Sistemde kayıtlı ve işverenlere açık.</p>
                            </div>
                        </div>

                        <div className="cv-actions-pro" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginTop: 20 }}>
                            <a
                                href={profile.cvUrl.includes("/upload/") ? profile.cvUrl.replace("/upload/", "/upload/fl_attachment:false/") : profile.cvUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-pro btn-outline"
                                style={{ textDecoration: 'none', justifyContent: 'center', fontSize: 14 }}
                            >
                                <Eye size={18} /> GÖRÜNTÜLE
                            </a>
                            {isOwnProfile && (
                                <button
                                    className="btn-pro"
                                    onClick={handleDeleteCV}
                                    style={{ width: 54, height: 54, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 0, justifyContent: 'center', borderRadius: 16 }}
                                >
                                    <Trash2 size={22} />
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="empty-state-pro" style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed var(--border)', borderRadius: 20 }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: 15, fontWeight: 500 }}>Henüz bir özgeçmiş dosyası yüklenmemiş.</p>
                    </div>
                )}

                {isOwnProfile && (
                    <label className="btn-pro btn-primary" style={{ cursor: "pointer", marginTop: 24, justifyContent: 'center' }}>
                        <UploadCloud size={20} />
                        <span>{uploadingCV ? "YÜKLENİYOR..." : (profile.cvUrl ? "DOSYAYI GÜNCELLE" : "ÖZGEÇMİŞ YÜKLE")}</span>
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            style={{ display: "none" }}
                            onChange={handleCVUpload}
                            disabled={uploadingCV}
                        />
                    </label>
                )}
            </div>
        </div>
    );
}
