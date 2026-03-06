import { useState, useEffect, useRef } from "react";
import { collection, query, where, limit, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { Send } from "lucide-react";
import "./Messages.css";

export default function Messages() {
    const { currentUser } = useAuth();
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    // Sohbetleri dinle
    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, "chats"),
            where("participants", "array-contains", currentUser.uid),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, async (snap) => {
            const chatData = await Promise.all(snap.docs.map(async d => {
                const data = d.data();
                // Find other participant ID
                const otherId = data.participants.find(id => id !== currentUser.uid);

                // Fetch latest profile from 'users' collection for dynamic data
                // This prevents stale photos/names
                let otherUser = { name: "Kullanıcı", photo: "" };
                try {
                    const uDoc = await getDoc(doc(db, "users", otherId));
                    if (uDoc.exists()) {
                        otherUser = {
                            name: uDoc.data().displayName,
                            photo: uDoc.data().photoURL || uDoc.data().logoUrl
                        };
                    }
                } catch (e) { console.error("User fetch error:", e); }

                return {
                    id: d.id,
                    ...data,
                    otherUser
                };
            }));

            // Memory sort by lastMessageAt
            chatData.sort((a, b) => {
                const timeA = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : (a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0);
                const timeB = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : (b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0);
                return timeB - timeA;
            });

            setChats(chatData);

            // Eğer aktif sohbet yoksa ve sohbetler varsa, ilkini otomatik seç
            if (!activeChat && chatData.length > 0) {
                setActiveChat(chatData[0]);
            }

            setLoading(false);
        }, (err) => {
            console.error("Sohbetler yüklenemedi:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Mesajları dinle
    useEffect(() => {
        if (!activeChat) return;

        const q = query(
            collection(db, `chats/${activeChat.id}/messages`),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const msgData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Memory sort by createdAt asc
            msgData.sort((a, b) => {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return timeA - timeB;
            });

            setMessages(msgData);
            setTimeout(scrollToBottom, 100);
        }, (err) => {
            console.error("Mesajlar yüklenemedi:", err);
        });

        return () => unsubscribe();
    }, [activeChat]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat) return;

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
                lastMessageAt: serverTimestamp(),
                unreadCount: (activeChat.unreadCount || 0) + 1 // Sadece basit bir artış
            });
        } catch (err) {
            console.error("Mesaj gönderilemedi:", err);
        }
    };

    if (loading) return <div className="page-wrapper"><div className="loader">Yükleniyor...</div></div>;

    return (
        <div className="messages-page page-wrapper">
            <div className="messages-container card">
                {/* Chat List */}
                <div className="chat-sidebar">
                    <div className="sidebar-header">
                        <h2>Mesajlar</h2>
                    </div>
                    <div className="chat-list">
                        {chats.length === 0 ? (
                            <div className="empty-sidebar-state">
                                <span>📭</span>
                                <p>Henüz mesajın yok</p>
                            </div>
                        ) : (
                            chats.map(chat => {
                                return (
                                    <div
                                        key={chat.id}
                                        className={`chat-item ${activeChat?.id === chat.id ? "active" : ""}`}
                                        onClick={() => setActiveChat(chat)}
                                    >
                                        <div className="avatar avatar-md chat-avatar">
                                            {chat.otherUser?.photo ? (
                                                <img src={chat.otherUser.photo} alt="avatar" />
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
                                            <p className="chat-last-msg">{chat.lastMessage}</p>
                                        </div>
                                    </div>
                                );
                            })
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
                                        <img src={activeChat.otherUser.photo} alt="avatar" />
                                    ) : (
                                        activeChat.otherUser?.name?.charAt(0) || "?"
                                    )}
                                </div>
                                <span className="chat-header-name">
                                    {activeChat.otherUser?.name}
                                </span>
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
