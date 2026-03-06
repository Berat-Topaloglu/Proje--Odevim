import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Text, List, Avatar, Divider, ActivityIndicator, Surface } from "react-native-paper";
import { useAuth } from "../../src/context/AuthContext";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { db } from "../../src/firebase/config";
import { useRouter } from "expo-router";

export default function MessagesScreen() {
    const { currentUser } = useAuth();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, "chats"),
            where("participants", "arrayContains", currentUser.uid),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const chatData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Memory sort
            chatData.sort((a, b) => (b.lastMessageAt?.toMillis?.() || 0) - (a.lastMessageAt?.toMillis?.() || 0));
            setChats(chatData);
            setLoading(false);
        }, (err) => {
            console.error("Chats onSnapshot error:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const renderChatItem = ({ item }) => {
        const otherParticipant = item.participantDetails?.find(p => p.id !== currentUser.uid);
        const initials = otherParticipant?.name?.charAt(0).toUpperCase() || "?";
        const lastMsgAt = item.lastMessageAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <TouchableOpacity onPress={() => router.push(`/(messages)/${item.id}`)}>
                <List.Item
                    title={otherParticipant?.name || "Kullanıcı"}
                    description={item.lastMessage || "Henüz mesaj yok"}
                    titleStyle={styles.chatTitle}
                    descriptionStyle={styles.chatDesc}
                    left={props => (
                        <Avatar.Text
                            {...props}
                            size={50}
                            label={initials}
                            style={styles.avatar}
                        />
                    )}
                    right={props => (
                        <Text style={styles.timeText}>{lastMsgAt}</Text>
                    )}
                    style={styles.listItem}
                />
                <Divider style={styles.divider} />
            </TouchableOpacity>
        );
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;

    return (
        <View style={styles.container}>
            <Surface style={styles.header} elevation={1}>
                <Text variant="headlineSmall" style={styles.headerTitle}>Mesajlar</Text>
            </Surface>

            <FlatList
                data={chats}
                renderItem={renderChatItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Henüz bir sohbetiniz bulunmuyor.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0f0f1a",
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: "#16213e",
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    headerTitle: {
        color: "white",
        fontWeight: "800",
    },
    listContent: {
        paddingTop: 10,
    },
    listItem: {
        paddingVertical: 10,
    },
    chatTitle: {
        color: "white",
        fontWeight: "700",
    },
    chatDesc: {
        color: "#94a3b8",
    },
    avatar: {
        backgroundColor: "#6366f1",
    },
    timeText: {
        color: "#64748b",
        fontSize: 12,
        alignSelf: "center",
        marginRight: 10,
    },
    divider: {
        backgroundColor: "#1e2a45",
        marginHorizontal: 20,
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: "center",
    },
    emptyText: {
        color: "#94a3b8",
    },
});
