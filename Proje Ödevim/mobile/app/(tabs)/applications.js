import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { Text, Surface, Card, Avatar, Badge, ActivityIndicator, IconButton, SegmentedButtons, Button, Divider } from "react-native-paper";
import { collection, query, where, getDocs, orderBy, doc, deleteDoc, writeBatch, limit } from "firebase/firestore";
import { Alert } from "react-native";
import { db } from "../../src/firebase/config";
import { useAuth } from "../../src/context/AuthContext";
import { useRouter } from "expo-router";

export default function ApplicationsScreen() {
    const { currentUser, userProfile } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const router = useRouter();

    const isStudent = userProfile?.type === "student";

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
                const snap = await getDocs(q);
                setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } else {
                // For companies, fetch applications related to their jobs
                // orderBy removed to avoid index requirement, sorting in memory
                q = query(
                    collection(db, "applications"),
                    where("companyId", "==", currentUser.uid),
                    limit(50) // Limit to avoid fetching too many documents
                );
                const snap = await getDocs(q);
                let apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                
                // Memory sort: createdAt desc
                apps.sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt.toDate()) : new Date(0); // Convert Firestore Timestamp to Date
                    const dateB = b.createdAt ? new Date(b.createdAt.toDate()) : new Date(0);
                    return dateB.getTime() - dateA.getTime();
                });

                setItems(apps);
            }
        } catch (err) {
            console.error("Fetch data error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentUser]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const filteredItems = items.filter(item => {
        if (statusFilter === "all") return true;
        return item.status === statusFilter;
    });

    const handleDeleteJob = async (jobId) => {
        Alert.alert(
            "Kritik Karar",
            "Bu ilanı silmek istediğinizden emin misiniz? Tüm başvurular da kalıcı olarak silinecektir.",
            [
                { text: "Vazgeç", style: "cancel" },
                { 
                    text: "Sil ve Yok Et", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            // 1. Find and delete all applications for this job
                            const q = query(collection(db, "applications"), where("jobId", "==", jobId));
                            const snap = await getDocs(q);
                            
                            const batch = writeBatch(db);
                            snap.docs.forEach(d => batch.delete(d.ref));
                            await batch.commit();

                            // 2. Delete the job document
                            await deleteDoc(doc(db, "jobs", jobId));
                            
                            setItems(items.filter(i => i.id !== jobId));
                            Alert.alert("Başarılı", "İlan ve bağlı tüm veriler imha edildi.");
                        } catch (err) {
                            console.error("Hard delete error:", err);
                            Alert.alert("Hata", "İlan silinirken bir sorun oluştu.");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }) => {
        if (isStudent) {
            return (
                <Card style={styles.card} onPress={() => router.push({ pathname: "/(student)/job-detail", params: { id: item.jobId } })}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardMainInfo}>
                            {item.companyLogo ? (
                                <Avatar.Image size={50} source={{ uri: item.companyLogo }} style={styles.avatar} />
                            ) : (
                                <Avatar.Text size={50} label={item.companyName?.charAt(0)} style={styles.avatar} />
                            )}
                            <View style={styles.titleInfo}>
                                <Text style={styles.jobText}>{item.jobTitle}</Text>
                                <Text style={styles.companyText}>{item.companyName}</Text>
                            </View>
                        </View>
                        <View style={styles.statusBadgeContainer}>
                            <Badge
                                style={[styles.statusBadge, {
                                    backgroundColor:
                                        item.status === "pending" ? "rgba(251, 191, 36, 0.1)" :
                                            item.status === "accepted" ? "rgba(16, 185, 129, 0.1)" :
                                                item.status === "rejected" ? "rgba(239, 68, 68, 0.1)" : "rgba(99, 102, 241, 0.1)"
                                }]}
                            >
                                <Text style={{
                                    fontSize: 10,
                                    fontWeight: "bold",
                                    color: item.status === "pending" ? "#fbbf24" :
                                            item.status === "accepted" ? "#10b981" :
                                                item.status === "rejected" ? "#ef4444" : "#6366f1"
                                }}>
                                    {item.status === "pending" ? "BEKLEMEDE" :
                                     item.status === "reviewing" ? "İNCELENİYOR" :
                                     item.status === "accepted" ? "KABUL" : "REDDEDİLDİ"}
                                </Text>
                            </Badge>
                        </View>
                    </View>
                    <Divider style={styles.cardDivider} />
                    <View style={styles.cardFooter}>
                        <Text variant="bodySmall" style={styles.dateText}>
                            📅 {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                        </Text>
                        <TouchableOpacity onPress={() => router.push({ pathname: "/(student)/job-detail", params: { id: item.jobId } })}>
                            <Text style={styles.viewLink}>İlanı Gör</Text>
                        </TouchableOpacity>
                    </View>
                </Card>
            );
        } else {
            return (
                <Card style={styles.card} mode="elevated">
                    <View style={styles.cardHeader}>
                        <View style={styles.cardMainInfo}>
                            <Avatar.Icon size={50} icon="briefcase" style={styles.avatarCompany} />
                            <View style={styles.titleInfo}>
                                <Text style={styles.jobText}>{item.title}</Text>
                                <Text style={styles.companyText}>{item.location} · {item.duration} Ay</Text>
                            </View>
                        </View>
                        <IconButton
                            icon="delete-sweep"
                            iconColor="#ef4444"
                            size={24}
                            onPress={() => handleDeleteJob(item.id)}
                        />
                    </View>
                    <View style={styles.actionRow}>
                        <TouchableOpacity 
                            style={styles.actionBtnPrimary}
                            onPress={() => router.push({ pathname: "/(company)/applicants", params: { jobId: item.id } })}
                        >
                            <Text style={styles.actionBtnText}>Başvuranları Gör</Text>
                        </TouchableOpacity>
                    </View>
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
            ) : !currentUser ? (
                <View style={styles.emptyContainer}>
                    <IconButton icon="account-lock-outline" size={60} iconColor="#94a3b8" />
                    <Text style={styles.emptyText}>
                        Başvurularını veya ilanlarını görmek için giriş yapmalısın.
                    </Text>
                    <Button
                        mode="contained"
                        onPress={() => router.push("/(auth)/login")}
                        style={styles.emptyButton}
                    >
                        Giriş Yap
                    </Button>
                </View>
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
        paddingBottom: 25,
    },
    title: {
        color: "white",
        fontWeight: "900",
        marginBottom: 15,
        fontSize: 28,
        letterSpacing: -0.5,
    },
    segmented: {
        marginBottom: 5,
        backgroundColor: "#16213e",
    },
    listContent: {
        padding: 15,
        paddingBottom: 40,
    },
    card: {
        marginBottom: 16,
        backgroundColor: "#16213e",
        borderRadius: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
    },
    cardMainInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    avatar: {
        backgroundColor: "#6366f1",
    },
    avatarCompany: {
        backgroundColor: "#10b981",
    },
    titleInfo: {
        marginLeft: 12,
        flex: 1,
    },
    jobText: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
    },
    companyText: {
        color: "#6366f1",
        fontSize: 13,
        fontWeight: "600",
        marginTop: 2,
    },
    statusBadgeContainer: {
        paddingLeft: 10,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        height: "auto",
        borderRadius: 8,
    },
    cardDivider: {
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        marginHorizontal: 16,
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        paddingTop: 12,
    },
    dateText: {
        color: "#94a3b8",
        fontSize: 12,
    },
    viewLink: {
        color: "#6366f1",
        fontWeight: "bold",
        fontSize: 13,
    },
    actionRow: {
        padding: 16,
        paddingTop: 0,
    },
    actionBtnPrimary: {
        backgroundColor: "rgba(99, 102, 241, 0.15)",
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(99, 102, 241, 0.3)",
    },
    actionBtnText: {
        color: "#a5b4fc",
        fontWeight: "700",
        fontSize: 14,
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
        fontSize: 15,
        lineHeight: 22,
    },
    emptyButton: {
        borderRadius: 12,
        backgroundColor: "#6366f1",
        paddingHorizontal: 20,
    },
});
