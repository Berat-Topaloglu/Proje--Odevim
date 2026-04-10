import { getInitials } from "../../../utils/helpers";
import { Edit3, GraduationCap } from "lucide-react";

export default function ProfileHeader({ profile, currentUser, isOwnProfile, editMode, setEditMode, setShowPhotoModal }) {
    const initials = getInitials(profile.displayName || profile.email);

    return (
        <div className="profile-header-card">
            <div className="profile-avatar-container">
                <div
                    className="avatar profile-avatar"
                    onClick={() => isOwnProfile && setShowPhotoModal(true)}
                    style={{ cursor: isOwnProfile ? "pointer" : "default" }}
                >
                    {(profile.photoUrl || (isOwnProfile && currentUser?.photoURL)) ? (
                        <img src={profile.photoUrl || (isOwnProfile && currentUser?.photoURL)} alt="Profil" className="avatar-img" />
                    ) : initials}
                </div>
            </div>

            <div className="profile-hero-info">
                <h1 className="profile-name">
                    {profile.displayName || "Kullanıcı"}
                    {isOwnProfile && !editMode && (
                        <button className="btn-icon-styled" onClick={() => setEditMode(true)} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
                            <Edit3 size={24} />
                        </button>
                    )}
                </h1>
                
                <div className="profile-meta-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <GraduationCap size={22} color="var(--secondary)" /> 
                        <span style={{ fontSize: 18, color: 'white' }}>{profile.department || "Bölüm Belirtilmedi"}</span>
                    </div>
                    <div style={{ width: 1, height: 24, background: 'var(--border)' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <School size={22} color="var(--text-muted)" />
                        <span style={{ fontSize: 18 }}>{profile.university || "Üniversite Belirtilmedi"}</span>
                    </div>
                </div>

                <div className="profile-bio">
                    {profile.bio || "Profesyonel kariyer yolculuğunuzda kendinizi ifade edebileceğiniz bir biyografi ekleyerek fark yaratın."}
                </div>
            </div>
        </div>
    );
}

