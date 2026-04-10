import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Modal } from "react-native";
import { Text, Surface, Button, IconButton, Avatar, List, TextInput, ActivityIndicator, Divider } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "../../src/firebase/config";
import { useAuth } from "../../src/context/AuthContext";

export default function JobDetailScreen() {
    const { id } = useLocalSearchParams();
    const { currentUser, activeRole } = useAuth();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [coverLetter, setCoverLetter] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    const jobId = Array.isArray(id) ? id[0] : id;

    useEffect(() => {
        const fetchJob = async () => {
            try {
                if (!jobId) return;
                const snap = await getDoc(doc(db, "jobs", jobId));
                if (snap.exists()) {
                    setJob({ id: snap.id, ...snap.data() });
                }
            } catch (err) {
                console.error("Fetch job error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchJob();
    }, [jobId]);

    const handleApply = async () => {
        if (!job || !currentUser) return;
        setSubmitting(true);
        try {
            await addDoc(collection(db, "applications"), {
                jobId: job.id,
                jobTitle: job.title,
                companyId: job.companyId,
                companyName: job.companyName,
                studentId: currentUser.uid,
                studentName: currentUser.displayName,
                email: currentUser.email,
                coverLetter: coverLetter,
                status: "pending",
                createdAt: serverTimestamp()
            });
            setModalVisible(false);
            router.back();
        } catch (err) {
            console.error("Apply error:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleStartChat = async () => {
        if (!currentUser || !job) {
            router.push("/(auth)/login");
            return;
        }

        try {
            const q = query(
                collection(db, "chats"),
                where("participants", "arrayContains", currentUser.uid)
            );
            const snap = await getDocs(q);
            let existingChat = snap.docs.find(d => d.data().participants.includes(job.companyId));

            if (existingChat) {
                router.push(`/(messages)/${existingChat.id}`);
            } else {
                const chatRef = await addDoc(collection(db, "chats"), {
                    participants: [currentUser.uid, job.companyId],
                    participantDetails: [
                        { id: currentUser.uid, name: currentUser.displayName },
                        { id: job.companyId, name: job.companyName }
                    ],
                    lastMessage: "Merhaba, ilanınızla ilgileniyorum.",
                    lastMessageAt: serverTimestamp(),
                    createdAt: serverTimestamp()
                });

                await addDoc(collection(db, `chats/${chatRef.id}/messages`), {
                    senderId: currentUser.uid,
                    text: "Merhaba, ilanınızla ilgileniyorum.",
                    createdAt: serverTimestamp()
                });

                // Şirkete anlık bildirim oluştur
                await addDoc(collection(db, `notifications/${job.companyId}/items`), {
                    type: "message",
                    message: `${currentUser.displayName || "Bir öğrenci"} ilanınızla ilgileniyor ve size mesaj gönderdi.`,
                    link: `/(messages)/${chatRef.id}`,
                    createdAt: serverTimestamp(),
                    read: false
                });

                router.push(`/(messages)/${chatRef.id}`);
            }
        } catch (err) {
            console.error("Sohbet başlatılamadı:", err);
        }
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;
    if (!job) return <View style={styles.container}><Text>İlan bulunamadı.</Text></View>;

    return (
        <View style={styles.container}>
            <ScrollView>
                <Surface style={styles.header} elevation={2}>
                    <IconButton
                        icon="arrow-left"
                        iconColor="white"
                        size={24}
                        onPress={() => router.back()}
                        style={styles.backButton}
                    />
                    {job.companyLogo ? (
                        <Avatar.Image size={70} source={{ uri: job.companyLogo }} style={styles.avatar} />
                    ) : (
                        <Avatar.Text size={70} label={job.companyName?.charAt(0)} style={styles.avatar} />
                    )}
                    <Text variant="headlineSmall" style={styles.title}>{job.title}</Text>
                    <Text variant="bodyLarge" style={styles.companyName}>{job.companyName}</Text>
                    <View style={styles.badgeRow}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{job.location}</Text>
                        </View>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{job.type?.toUpperCase()}</Text>
                        </View>
                    </View>
                </Surface>

                <View style={styles.content}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>İlan Detayları</Text>
                    <Surface style={styles.detailCard} elevation={1}>
                        <List.Item
                            title="Sektör"
                            description={job.sector}
                            left={props => <List.Icon {...props} icon="domain" color="#6366f1" />}
                        />
                        <Divider />
                        <List.Item
                            title="Süre"
                            description={job.duration + " Ay"}
                            left={props => <List.Icon {...props} icon="calendar-clock" color="#6366f1" />}
                        />
                    </Surface>

                    <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: 25 }]}>Açıklama</Text>
                    <Text variant="bodyMedium" style={styles.descriptionText}>
                        {job.description}
                    </Text>

                    {job.skills && job.skills.length > 0 && (
                        <>
                            <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: 25 }]}>Aranan Yetenekler</Text>
                            <View style={styles.skillsGrid}>
                                {job.skills.map((skill, index) => (
                                    <View key={index} style={styles.skillChip}>
                                        <Text style={styles.skillText}>{skill}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            {activeRole === "student" && (
                <Surface style={styles.footer} elevation={4}>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                        <Button
                            mode="outlined"
                            onPress={handleStartChat}
                            style={[styles.applyButton, { flex: 1, backgroundColor: "transparent" }]}
                            contentStyle={{ height: 50 }}
                            textColor="#6366f1"
                        >
                            Mesaj Gönder
                        </Button>
                        <Button
                            mode="contained"
                            onPress={() => setModalVisible(true)}
                            style={[styles.applyButton, { flex: 1.5 }]}
                            contentStyle={{ height: 50 }}
                        >
                            Hemen Başvur
                        </Button>
                    </View>
                </Surface>
            )}

            <Modal visible={modalVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <Surface style={styles.modalContent} elevation={5}>
                        <Text variant="headlineSmall" style={styles.modalTitle}>Başvuru Yap</Text>
                        <Text variant="bodyMedium" style={styles.modalSub}>
                            {job.companyName} firmasına gönderilecek ön yazınız:
                        </Text>
                        <TextInput
                            label="Ön Yazı (Opsiyonel)"
                            multiline
                            numberOfLines={6}
                            value={coverLetter}
                            onChangeText={setCoverLetter}
                            mode="outlined"
                            style={styles.modalInput}
                            placeholder="Neden bu staj için uygun olduğunuzdan bahsedin..."
                        />
                        <View style={styles.modalActions}>
                            <Button mode="text" onPress={() => setModalVisible(false)} style={{ flex: 1 }}>İptal</Button>
                            <Button
                                mode="contained"
                                onPress={handleApply}
                                loading={submitting}
                                style={{ flex: 1, marginLeft: 10 }}
                            >
                                Gönder
                            </Button>
                        </View>
                    </Surface>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f0f1a" },
    header: { alignItems: "center", paddingVertical: 50, backgroundColor: "#16213e", borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    backButton: { position: "absolute", top: 40, left: 10 },
    avatar: { backgroundColor: "#6366f1", marginBottom: 15 },
    title: { color: "white", fontWeight: "800", textAlign: "center", paddingHorizontal: 20 },
    companyName: { color: "#94a3b8", marginTop: 4 },
    badgeRow: { flexDirection: "row", gap: 10, marginTop: 15 },
    badge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.05)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)" },
    badgeText: { color: "#e2e8f0", fontSize: 12, fontWeight: "600" },
    content: { padding: 25 },
    sectionTitle: { color: "white", fontWeight: "700", marginBottom: 15 },
    detailCard: { borderRadius: 20, backgroundColor: "#16213e", overflow: "hidden" },
    descriptionText: { color: "#cbd5e1", lineHeight: 22 },
    skillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    skillChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: "rgba(99, 102, 241, 0.15)", borderWidth: 1, borderColor: "rgba(99, 102, 241, 0.3)" },
    skillText: { color: "#a5b4fc", fontSize: 12, fontWeight: "600" },
    footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: "#16213e", borderTopWidth: 1, borderTopColor: "rgba(255, 255, 255, 0.1)" },
    applyButton: { borderRadius: 15, backgroundColor: "#6366f1" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.7)", justifyContent: "center", padding: 20 },
    modalContent: { backgroundColor: "#16213e", padding: 25, borderRadius: 25 },
    modalTitle: { color: "white", fontWeight: "800", marginBottom: 10 },
    modalSub: { color: "#94a3b8", marginBottom: 20 },
    modalInput: { backgroundColor: "#0f0f1a", marginBottom: 20 },
    modalActions: { flexDirection: "row" },
});











