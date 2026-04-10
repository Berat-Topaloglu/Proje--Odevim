import { useState } from "react";
import { Star, MessageSquare, ShieldAlert } from "lucide-react";
import { formatDate } from "../../../utils/helpers";

export default function ProfileReviews({ reviews, effectiveId, isOwnProfile, userProfile, currentUser, onRatingSubmit, reportModal, setReportModal, reportReason, setReportReason, onReportSubmit, reporting }) {
    const [ratingValue, setRatingValue] = useState(5);
    const [ratingComment, setRatingComment] = useState("");
    const [submittingRating, setSubmittingRating] = useState(false);

    const handleRate = async () => {
        setSubmittingRating(true);
        await onRatingSubmit(ratingValue, ratingComment);
        setRatingComment("");
        setSubmittingRating(false);
    };

    const avgRating = reviews.length > 0 
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    return (
        <>
            <div className="bento-card">
                <div className="section-header-pro">
                    <div className="section-icon"><Star size={20} /></div>
                    <div style={{ flex: 1 }}>
                        <h2 className="section-title-pro">DEĞERLENDİRMELER</h2>
                        {avgRating && (
                            <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 800 }}>GENEL SKOR: {avgRating}</span>
                        )}
                    </div>
                </div>

                <div className="reviews-list-pro" style={{ marginTop: 16 }}>
                    {reviews.length === 0 ? (
                        <div className="empty-state-pro" style={{ textAlign: 'center', padding: '24px 12px' }}>
                            <MessageSquare size={32} style={{ opacity: 0.1, marginBottom: 12 }} />
                            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Sistemde henüz yorum bulunamadı.</p>
                        </div>
                    ) : (
                        reviews.map((r) => (
                            <div key={r.id} className="review-card-pro" style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-light)' }}>
                                        {r.jobTitle || "DENEYİM ANALİZİ"}
                                    </span>
                                    <div style={{ display: 'flex', gap: 2 }}>
                                        {[...Array(5)].map((_, i) => (
                                            <Star 
                                                key={i} 
                                                size={10} 
                                                fill={i < r.rating ? "#fbbf24" : "transparent"} 
                                                color={i < r.rating ? "#fbbf24" : "rgba(255,255,255,0.1)"} 
                                            />
                                        ))}
                                    </div>
                                </div>
                                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>
                                    "{r.comment || "Analiz yorumu girilmedi."}"
                                </p>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                                    {formatDate(r.createdAt)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Şirket Aksiyonu */}
            {!isOwnProfile && userProfile?.type === "company" && (
                <div className="bento-card" style={{ marginTop: 24, background: 'rgba(251, 191, 36, 0.02)', border: '1px solid rgba(251, 191, 36, 0.05)' }}>
                    <div className="section-header-pro">
                        <div className="section-icon" style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }}>
                            <Star size={20} />
                        </div>
                        <h2 className="section-title-pro" style={{ color: '#fbbf24' }}>YETENEK PUANLA</h2>
                    </div>

                    <div className="rating-form-pro" style={{ marginTop: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
                            {[1, 2, 3, 4, 5].map(star => (
                                <Star
                                    key={star}
                                    size={32}
                                    onClick={() => setRatingValue(star)}
                                    fill={star <= ratingValue ? "#fbbf24" : "transparent"}
                                    color={star <= ratingValue ? "#fbbf24" : "rgba(255,255,255,0.1)"}
                                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                />
                            ))}
                        </div>
                        
                        <div className="form-group-pro">
                            <textarea
                                className="modern-textarea"
                                placeholder="Gözlemlerinizi buraya yazın..."
                                value={ratingComment}
                                onChange={e => setRatingComment(e.target.value)}
                                rows={3}
                                style={{ background: 'rgba(0,0,0,0.2)' }}
                            />
                        </div>

                        <button
                            className="btn-save-omega"
                            style={{ width: '100%', marginTop: 20, background: 'var(--gradient-warning)' }}
                            onClick={handleRate}
                            disabled={submittingRating}
                        >
                            {submittingRating ? "VERİ İŞLENİYOR..." : "DEĞERLENDİRMEYİ ONAYLA"}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

