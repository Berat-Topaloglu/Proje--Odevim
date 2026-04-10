import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { collection, query, where, limit, onSnapshot, addDoc, serverTimestamp, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { Send } from "lucide-react";
import { containsForbiddenContent } from "../../utils/wordFilter";
import "./Messages.css";

export default function Messages() {
    const { currentUser, userProfile } = useAuth();
    const { showNotification } = useNotification();
    const isCompany = userProfile?.type === "company";
    const [chats, setChats] = useState([]);
    const [jobs, setJobs] = useState([]); // company's job listings
    const [selectedJob, setSelectedJob] = useState("all"); // "all" or jobId
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    const { chatId: paramChatId } = useParams();

    // If company, load its job listings for tab filter
    useEffect(() => {
        if (!currentUser || !isCompany) return;
        const q = query(collection(db, "jobs"), where("companyId", "==", currentUser.uid), limit(30));
        const unsub = onSnapshot(q, (snap) => {
            setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [currentUser, isCompany]);

    // Load chats
    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, "chats"),
            where("participants", "array-contains", currentUser.uid),
            limit(50)
        );

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

                // For company: get jobTitle from application
                let jobTitle = data.jobTitle || "";
                let jobId = data.jobId || "";

                return { id: d.id, ...data, otherUser, jobTitle, jobId };
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

    // Sync activeChat with URL param and adjust filter
    useEffect(() => {
        if (chats.length === 0) return;

        if (paramChatId) {
            const found = chats.find(c => c.id === paramChatId);
            if (found) {
                setActiveChat(found);
                // Ensure the chat is visible in the sidebar if filtering
                if (isCompany && found.jobId && selectedJob !== "all" && selectedJob !== found.jobId) {
                    setSelectedJob(found.jobId);
                }
            }
        } else if (!activeChat && chats.length > 0) {
            setActiveChat(chats[0]);
        }
    }, [paramChatId, chats, isCompany]);

    // Load messages for active chat
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

    const FORBIDDEN_WORDS = ["küfür1", "küfür2", "0555", "0532", "0542", "gmail.com", "outlook.com", "numaram", "ara beni"];

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat) return;

        const { isForbidden } = containsForbiddenContent(newMessage);

        if (isForbidden) {
            showNotification(
                "Mesajınız yasaklı kelimeler veya iletişim bilgileri içeriyor. Lütfen kurallara uygun şekilde mesajlaşın.",
                "warning",
                "⚠️ Dikkat"
            );
            setNewMessage("");
            return;
        }

        const msgText = newMessage;
        setNewMessage("");

        try {
            await addDoc(collection(db, `chats/${activeChat.id}/messages`), {
                senderId: currentUser.uid,
                text: msgText,
                createdAt: serverTimestamp()
            });

            await updateDoc(doc(db, "chats", activeChat.id), {
                lastMessage: msgText,
                lastMessageAt: serverTimestamp()
            });
        } catch (err) {
            console.error("Mesaj gönderilemedi:", err);
        }
    };

    // Filter chats by selected job
    const filteredChats = selectedJob === "all"
        ? chats
        : chats.filter(c => c.jobId === selectedJob);

    if (loading) return <div className="page-wrapper"><div className="loader">Yükleniyor...</div></div>;

    return (
        <div className="messages-page page-wrapper">
            <div className="messages-container card">
                {/* Sidebar */}
                <div className="chat-sidebar">
                    <div className="sidebar-header">
                        <h2>💬 Mesajlar</h2>

                        {/* Job filter tabs - only for company */}
                        {isCompany && jobs.length > 0 && (
                            <div className="job-tabs">
                                <button
                                    className={`job-tab ${selectedJob === "all" ? "active" : ""}`}
                                    onClick={() => setSelectedJob("all")}
                                >
                                    Tümü
                                </button>
                                {jobs.map(j => (
                                    <button
                                        key={j.id}
                                        className={`job-tab ${selectedJob === j.id ? "active" : ""}`}
                                        onClick={() => setSelectedJob(j.id)}
                                        title={j.title}
                                    >
                                        {j.title.length > 16 ? j.title.slice(0, 15) + "…" : j.title}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="chat-list">
                        {filteredChats.length === 0 ? (
                            <div className="empty-sidebar-state">
                                <span>📭</span>
                                <p>Henüz mesajın yok</p>
                            </div>
                        ) : (
                            filteredChats.map(chat => (
                                <div
                                    key={chat.id}
                                    className={`chat-item ${activeChat?.id === chat.id ? "active" : ""}`}
                                    onClick={() => setActiveChat(chat)}
                                >
                                    <div className="avatar avatar-md chat-avatar">
                                        {chat.otherUser?.photo ? (
                                            <img src={chat.otherUser.photo} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                                        ) : (
                                            chat.otherUser?.name?.charAt(0) || "?"
                                        )}
                                    </div>
                                    <div className="chat-item-info">
                                        <div className="chat-item-top">
                                            <span className="chat-name">{chat.otherUser?.name || "Kullanıcı"}</span>
                                            <span className="chat-time">
                                                {chat.lastMessageAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        {/* Show job title if company mode */}
                                        {isCompany && chat.jobTitle && (
                                            <span className="chat-job-tag">📋 {chat.jobTitle}</span>
                                        )}
                                        <p className="chat-last-msg">{chat.lastMessage}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Window */}
                <div className="chat-window">
                    {activeChat ? (
                        <>
                            <div className="chat-header">
                                <div className="avatar avatar-sm">
                                    {activeChat.otherUser?.photo ? (
                                        <img src={activeChat.otherUser.photo} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                                    ) : (
                                        activeChat.otherUser?.name?.charAt(0) || "?"
                                    )}
                                </div>
                                <div style={{ marginLeft: 12 }}>
                                    <span className="chat-header-name">{activeChat.otherUser?.name}</span>
                                    {activeChat.jobTitle && (
                                        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>📋 {activeChat.jobTitle}</p>
                                    )}
                                </div>
                            </div>

                            <div className="chat-messages">
                                {messages.map(msg => (
                                    <div key={msg.id} className={`message-bubble ${msg.senderId === currentUser.uid ? "sent" : "received"}`}>
                                        <p>{msg.text}</p>
                                        <span className="msg-time">
                                            {msg.createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="chat-input" onSubmit={handleSendMessage}>
                                <input
                                    type="text"
                                    placeholder="Mesajınızı yazın..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <button type="submit" className="btn btn-primary btn-icon">
                                    <Send size={18} />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="no-chat-selected">
                            <div className="no-chat-icon">💬</div>
                            <p>Sohbet seçin veya yeni bir mesaj başlatın</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
