import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, RefreshControl, Alert } from "react-native";
import { Text, Surface, Card, Avatar, Badge, ActivityIndicator, IconButton, SegmentedButtons, Button } from "react-native-paper";
import { collection, query, where, getDocs, orderBy, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../src/firebase/config";
import { useAuth } from "../../src/context/AuthContext";
import { useRouter } from "expo-router";

export default function ApplicationsScreen() {
    const { currentUser, activeRole } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const router = useRouter();

    const isStudent = activeRole === "student";

    const fetchData = async () => {
        if (!currentUser) return;
        try {
            let q;
            if (isStudent) {
                q = query(
                    collection(db, "applications"),
                    where("studentId", "==", currentUser.uid),
                    orderBy("createdAt", "desc")
                );
            } else {
                q = query(
                    collection(db, "jobs"),
                    where("companyId", "==", currentUser.uid),
                    orderBy("createdAt", "desc")
                );
            }
            const snap = await getDocs(q);
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error("Fetch data error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentUser, isStudent]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const filteredItems = items.filter(item => {
        if (statusFilter === "all") return true;
        return item.status === statusFilter;
    });

    const handleDeleteJob = async (jobId) => {
        try {
            await deleteDoc(doc(db, "jobs", jobId));
            setItems(prev => prev.filter(i => i.id !== jobId));
        } catch (err) {
            console.error("Delete job error:", err);
        }
    };

    const confirmDeleteJob = (jobId, jobTitle) => {
        Alert.alert(
            "İlanı Sil",
            `"${jobTitle}" ilanını silmek istediğinize emin misiniz?`,
            [
                { text: "Vazgeç", style: "cancel" },
                { text: "Sil", style: "destructive", onPress: () => handleDeleteJob(jobId) }
            ]
        );
    };

    const formatDate = (value) => {
        if (!value) return "-";
        const date = value?.toDate ? value.toDate() : new Date(value);
        return Number.isNaN(date?.getTime?.()) ? "-" : date.toLocaleDateString("tr-TR");
    };

    const renderItem = ({ item }) => {
        if (isStudent) {
            return (
                <Card style={styles.card}>
                    <Card.Title
                        title={item.jobTitle}
                        subtitle={item.companyName}
                        left={(props) => <Avatar.Icon {...props} icon="file-document-outline" style={{ backgroundColor: "#6366f1" }} />}
                        right={(props) => (
                            <View style={styles.statusBadgeContainer}>
                                <Badge
                                    style={[styles.statusBadge, {
                                        backgroundColor:
                                            item.status === "pending" ? "#fbbf24" :
                                                item.status === "accepted" ? "#10b981" :
                                                    item.status === "rejected" ? "#ef4444" : "#6366f1"
                                    }]}
                                >
                                    {item.status.toUpperCase()}
                                </Badge>
                            </View>
                        )}
                    />
                    <Card.Content>
                        <Text variant="bodySmall" style={styles.dateText}>
                            Başvuru Tarihi: {formatDate(item.createdAt)}
                        </Text>
                    </Card.Content>
                </Card>
            );
        } else {
            return (
                <Card style={styles.card}>
                    <Card.Title
                        title={item.title}
                        subtitle={item.location + " · " + item.duration + " Ay"}
                        left={(props) => <Avatar.Icon {...props} icon="briefcase-outline" style={{ backgroundColor: "#10b981" }} />}
                        right={(props) => (
                            <IconButton
                                icon="delete-outline"
                                iconColor="#ef4444"
                                onPress={() => confirmDeleteJob(item.id, item.title)}
                            />
                        )}
                    />
                    <Card.Actions>
                        <Button
                            mode="contained-tonal"
                            onPress={() => router.push({ pathname: "/(company)/applicants", params: { jobId: item.id } })}
                            style={styles.actionButton}
                        >
                            Başvuranları Gör
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={() => { }} // Edit functionality
                            style={styles.actionButton}
                        >
                            Düzenle
                        </Button>
                    </Card.Actions>
                </Card>
            );
        }
    };

    return (
        <View style={styles.container}>
            <Surface style={styles.header} elevation={0}>
                <Text variant="headlineSmall" style={styles.title}>
                    {isStudent ? "Başvurularım" : "İlanlarım"}
                </Text>
                {isStudent && (
                    <SegmentedButtons
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                        buttons={[
                            { value: "all", label: "Hepsi" },
                            { value: "pending", label: "Bekliyor" },
                            { value: "accepted", label: "Kabul" },
                            { value: "rejected", label: "Red" },
                        ]}
                        style={styles.segmented}
                        theme={{ colors: { secondaryContainer: "#6366f1" } }}
                    />
                )}
            </Surface>

            {loading ? (
                <ActivityIndicator animating={true} color="#6366f1" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={filteredItems}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <IconButton icon="folder-open-outline" size={60} iconColor="#94a3b8" />
                            <Text style={styles.emptyText}>
                                {isStudent ? "Henüz bir başvurunuz bulunmuyor." : "Henüz bir ilan yayınlamadınız."}
                            </Text>
                            {!isStudent && (
                                <Button
                                    mode="contained"
                                    onPress={() => router.push("/(company)/post-job")}
                                    style={styles.emptyButton}
                                >
                                    Yeni İlan Oluştur
                                </Button>
                            )}
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0f0f1a",
    },
    header: {
        padding: 20,
        backgroundColor: "#0f0f1a",
        borderBottomWidth: 1,
        borderBottomColor: "#1e2a45",
    },
    title: {
        color: "white",
        fontWeight: "800",
        marginBottom: 15,
    },
    segmented: {
        marginBottom: 5,
    },
    listContent: {
        padding: 15,
        paddingBottom: 30,
    },
    card: {
        marginBottom: 15,
        backgroundColor: "#16213e",
        borderRadius: 15,
    },
    statusBadgeContainer: {
        marginRight: 15,
        justifyContent: "center",
    },
    statusBadge: {
        paddingHorizontal: 8,
        borderRadius: 5,
    },
    dateText: {
        color: "#94a3b8",
        marginTop: -5,
    },
    actionButton: {
        borderRadius: 10,
    },
    emptyContainer: {
        alignItems: "center",
        marginTop: 80,
        paddingHorizontal: 40,
    },
    emptyText: {
        color: "#94a3b8",
        textAlign: "center",
        marginBottom: 20,
    },
    emptyButton: {
        borderRadius: 12,
    },
});
