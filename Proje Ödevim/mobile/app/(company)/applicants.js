import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { Text, Surface, Avatar, IconButton, Button, Card, Divider, ActivityIndicator } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../src/firebase/config";

export default function ApplicantsScreen() {
    const { jobId } = useLocalSearchParams();
    const resolvedJobId = Array.isArray(jobId) ? jobId[0] : jobId;
    const [job, setJob] = useState(null);
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!resolvedJobId) return;
                const jobSnap = await getDoc(doc(db, "jobs", resolvedJobId));
                if (jobSnap.exists()) {
                    setJob({ id: jobSnap.id, ...jobSnap.data() });
                }

                const q = query(collection(db, "applications"), where("jobId", "==", resolvedJobId));
                const snap = await getDocs(q);
                setApplicants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error("Fetch applicants error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [resolvedJobId]);

    const updateStatus = async (appId, newStatus) => {
        setUpdating(appId);
        try {
            await updateDoc(doc(db, "applications", appId), { status: newStatus });
            setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
        } catch (err) {
            console.error("Update status error:", err);
        } finally {
            setUpdating(null);
        }
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;

    const renderApplicant = ({ item }) => (
        <Card style={styles.card}>
            <Card.Content>
                <View style={styles.applicantHeader}>
                    <Avatar.Text size={45} label={item.studentName?.charAt(0)} style={styles.avatar} />
                    <View style={styles.applicantInfo}>
                        <Text variant="titleMedium" style={styles.name}>{item.studentName}</Text>
                        <Text variant="bodySmall" style={styles.email}>{item.email}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === "pending" ? "#fbbf24" : item.status === "accepted" ? "#10b981" : "#ef4444" }]}>
                        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                    </View>
                </View>

                <Divider style={styles.divider} />

                <Text variant="bodySmall" style={styles.coverLabel}>Ön Yazı:</Text>
                <Text variant="bodyMedium" style={styles.coverText}>{item.coverLetter || "Ön yazı girilmemiş."}</Text>

                <View style={styles.actions}>
                    <Button
                        mode="contained-tonal"
                        onPress={() => updateStatus(item.id, "accepted")}
                        disabled={updating === item.id || item.status === "accepted"}
                        style={styles.actionBtn}
                        buttonColor="#10b981"
                        textColor="white"
                    >
                        Kabul
                    </Button>
                    <Button
                        mode="contained-tonal"
                        onPress={() => updateStatus(item.id, "rejected")}
                        disabled={updating === item.id || item.status === "rejected"}
                        style={styles.actionBtn}
                        buttonColor="#ef4444"
                        textColor="white"
                    >
                        Red
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={() => { }} // Navigate to student profile
                        style={styles.actionBtn}
                    >
                        Profil
                    </Button>
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <IconButton
                    icon="arrow-left"
                    iconColor="white"
                    onPress={() => router.back()}
                />
                <View style={{ flex: 1 }}>
                    <Text variant="titleLarge" style={styles.title} numberOfLines={1}>
                        {job?.title}
                    </Text>
                    <Text variant="bodySmall" style={styles.subtitle}>Başvuran Adaylar</Text>
                </View>
            </View>

            <FlatList
                data={applicants}
                renderItem={renderApplicant}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Bu ilana henüz başvuru yapılmadı.</Text>
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
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#16213e",
    },
    title: {
        color: "white",
        fontWeight: "700",
    },
    subtitle: {
        color: "#94a3b8",
    },
    listContent: {
        padding: 15,
    },
    card: {
        marginBottom: 15,
        backgroundColor: "#16213e",
        borderRadius: 15,
    },
    applicantHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatar: {
        backgroundColor: "#6366f1",
    },
    applicantInfo: {
        flex: 1,
        marginLeft: 15,
    },
    name: {
        color: "white",
        fontWeight: "700",
    },
    email: {
        color: "#94a3b8",
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        color: "white",
        fontSize: 10,
        fontWeight: "800",
    },
    divider: {
        marginVertical: 12,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    coverLabel: {
        color: "#94a3b8",
        marginBottom: 4,
    },
    coverText: {
        color: "#cbd5e1",
        lineHeight: 20,
        marginBottom: 15,
    },
    actions: {
        flexDirection: "row",
        gap: 10,
    },
    actionBtn: {
        flex: 1,
        borderRadius: 8,
    },
    emptyContainer: {
        alignItems: "center",
        marginTop: 100,
    },
    emptyText: {
        color: "#94a3b8",
    },
});
