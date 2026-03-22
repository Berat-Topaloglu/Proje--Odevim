import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Text, Surface, Avatar, Button, List, Divider, IconButton, ActivityIndicator } from "react-native-paper";
import { useAuth } from "../../src/context/AuthContext";
import { doc, getDoc, collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "../../src/firebase/config";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
    const { currentUser, userProfile, systemSettings, isAdmin, logout } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState([]);
    const router = useRouter();

    const isStudent = userProfile?.type === "student";

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
                fetchedReviews.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
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

    if (!currentUser) {
        return (
            <View style={styles.guestContainer}>
                <Surface style={styles.guestCard} elevation={2}>
                    <Avatar.Icon size={80} icon="account-key" style={styles.guestAvatar} />
                    <Text variant="headlineSmall" style={styles.guestTitle}>Profiline Eriş</Text>
                    <Text variant="bodyMedium" style={styles.guestText}>
                        Başvurularını takip etmek ve profilini özelleştirmek için giriş yapmalısın.
                    </Text>
                    <View style={styles.guestActions}>
                        <Button 
                            mode="contained" 
                            onPress={() => router.push("/(auth)/login")}
                            style={styles.guestButton}
                            contentStyle={{ height: 50 }}
                        >
                            Giriş Yap
                        </Button>
                        <Button 
                            mode="outlined" 
                            onPress={() => router.push("/(auth)/register")}
                            style={[styles.guestButton, { marginTop: 15, borderColor: "#6366f1" }]}
                            contentStyle={{ height: 50 }}
                            textColor="#6366f1"
                        >
                            Yeni Kayıt Oluştur
                        </Button>
                    </View>
                </Surface>
            </View>
        );
    }

    const initials = currentUser?.displayName?.charAt(0).toUpperCase() || "U";
    const profileImage = isStudent ? (profileData?.photoUrl || currentUser?.photoURL) : (profileData?.logoUrl || currentUser?.photoURL);
    return (
        <ScrollView style={styles.container}>
            <Surface style={styles.header} elevation={2}>
                <View style={styles.avatarContainer}>
                    {profileImage ? (
                        <Avatar.Image size={100} source={{ uri: profileImage }} />
                    ) : (
                        <Avatar.Text size={100} label={initials} />
                    )}
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{isStudent ? "ÖĞRENCİ" : "ŞİRKET"}</Text>
                    </View>
                </View>
                <Text variant="headlineSmall" style={styles.name}>{currentUser?.displayName || "İsimsiz Kullanıcı"}</Text>
                <Text variant="bodyMedium" style={styles.email}>{currentUser?.email}</Text>
                
                {isStudent && (
                    <View style={styles.secondaryInfo}>
                        <Text style={styles.secondaryText}>{profileData?.university || "Üniversite Belirtilmedi"}</Text>
                        <Text style={styles.secondaryText}>{profileData?.department || "Bölüm Belirtilmedi"}</Text>
                    </View>
                )}
            </Surface>

            <View style={styles.content}>
                <Text variant="titleMedium" style={styles.sectionTitle}>Hesap Ayarları</Text>
                <Surface style={styles.settingsCard} elevation={1}>
                    <List.Item
                        title="Profili Düzenle"
                        description={isStudent ? "Eğitim ve yetenek bilgilerini güncelle" : "Şirket bilgilerini ve logoyu güncelle"}
                        left={props => <List.Icon {...props} icon="account-edit" color="#6366f1" />}
                        right={props => <List.Icon {...props} icon="chevron-right" color="#94a3b8" />}
                        onPress={() => router.push(isStudent ? "/(student)/profile-edit" : "/(company)/profile-edit")}
                    />
                    <Divider style={styles.divider} />
                    <List.Item
                        title="Şifre Değiştir"
                        description="Hesap güvenliğini güncelle"
                        left={props => <List.Icon {...props} icon="lock-reset" color="#6366f1" />}
                        right={props => <List.Icon {...props} icon="chevron-right" color="#94a3b8" />}
                        onPress={() => router.push("/change-password")}
                    />
                    <Divider style={styles.divider} />
                    <List.Item
                        title="Bildirimler"
                        description="Bildirim ayarlarını yönet"
                        left={props => <List.Icon {...props} icon="bell" color="#6366f1" />}
                        right={props => <List.Icon {...props} icon="chevron-right" color="#94a3b8" />}
                        onPress={() => router.push("/notifications")}
                    />
                </Surface>

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
                                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                                    <Text style={{ color: "#64748b", fontSize: 10 }}>
                                        {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString("tr-TR") : (r.createdAt ? new Date(r.createdAt).toLocaleDateString("tr-TR") : "—")}
                                    </Text>
                                </View>
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
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f0f1a" },
    guestContainer: { flex: 1, backgroundColor: "#0f0f1a", justifyContent: "center", padding: 20 },
    guestCard: { padding: 30, borderRadius: 25, backgroundColor: "#16213e", alignItems: "center" },
    guestAvatar: { backgroundColor: "#6366f1", marginBottom: 20 },
    guestTitle: { color: "white", fontWeight: "800", marginBottom: 10 },
    guestText: { color: "#94a3b8", textAlign: "center", marginBottom: 30 },
    guestActions: { width: "100%" },
    guestButton: { borderRadius: 12 },
    header: { alignItems: "center", paddingVertical: 40, backgroundColor: "#16213e", borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    avatarContainer: { position: "relative", marginBottom: 15 },
    roleBadge: { position: "absolute", bottom: 0, right: -5, backgroundColor: "#6366f1", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 2, borderColor: "#16213e" },
    roleText: { color: "white", fontSize: 10, fontWeight: "800" },
    name: { color: "white", fontWeight: "800" },
    email: { color: "#94a3b8", marginTop: 4 },
    secondaryInfo: { marginTop: 15, alignItems: "center" },
    secondaryText: { color: "#6366f1", fontSize: 13, fontWeight: "600" },
    content: { padding: 25 },
    sectionTitle: { color: "white", fontWeight: "700", marginBottom: 15 },
    settingsCard: { borderRadius: 20, backgroundColor: "#16213e", overflow: "hidden" },
    divider: { backgroundColor: "rgba(255, 255, 255, 0.05)" },
    section: { marginTop: 10 },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
    card: { borderRadius: 15, backgroundColor: "#1e2a45" },
    logoutButton: { marginTop: 40, borderRadius: 12, borderColor: "#ef4444", borderWidth: 1.5 },
    version: { textAlign: "center", color: "#64748b", fontSize: 12, marginTop: 40, marginBottom: 20 }
});
