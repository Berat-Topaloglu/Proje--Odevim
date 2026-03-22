import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { Text, Surface, Avatar, Button, Card, IconButton } from "react-native-paper";
import { useAuth } from "../../src/context/AuthContext";
import { collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { db } from "../../src/firebase/config";
import { useRouter } from "expo-router";

export default function DashboardScreen() {
    const { currentUser, userProfile } = useAuth();
    const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, accepted: 0 });
    const [recentItems, setRecentItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    const isStudent = userProfile?.type === "student";

    useEffect(() => {
        let unsub;
        if (currentUser) {
            if (isStudent) {
                const q = query(
                    collection(db, "applications"),
                    where("studentId", "==", currentUser.uid),
                    limit(50)
                );
                unsub = onSnapshot(q, (snap) => {
                    const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    apps.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
                    setRecentItems(apps.slice(0, 5));
                    setStats({
                        total: apps.length,
                        pending: apps.filter(a => a.status === "pending").length,
                        accepted: apps.filter(a => a.status === "accepted").length
                    });
                    setLoading(false);
                });
            } else {
                const q = query(
                    collection(db, "jobs"),
                    where("companyId", "==", currentUser.uid),
                    limit(50)
                );
                unsub = onSnapshot(q, (snap) => {
                    const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    jobs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
                    setRecentItems(jobs.slice(0, 5));
                    setStats({
                        total: jobs.length,
                        active: jobs.filter(j => j.status === "active").length,
                        pending: 0
                    });
                    setLoading(false);
                });
            }
        } else if (!currentUser) {
            const q = query(
                collection(db, "jobs"),
                where("status", "==", "active"),
                limit(5)
            );
            unsub = onSnapshot(q, (snap) => {
                const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setRecentItems(jobs);
                setStats({ total: jobs.length, pending: 0, active: jobs.length });
                setLoading(false);
            });
        }

        return () => unsub?.();
    }, [currentUser, isStudent]);

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 500);
    };

    const initials = currentUser?.displayName?.charAt(0).toUpperCase() || "U";

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <View>
                    <Text variant="headlineSmall" style={styles.welcomeText}>
                        Merhaba, {currentUser?.displayName?.split(" ")[0] || "Stajyer Adayı"}!
                    </Text>
                    <Text variant="bodyMedium" style={styles.dateText}>
                        {currentUser ? "Bugün neler yapıyoruz?" : "Seni aramızda görmek harika!"}
                    </Text>
                </View>
                {currentUser ? (
                    <Avatar.Text size={48} label={initials} style={styles.avatar} />
                ) : (
                    <Avatar.Icon size={48} icon="account-circle-outline" style={styles.avatar} />
                )}
            </View>

            {currentUser ? (
                <View style={styles.statsContainer}>
                    <Surface style={styles.statCard} elevation={1}>
                        <Text style={styles.statValue}>{stats.total}</Text>
                        <Text style={styles.statLabel}>{isStudent ? "Başvuru" : "İlan"}</Text>
                    </Surface>
                    <Surface style={styles.statCard} elevation={1}>
                        <Text style={[styles.statValue, { color: "#fbbf24" }]}>{stats.pending}</Text>
                        <Text style={styles.statLabel}>Bekleyen</Text>
                    </Surface>
                    <Surface style={styles.statCard} elevation={1}>
                        <Text style={[styles.statValue, { color: "#10b981" }]}>{stats.active || stats.accepted || 0}</Text>
                        <Text style={styles.statLabel}>{isStudent ? "Kabul" : "Aktif"}</Text>
                    </Surface>
                </View>
            ) : (
                <Surface style={styles.guestPromoCard} elevation={2}>
                    <View style={styles.guestPromoContent}>
                        <Text style={styles.guestPromoTitle}>Fırsatları Yakalar mısın? 🔥</Text>
                        <Text style={styles.guestPromoText}>Binlerce staj ilanı seni bekliyor. Hemen katıl!</Text>
                    </View>
                    <Button 
                        mode="contained" 
                        onPress={() => router.push("/(auth)/login")}
                        style={styles.guestLoginBtn}
                    >
                        Giriş Yap
                    </Button>
                </Surface>
            )}

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                        {!currentUser ? "Öne Çıkan Fırsatlar" : (isStudent ? "Son Başvurularım" : "Son İlanlarım")}
                    </Text>
                    <Button mode="text" labelStyle={styles.seeAll} onPress={() => router.push("/jobs")}>Hepsini Gör</Button>
                </View>

                {recentItems.length === 0 ? (
                    <Surface style={styles.emptyCard}>
                        <IconButton icon="clipboard-text-outline" size={40} iconColor="#94a3b8" />
                        <Text style={styles.emptyText}>Henüz bir kayıt bulunmuyor.</Text>
                    </Surface>
                ) : (
                    recentItems.map((item) => (
                        <Card 
                            key={item.id} 
                            style={styles.itemCard}
                            onPress={() => router.push({ 
                                pathname: "/(student)/job-detail", 
                                params: { id: !currentUser || isStudent ? (item.jobId || item.id) : item.id } 
                            })}
                        >
                            <Card.Title
                                title={!currentUser ? item.title : (isStudent ? item.jobTitle : item.title)}
                                subtitle={!currentUser ? item.companyName : (isStudent ? item.companyName : (item.status === "active" ? "Aktif" : "Kapalı"))}
                                left={(props) => <Avatar.Icon {...props} icon={(!currentUser || !isStudent) ? "briefcase" : "file-send"} style={{ backgroundColor: "#6366f1" }} />}
                                right={(props) => (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{item.status}</Text>
                                    </View>
                                )}
                            />
                        </Card>
                    ))
                )}
            </View>

            {!currentUser ? (
                <Surface style={styles.promoCard} elevation={4}>
                    <View style={styles.promoTextContainer}>
                        <Text style={styles.promoTitle}>Senin Geleceğin</Text>
                        <Text style={styles.promoDesc}>Hayallerindeki stajı bulmak için profilini hemen oluştur.</Text>
                    </View>
                    <Button 
                        mode="contained" 
                        buttonColor="white" 
                        textColor="#6366f1" 
                        style={styles.promoButton}
                        onPress={() => router.push("/(auth)/register")}
                    >
                        Katıl
                    </Button>
                </Surface>
            ) : (
                <Surface style={styles.promoCard} elevation={4}>
                    <View style={styles.promoTextContainer}>
                        <Text style={styles.promoTitle}>Profilini Tamamla</Text>
                        <Text style={styles.promoDesc}>Daha fazla fırsat için bilgilerinizi güncelleyin.</Text>
                    </View>
                    <Button 
                        mode="contained" 
                        buttonColor="white" 
                        textColor="#6366f1" 
                        style={styles.promoButton}
                        onPress={() => router.push("/profile")}
                    >
                        Git
                    </Button>
                </Surface>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0f0f1a",
        padding: 20,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 20,
        marginBottom: 30,
    },
    welcomeText: {
        color: "white",
        fontWeight: "800",
    },
    dateText: {
        color: "#94a3b8",
    },
    avatar: {
        backgroundColor: "#6366f1",
    },
    statsContainer: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 30,
    },
    statCard: {
        flex: 1,
        padding: 15,
        borderRadius: 15,
        backgroundColor: "#16213e",
        alignItems: "center",
    },
    statValue: {
        fontSize: 24,
        fontWeight: "800",
        color: "white",
    },
    statLabel: {
        fontSize: 12,
        color: "#94a3b8",
        marginTop: 4,
    },
    guestPromoCard: {
        marginBottom: 30,
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        borderRadius: 20,
        padding: 20,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(99, 102, 241, 0.2)",
    },
    guestPromoContent: {
        flex: 1,
    },
    guestPromoTitle: {
        color: "white",
        fontSize: 16,
        fontWeight: "800",
    },
    guestPromoText: {
        color: "#94a3b8",
        fontSize: 12,
        marginTop: 4,
    },
    guestLoginBtn: {
        marginLeft: 15,
        borderRadius: 12,
        backgroundColor: "#6366f1",
    },
    section: {
        marginBottom: 30,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    sectionTitle: {
        color: "white",
        fontWeight: "700",
    },
    seeAll: {
        color: "#6366f1",
        fontSize: 13,
    },
    itemCard: {
        marginBottom: 12,
        backgroundColor: "#16213e",
    },
    emptyCard: {
        padding: 30,
        borderRadius: 15,
        backgroundColor: "#16213e",
        alignItems: "center",
    },
    emptyText: {
        color: "#94a3b8",
        marginTop: 10,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        backgroundColor: "rgba(99, 102, 241, 0.2)",
        marginRight: 15,
    },
    badgeText: {
        color: "#a5b4fc",
        fontSize: 10,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    promoCard: {
        padding: 20,
        borderRadius: 20,
        backgroundColor: "#6366f1",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 40,
    },
    promoTextContainer: {
        flex: 1,
    },
    promoTitle: {
        color: "white",
        fontSize: 18,
        fontWeight: "800",
    },
    promoDesc: {
        color: "rgba(255, 255, 255, 0.8)",
        fontSize: 12,
        marginTop: 4,
    },
    promoButton: {
        height: 40,
        marginLeft: 15,
    },
});
