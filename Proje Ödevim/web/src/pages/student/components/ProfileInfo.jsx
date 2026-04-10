import { User, School, Book, LineChart, Flame } from "lucide-react";

function InfoItemPro({ icon: Icon, label, value }) {
    return (
        <div className="info-item-pro">
            <div className="info-label-pro" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon size={12} /> {label}
            </div>
            <div className="info-value-pro">{value}</div>
        </div>
    );
}

export default function ProfileInfo({ profile, setProfile, editMode, suggestSkills }) {
    return (
        <div className="bento-card">
            <div className="section-header-pro">
                <div className="section-icon"><User size={24} /></div>
                <h2 className="section-title-pro">Akademik Bilgiler</h2>
            </div>

            {editMode ? (
                <div className="profile-form-pro" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="form-group-pro">
                        <label className="info-label-pro">Tam İsim</label>
                        <input
                            className="form-input"
                            style={{ width: '100%' }}
                            value={profile.displayName}
                            onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))}
                            placeholder="Ad Soyad"
                        />
                    </div>
                    <div className="form-group-pro">
                        <label className="info-label-pro">Üniversite</label>
                        <input
                            className="form-input"
                            style={{ width: '100%' }}
                            value={profile.university}
                            onChange={e => setProfile(p => ({ ...p, university: e.target.value }))}
                            placeholder="Üniversite"
                        />
                    </div>
                    <div className="form-group-pro">
                        <label className="info-label-pro">Bölüm</label>
                        <input
                            className="form-input"
                            style={{ width: '100%' }}
                            value={profile.department || ""}
                            onChange={e => {
                                const val = e.target.value;
                                setProfile(p => ({ ...p, department: val }));
                                suggestSkills(val);
                            }}
                            placeholder="Bölüm"
                        />
                    </div>
                    <div className="form-group-pro">
                        <label className="info-label-pro">Genel Not Ortalaması (GPA)</label>
                        <input
                            className="form-input"
                            style={{ width: '100%' }}
                            value={profile.gpa}
                            onChange={e => setProfile(p => ({ ...p, gpa: e.target.value }))}
                            placeholder="0.00"
                        />
                    </div>
                </div>
            ) : (
                <div className="profile-info-display-pro">
                    <InfoItemPro icon={School} label="Üniversite" value={profile.university || "Belirtilmedi"} />
                    <InfoItemPro icon={Book} label="Bölüm" value={profile.department || "Belirtilmedi"} />
                    <InfoItemPro icon={LineChart} label="GPA / Not Ortalaması" value={profile.gpa || "Belirtilmedi"} />
                    
                    <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
                        <label className="info-label-pro" style={{ color: 'var(--secondary)' }}>Profesyonel Özet</label>
                        <p style={{ marginTop: 12, fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.7, fontWeight: 500 }}>
                            {profile.bio || "Henüz bir biyografi eklenmemiş."}
                        </p>
                    </div>
                </div>
            )}

            {/* HEATMAP OMEGA */}
            {!editMode && (
                <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
                    <div className="section-header-pro" style={{ marginBottom: 16 }}>
                        <div className="section-icon" style={{ width: 32, height: 32 }}><Flame size={16} /></div>
                        <h3 className="section-title-pro" style={{ fontSize: 13 }}>AKTİVİTE ANALİZİ</h3>
                    </div>
                    
                    <div className="heatmap-container-pro">
                        <div className="heatmap-tiles-pro">
                            {Array.from({ length: 84 }).map((_, i) => {
                                const intensity = Math.random();
                                let bg = 'rgba(255,255,255,0.05)';
                                if (intensity > 0.9) bg = 'var(--primary)';
                                else if (intensity > 0.7) bg = 'rgba(255,255,255,0.4)';
                                else if (intensity > 0.5) bg = 'rgba(255,255,255,0.2)';
                                
                                return (
                                    <div key={i} className="tile-pro" style={{ background: bg }} />
                                );
                            })}
                        </div>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 12, textAlign: 'right', fontWeight: 800 }}>
                            84 GÜNLÜK OTONOM VERİ
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

