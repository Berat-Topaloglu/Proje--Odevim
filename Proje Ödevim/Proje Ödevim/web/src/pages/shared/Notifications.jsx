import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, limit } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Notifications.css";

export default function Notifications() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, `notifications/${currentUser.uid}/items`),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const notifData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Memory sort
            notifData.sort((a, b) => {
                const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
                const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
                return dateB - dateA;
            });

            setNotifications(notifData);
            setLoading(false);
        }, (err) => {
            console.error("Bildirimler yüklenemedi:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const markAsRead = async (id) => {
        try {
            await updateDoc(doc(db, `notifications/${currentUser.uid}/items`, id), {
                read: true
            });
        } catch (err) {
            console.error("Bildirim güncellenemedi:", err);
        }
    };

    const handleNotificationClick = async (notif) => {
        if (!notif.read) {
            await markAsRead(notif.id);
        }
        if (notif.link) {
            navigate(notif.link);
        }
    };

    const deleteNotification = async (id, e) => {
        e.stopPropagation(); // Butona tıklanınca satır tıklanmasını engelle
        try {
            await deleteDoc(doc(db, `notifications/${currentUser.uid}/items`, id));
        } catch (err) {
            console.error("Bildirim silinemedi:", err);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case "application": return "📨";
            case "message": return "💬";
            case "review": return "⭐";
            case "system": return "🔔";
            default: return "📢";
        }
    };

    if (loading) return <div className="page-wrapper"><div className="loader">Yükleniyor...</div></div>;

    return (
        <div className="notifications-page page-wrapper">
            <div className="content-wrapper page-enter" style={{ maxWidth: 800 }}>
                <div className="section-header">
                    <h1 className="dashboard-title">Bildirimler 🔔</h1>
                    {notifications.length > 0 && (
                        <p className="text-muted">{notifications.filter(n => !n.read).length} yeni bildirim</p>
                    )}
                </div>

                <div className="notifications-list card mt-24">
                    {notifications.length === 0 ? (
                        <div className="empty-state" style={{ padding: "60px 0" }}>
                            <span style={{ fontSize: 48 }}>📭</span>
                            <p>Henüz bir bildiriminiz bulunmuyor.</p>
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <div
                                key={notif.id}
                                className={`notif-item ${notif.read ? "read" : "unread"}`}
                                onClick={() => handleNotificationClick(notif)}
                                style={{ cursor: notif.link ? 'pointer' : 'default' }}
                            >
                                <div className="notif-icon">{getIcon(notif.type)}</div>
                                <div className="notif-content">
                                    <p className="notif-message">{notif.message}</p>
                                    <span className="notif-time">
                                        {notif.createdAt?.toDate()?.toLocaleDateString("tr-TR")} {notif.createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="notif-actions">
                                    {!notif.read && (
                                        <button className="btn-icon-small" title="Okundu işaretle" onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}>
                                            ✅
                                        </button>
                                    )}
                                    <button className="btn-icon-small" title="Sil" onClick={(e) => deleteNotification(notif.id, e)}>
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
