import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, Surface, Avatar, Button, List, Divider, IconButton, ActivityIndicator } from "react-native-paper";
import { useAuth } from "../../src/context/AuthContext";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../../src/firebase/config";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
    const { currentUser, userProfile, activeRole, logout } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState([]);
    const router = useRouter();

    const isStudent = activeRole === "student";

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser) return;
            try {
                const collectionName = isStudent ? "students" : "companies";
                const snap = await getDoc(doc(db, collectionName, currentUser.uid));
                if (snap.exists()) setProfileData(snap.data());

                const q = query(
                    collection(db, "reviews"),
                    where("toId", "==", currentUser.uid),
                    limit(50)
                );
                const reviewSnap = await getDocs(q);
                const fetchedReviews = reviewSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                // Memory sort
                const getMs = (value) => {
                    if (!value) return 0;
                    if (typeof value.toMillis === "function") return value.toMillis();
                    const date = new Date(value);
                    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
                };
                fetchedReviews.sort((a, b) => getMs(b.createdAt) - getMs(a.createdAt));
                setReviews(fetchedReviews);
            } catch (err) {
                console.error("Profile data fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentUser, isStudent]);

    const handleLogout = async () => {
        try {
            await logout();
            router.replace("/(auth)/login");
        } catch (err) {
            console.error("Logout error:", err);
        }
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;

    const initials = currentUser?.displayName?.charAt(0).toUpperCase() || "U";
    const profileImage = isStudent ? profileData?.photoUrl : profileData?.logoUrl;

    return (
        <ScrollView style={styles.container}>
            <Surface style={styles.header} elevation={2}>
                {profileImage ? (
                    <Avatar.Image size={80} source={{ uri: profileImage }} style={styles.avatar} />
                ) : (
                    <Avatar.Text size={80} label={initials} style={styles.avatar} />
                )}
                <Text variant="headlineSmall" style={styles.name}>{currentUser?.displayName}</Text>
                <Text variant="bodyMedium" style={styles.email}>{currentUser?.email}</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        {isStudent ? "ÖĞRENCİ" : "ŞİRKET"}
                    </Text>
                </View>
            </Surface>

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Hesap Bilgileri</Text>
                    <Button
                        mode="text"
                        onPress={() => router.push(isStudent ? "/(student)/profile-edit" : "/(company)/profile-edit")}
                        textColor="#6366f1"
                    >
                        Düzenle
                    </Button>
                </View>
                <Surface style={styles.card} elevation={1}>
                    <List.Item
                        title={isStudent ? "Üniversite" : "Sektör"}
                        description={isStudent ? (profileData?.university || "Belirtilmedi") : (profileData?.sector || "Belirtilmedi")}
                        left={props => <List.Icon {...props} icon={isStudent ? "school" : "domain"} color="#6366f1" />}
                    />
                    <Divider style={styles.divider} />
                    <List.Item
                        title={isStudent ? "Bölüm" : "Web Sitesi"}
                        description={isStudent ? (profileData?.department || "Belirtilmedi") : (profileData?.website || "Belirtilmedi")}
                        left={props => <List.Icon {...props} icon={isStudent ? "book-open-variant" : "web"} color="#6366f1" />}
                    />
                    {isStudent && (
                        <>
                            <Divider style={styles.divider} />
                            <List.Item
                                title="Sınıf / GPA"
                                description={profileData?.gpa || "Belirtilmedi"}
                                left={props => <List.Icon {...props} icon="star" color="#6366f1" />}
                            />
                        </>
                    )}
                </Surface>
            </View>

            <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>Ayarlar</Text>
                <Surface style={styles.card} elevation={1}>
                    <List.Item
                        title="Profili Düzenle"
                        left={props => <List.Icon {...props} icon="account-edit" color="#94a3b8" />}
                        right={props => <List.Icon {...props} icon="chevron-right" color="#94a3b8" />}
                        onPress={() => router.push(isStudent ? "/(student)/profile-edit" : "/(company)/profile-edit")}
                    />
                    <Divider style={styles.divider} />
                    <List.Item
                        title="Şifre Değiştir"
                        left={props => <List.Icon {...props} icon="lock" color="#94a3b8" />}
                        right={props => <List.Icon {...props} icon="chevron-right" color="#94a3b8" />}
                    />
                    <Divider style={styles.divider} />
                    <List.Item
                        title="Bildirimler"
                        left={props => <List.Icon {...props} icon="bell" color="#94a3b8" />}
                        right={props => <List.Icon {...props} icon="chevron-right" color="#94a3b8" />}
                        onPress={() => router.push("/notifications")}
                    />
                </Surface>
            </View>

            {/* Reviews Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>⭐ Değerlendirmeler</Text>
                    {reviews.length > 0 && (
                        <Text style={{ color: "#fbbf24", fontWeight: "700" }}>
                            ⭐️ {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)} / 5
                        </Text>
                    )}
                </View>
                {reviews.length === 0 ? (
                    <Surface style={[styles.card, { padding: 20, alignItems: "center" }]} elevation={1}>
                        <Text style={{ color: "#94a3b8" }}>Henüz değerlendirme yok.</Text>
                    </Surface>
                ) : (
                    reviews.map((r) => (
                        <Surface key={r.id} style={[styles.card, { padding: 15, marginBottom: 10 }]} elevation={1}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                <Text style={{ color: "#6366f1", fontWeight: "700", flex: 1 }}>{r.jobTitle}</Text>
                                <Text style={{ color: "#fbbf24" }}>{"⭐".repeat(r.rating)}</Text>
                            </View>
                            <Text style={{ color: "#e2e8f0", marginTop: 5, fontSize: 13 }}>{r.comment}</Text>
                            <Text style={{ color: "#64748b", fontSize: 10, marginTop: 8 }}>
                                {(() => {
                                    const date = r.createdAt?.toDate ? r.createdAt.toDate() : (r.createdAt ? new Date(r.createdAt) : null);
                                    return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("tr-TR") : "-";
                                })()}
                            </Text>
                        </Surface>
                    ))
                )}
            </View>

            <Button
                mode="outlined"
                onPress={handleLogout}
                style={styles.logoutButton}
                textColor="#ef4444"
                icon="logout"
            >
                Çıkış Yap
            </Button>

            <Text style={styles.version}>Versiyon 1.0.0</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0f0f1a",
    },
    header: {
        alignItems: "center",
        paddingVertical: 40,
        backgroundColor: "#16213e",
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    avatar: {
        backgroundColor: "#6366f1",
        marginBottom: 15,
    },
    name: {
        color: "white",
        fontWeight: "800",
    },
    email: {
        color: "#94a3b8",
        marginTop: 2,
    },
    badge: {
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: "rgba(99, 102, 241, 0.2)",
    },
    badgeText: {
        color: "#a5b4fc",
        fontSize: 12,
        fontWeight: "800",
    },
    section: {
        padding: 20,
        marginTop: 10,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    sectionTitle: {
        color: "white",
        fontWeight: "700",
        marginLeft: 5,
    },
    card: {
        borderRadius: 20,
        backgroundColor: "#16213e",
        overflow: "hidden",
    },
    divider: {
        backgroundColor: "#1e2a45",
    },
    logoutButton: {
        margin: 20,
        borderRadius: 12,
        borderColor: "#ef4444",
        borderWidth: 1.5,
    },
    version: {
        textAlign: "center",
        color: "#64748b",
        fontSize: 12,
        marginBottom: 40,
    },
});
