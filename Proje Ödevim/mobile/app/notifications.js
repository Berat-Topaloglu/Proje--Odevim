import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Text, Surface, IconButton, Avatar, ActivityIndicator, Divider } from "react-native-paper";
import { useAuth } from "../src/context/AuthContext";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../src/firebase/config";
import { useRouter } from "expo-router";

export default function NotificationsScreen() {
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, `notifications/${currentUser.uid}/items`),
            // orderBy removed to avoid index requirement
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // Memory sort: createdAt desc
            items.sort((a, b) => {
                const dateA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
                const dateB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
                return dateB - dateA;
            });

            setNotifications(items);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const markAsRead = async (id) => {
        try {
            await updateDoc(doc(db, `notifications/${currentUser.uid}/items`, id), { read: true });
        } catch (err) { console.error(err); }
    };

    const deleteNotif = async (id) => {
        try {
            await deleteDoc(doc(db, `notifications/${currentUser.uid}/items`, id));
        } catch (err) { console.error(err); }
    };

    const getIcon = (type) => {
        switch (type) {
            case "application": return "email-outline";
            case "message": return "chat";
            case "review": return "star";
            default: return "bell";
        }
    };

    const renderNotif = ({ item }) => (
        <TouchableOpacity
            onPress={() => markAsRead(item.id)}
            style={[styles.notifItem, item.read ? styles.read : styles.unread]}
        >
            <View style={styles.notifRow}>
                <Avatar.Icon size={40} icon={getIcon(item.type)} style={styles.icon} />
                <View style={styles.textContainer}>
                    <Text style={styles.message}>{item.message}</Text>
                    <Text style={styles.time}>
                        {item.createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                <IconButton icon="delete-outline" iconColor="#94a3b8" onPress={() => deleteNotif(item.id)} />
            </View>
        </TouchableOpacity>
    );

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;

    return (
        <View style={styles.container}>
            <Surface style={styles.header} elevation={4}>
                <IconButton icon="arrow-left" iconColor="white" onPress={() => router.back()} />
                <Text variant="headlineSmall" style={styles.headerTitle}>Bildirimler</Text>
            </Surface>

            <FlatList
                data={notifications}
                renderItem={renderNotif}
                keyExtractor={item => item.id}
                ItemSeparatorComponent={() => <Divider style={styles.divider} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <IconButton icon="bell-off-outline" size={60} iconColor="#1e2a45" />
                        <Text style={styles.emptyText}>Henüz bir bildirim yok.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f0f1a" },
    header: { paddingTop: 50, paddingBottom: 10, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", backgroundColor: "#16213e" },
    headerTitle: { color: "white", fontWeight: "800", marginLeft: 10 },
    notifItem: { padding: 15 },
    unread: { backgroundColor: "rgba(99, 102, 241, 0.05)", borderLeftWidth: 4, borderLeftColor: "#6366f1" },
    read: { opacity: 0.8 },
    notifRow: { flexDirection: "row", alignItems: "center" },
    icon: { backgroundColor: "#16213e" },
    textContainer: { flex: 1, marginLeft: 15 },
    message: { color: "white", fontSize: 14, fontWeight: "600" },
    time: { color: "#94a3b8", fontSize: 11, marginTop: 4 },
    divider: { backgroundColor: "#1e2a45" },
    empty: { marginTop: 100, alignItems: "center" },
    emptyText: { color: "#334155", marginTop: 10 },
});
