import { Cpu, Plus, X } from "lucide-react";

export default function ProfileSkills({ profile, setProfile, isOwnProfile, editMode, availableSkills, toggleSkill, skillInput, setSkillInput, addCustomSkill }) {
    return (
        <div className="bento-card">
            <div className="section-header-pro">
                <div className="section-icon"><Cpu size={24} /></div>
                <h2 className="section-title-pro">Yetenek Havuzu</h2>
            </div>

            {editMode ? (
                <div className="profile-form-pro">
                    <div className="skills-grid-pro" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
                        {availableSkills.map((s) => (
                            <button
                                key={s}
                                onClick={() => toggleSkill(s)}
                                className={`skill-tag-pro ${profile.skills?.includes(s) ? "active" : ""}`}
                                type="button"
                                style={{ 
                                    background: profile.skills?.includes(s) ? 'var(--secondary)' : 'var(--bg-card)',
                                    color: profile.skills?.includes(s) ? 'white' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    border: profile.skills?.includes(s) ? '1px solid var(--secondary)' : '1px solid var(--border)'
                                }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
                        <input
                            type="text"
                            placeholder="Yeni yetenek ekle..."
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
                            className="form-input"
                            style={{ flex: 1 }}
                        />
                        <button className="btn-pro btn-primary" onClick={addCustomSkill} type="button" style={{ width: 54, height: 54, padding: 0, justifyContent: 'center' }}>
                            <Plus size={24} />
                        </button>
                    </div>

                    <div className="selected-skills-preview">
                        <label className="info-label-pro" style={{ color: 'var(--secondary)' }}>Seçilen Yetenekler ({profile.skills?.length || 0})</label>
                        <div className="skill-cloud-pro" style={{ marginTop: 16 }}>
                            {profile.skills?.map((s) => (
                                <span key={s} className="skill-tag-pro" style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--border-accent)', color: 'white', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {s}
                                    <X size={16} onClick={() => toggleSkill(s)} style={{ cursor: 'pointer' }} />
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="skill-cloud-pro">
                    {profile.skills?.length === 0 ? (
                        <p className="empty-state-pro" style={{ color: 'var(--text-muted)', fontSize: 14 }}>Henüz bir yetenek eklenmemiş.</p>
                    ) : (
                        profile.skills.map((s) => (
                            <span key={s} className="skill-tag-pro">{s}</span>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
