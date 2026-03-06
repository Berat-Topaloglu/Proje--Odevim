import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { Text, TextInput, IconButton, Avatar, Surface, ActivityIndicator } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "../../src/firebase/config";

export default function ChatDetailScreen() {
    const { id: chatId } = useLocalSearchParams();
    const { currentUser, isAdmin } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [chatInfo, setChatInfo] = useState(null);
    const flatListRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        if (!chatId || !currentUser) return;

        // Sohbet bilgilerini al
        const chatRef = doc(db, "chats", chatId);
        const unsubChat = onSnapshot(chatRef, (docSnap) => {
            if (docSnap.exists()) {
                setChatInfo(docSnap.data());
            }
        });

        // Mesajları dinle
        const q = query(
            collection(db, `chats/${chatId}/messages`),
            limit(100)
        );

        const unsubMsgs = onSnapshot(q, (snap) => {
            const msgData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Memory sort (A-Z - asc)
            msgData.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
            setMessages(msgData);
            setLoading(false);
        }, (err) => {
            console.error("Messages list error:", err);
            setLoading(false);
        });

        return () => {
            unsubChat();
            unsubMsgs();
        };
    }, [chatId, currentUser]);

    const handleSend = async () => {
        if (!newMessage.trim()) return;

        const msg = newMessage;
        setNewMessage("");

        try {
            await addDoc(collection(db, `chats/${chatId}/messages`), {
                senderId: currentUser.uid,
                text: msg,
                createdAt: serverTimestamp()
            });

            await updateDoc(doc(db, "chats", chatId), {
                lastMessage: msg,
                lastMessageAt: serverTimestamp()
            });
        } catch (err) {
            console.error("Mesaj gönderilemedi:", err);
        }
    };

    const otherParticipant = chatInfo?.participantDetails?.find(p => p.id !== currentUser.uid);
    const initials = otherParticipant?.name?.charAt(0).toUpperCase() || "?";

    const renderMessage = ({ item }) => {
        const isMe = item.senderId === currentUser.uid;
        return (
            <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
                <Surface style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]} elevation={1}>
                    <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                        {item.text}
                    </Text>
                    <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.otherTimeText]}>
                        {item.createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </Surface>
            </View>
        );
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
            <Surface style={styles.header} elevation={2}>
                <IconButton icon="arrow-left" iconColor="white" onPress={() => router.back()} />
                <Avatar.Text size={36} label={initials} style={styles.avatar} />
                <Text variant="titleMedium" style={styles.headerTitle}>{otherParticipant?.name || "Yükleniyor..."}</Text>
            </Surface>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <View style={styles.inputContainer}>
                <TextInput
                    placeholder="Mesajınızı yazın..."
                    value={newMessage}
                    onChangeText={setNewMessage}
                    mode="flat"
                    style={styles.input}
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    placeholderTextColor="#94a3b8"
                    textColor="white"
                />
                <IconButton
                    icon="send"
                    iconColor="white"
                    containerColor="#6366f1"
                    size={24}
                    onPress={handleSend}
                    disabled={!newMessage.trim()}
                />
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0f0f1a",
    },
    header: {
        paddingTop: 50,
        paddingBottom: 10,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#16213e",
    },
    headerTitle: {
        color: "white",
        fontWeight: "700",
        marginLeft: 10,
    },
    avatar: {
        backgroundColor: "#6366f1",
    },
    listContent: {
        padding: 15,
        paddingBottom: 20,
    },
    messageRow: {
        marginBottom: 10,
        flexDirection: "row",
    },
    myMessageRow: {
        justifyContent: "flex-end",
    },
    otherMessageRow: {
        justifyContent: "flex-start",
    },
    bubble: {
        padding: 12,
        borderRadius: 16,
        maxWidth: "80%",
        elevation: 2,
    },
    myBubble: {
        backgroundColor: "#4f46e5",
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        backgroundColor: "#334155",
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: "#475569",
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myMessageText: {
        color: "white",
    },
    otherMessageText: {
        color: "white",
    },
    timeText: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: "flex-end",
    },
    myTimeText: {
        color: "rgba(255, 255, 255, 0.7)",
    },
    otherTimeText: {
        color: "#94a3b8",
    },
    inputContainer: {
        flexDirection: "row",
        padding: 10,
        paddingBottom: Platform.OS === "ios" ? 30 : 10,
        backgroundColor: "#16213e",
        alignItems: "center",
    },
    input: {
        flex: 1,
        backgroundColor: "#0f0f1a",
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        height: 45,
        marginRight: 10,
    },
});
