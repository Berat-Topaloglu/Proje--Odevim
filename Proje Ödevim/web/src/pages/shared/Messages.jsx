import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, where, limit, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { Send, Search, User, Briefcase, Info, MoreVertical } from "lucide-react";
import { containsForbiddenContent } from "../../utils/wordFilter";
import "./Messages.css";

export default function Messages() {
    const { currentUser, userProfile } = useAuth();
    const { showNotification } = useNotification();
    const isCompany = userProfile?.type === "company";
    const [chats, setChats] = useState([]);
    const [jobs, setJobs] = useState([]); 
    const [selectedJob, setSelectedJob] = useState("all"); 
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const messagesEndRef = useRef(null);

    const { chatId: paramChatId } = useParams();

    useEffect(() => {
        if (!currentUser || !isCompany) return;
        const q = query(collection(db, "jobs"), where("companyId", "==", currentUser.uid), limit(30));
        const unsub = onSnapshot(q, (snap) => {
            setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [currentUser, isCompany]);

    useEffect(() => {
        if (!currentUser) return;
        const q = query(collection(db, "chats"), where("participants", "array-contains", currentUser.uid), limit(50));
        const unsubscribe = onSnapshot(q, async (snap) => {
            const chatData = await Promise.all(snap.docs.map(async d => {
                const data = d.data();
                const otherId = data.participants.find(id => id !== currentUser.uid);
                let otherUser = { name: "Kullanıcı", photo: "" };
                try {
                    const uDoc = await getDoc(doc(db, "users", otherId));
                    if (uDoc.exists()) {
                        otherUser = {
                            name: uDoc.data().displayName,
                            photo: uDoc.data().photoURL || uDoc.data().logoUrl || ""
                        };
                    }
                } catch (e) { }
                return { id: d.id, ...data, otherUser, jobTitle: data.jobTitle || "", jobId: data.jobId || "" };
            }));
            chatData.sort((a, b) => {
                const timeA = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : (a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0);
                const timeB = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : (b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0);
                return timeB - timeA;
            });
            setChats(chatData);
            setLoading(false);
        }, () => setLoading(false));
        return () => unsubscribe();
    }, [currentUser]);

    useEffect(() => {
        if (chats.length === 0) return;
        if (paramChatId) {
            const found = chats.find(c => c.id === paramChatId);
            if (found) {
                setActiveChat(found);
                if (isCompany && found.jobId && selectedJob !== "all" && selectedJob !== found.jobId) {
                    setSelectedJob(found.jobId);
                }
            }
        } else if (!activeChat && chats.length > 0) {
            setActiveChat(chats[0]);
        }
    }, [paramChatId, chats, isCompany]);

    useEffect(() => {
        if (!activeChat) return;
        const q = query(collection(db, `chats/${activeChat.id}/messages`), limit(100));
        const unsubscribe = onSnapshot(q, (snap) => {
            const msgData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            msgData.sort((a, b) => {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return timeA - timeB;
            });
            setMessages(msgData);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        });
        return () => unsubscribe();
    }, [activeChat]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat) return;
        const { isForbidden } = containsForbiddenContent(newMessage);
        if (isForbidden) {
            showNotification("Güvenlik protokolü: Mesajınız iletişim bilgisi içeremez.", "warning", "⚠️ Uyarı");
            setNewMessage(""); return;
        }
        const msgText = newMessage; setNewMessage("");
        try {
            await addDoc(collection(db, `chats/${activeChat.id}/messages`), {
                senderId: currentUser.uid, text: msgText, createdAt: serverTimestamp()
            });
            await updateDoc(doc(db, "chats", activeChat.id), {
                lastMessage: msgText, lastMessageAt: serverTimestamp()
            });
        } catch (err) { console.error(err); }
    };

    const filteredChats = chats.filter(c => {
        const matchesSearch = c.otherUser?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesJob = selectedJob === "all" || c.jobId === selectedJob;
        return matchesSearch && matchesJob;
    });

    if (loading) return <div className="page-wrapper"><div className="loader">Frekansaranıyor...</div></div>;

    return (
        <div className="messages-page page-wrapper" style={{ paddingTop: 'calc(var(--navbar-height) + 20px)' }}>
            <div className="messages-container">
                {/* OMEGA SIDEBAR */}
                <aside className="chat-sidebar">
                    <header className="sidebar-header">
                        <h2>Sinyaller</h2>
                        <div className="sidebar-search-box">
                            <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                            <input 
                                type="text" 
                                placeholder="Kanal ara..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {isCompany && jobs.length > 0 && (
                            <div className="job-tabs" style={{ marginTop: 16 }}>
                                <button className={`job-tab ${selectedJob === "all" ? "active" : ""}`} onClick={() => setSelectedJob("all")}>Tümü</button>
                                {jobs.map(j => (
                                    <button key={j.id} className={`job-tab ${selectedJob === j.id ? "active" : ""}`} onClick={() => setSelectedJob(j.id)} title={j.title}>
                                        {j.title.length > 20 ? j.title.slice(0, 18) + "..." : j.title}
                                    </button>
                                ))}
                            </div>
                        )}
                    </header>

                    <nav className="chat-list">
                        {filteredChats.length === 0 ? (
                            <div className="empty-sidebar-state">
                                <span>📡</span>
                                <p>Sinyal bulunamadı</p>
                            </div>
                        ) : (
                            filteredChats.map(chat => (
                                <div key={chat.id} className={`chat-item ${activeChat?.id === chat.id ? "active" : ""}`} onClick={() => setActiveChat(chat)}>
                                    <div className="chat-avatar-wrapper">
                                        <div className="avatar avatar-md" style={{ background: 'var(--gradient-primary)' }}>
                                            {chat.otherUser?.photo ? <img src={chat.otherUser.photo} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : chat.otherUser?.name?.charAt(0)}
                                        </div>
                                        <div className="status-ring"></div>
                                    </div>
                                    <div className="chat-item-info">
                                        <div className="chat-item-top">
                                            <span className="chat-name">{chat.otherUser?.name}</span>
                                            <span className="chat-time">
                                                {(() => {
                                                    const d = chat.lastMessageAt?.toMillis ? new Date(chat.lastMessageAt.toMillis()) : (chat.lastMessageAt ? new Date(chat.lastMessageAt) : new Date());
                                                    return !isNaN(d) ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                                                })()}
                                            </span>
                                        </div>
                                        {isCompany && chat.jobTitle && <span className="chat-job-tag">📋 {chat.jobTitle}</span>}
                                        <p className="chat-last-msg">{chat.lastMessage}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </nav>
                </aside>

                {/* OMEGA CHAT WINDOW */}
                <main className="chat-window">
                    {activeChat ? (
                        <>
                            <header className="chat-header">
                                <div className="chat-header-info">
                                    <div className="avatar avatar-md" style={{ background: 'var(--gradient-secondary)' }}>
                                        {activeChat.otherUser?.photo ? <img src={activeChat.otherUser.photo} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : activeChat.otherUser?.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <span className="chat-header-name">{activeChat.otherUser?.name}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                                            <p style={{ fontSize: 12, color: "var(--text-muted)", display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Briefcase size={12} /> {activeChat.jobTitle || "Genel Sohbet"}
                                            </p>
                                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}></div>
                                            <Link to={isCompany ? `/student/${activeChat.otherUser.id}` : `/jobs/${activeChat.jobId}`} style={{ fontSize: 11, color: 'var(--primary-light)', fontWeight: 800, textDecoration: 'none' }}>
                                                PROFİLİ GÖR
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                                <div className="chat-header-actions">
                                    <button className="btn-icon-styled"><Info size={20} /></button>
                                    <button className="btn-icon-styled" style={{ marginLeft: 8 }}><MoreVertical size={20} /></button>
                                </div>
                            </header>

                            <div className="chat-messages">
                                {messages.map((msg, i) => {
                                    const created = msg.createdAt?.toMillis ? new Date(msg.createdAt.toMillis()) : (msg.createdAt ? new Date(msg.createdAt) : new Date());
                                    const isSent = msg.senderId === currentUser.uid;
                                    return (
                                        <div key={msg.id} className={`message-bubble ${isSent ? "sent" : "received"}`}>
                                            <p>{msg.text}</p>
                                            <span className="msg-time">{!isNaN(created) ? created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <footer className="chat-input-area">
                                <form className="chat-input-wrapper" onSubmit={handleSendMessage}>
                                    <input type="text" placeholder="Komut iletin..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
                                    <button type="submit" className="btn-send-omega">
                                        <Send size={20} />
                                    </button>
                                </form>
                            </footer>
                        </>
                    ) : (
                        <div className="no-chat-omega">
                            <div className="omega-glow-circle">
                                <User size={48} color="var(--primary)" />
                            </div>
                            <h2 style={{ color: 'white', marginBottom: 8, fontWeight: 900 }}>Terminal Beklemede</h2>
                            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>İletişim kurmak için bir kanal seçin.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

