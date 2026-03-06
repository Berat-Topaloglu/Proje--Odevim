import React, { useState } from "react";
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Text, Surface, TextInput, Button, IconButton, Chip, HelperText } from "react-native-paper";
import { useRouter } from "expo-router";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../src/firebase/config";
import { useAuth } from "../../src/context/AuthContext";

const SKILLS = ["React", "JavaScript", "Python", "UI/UX", "Node.js", "Java", "SQL", "Mobile Dev"];

export default function PostJobScreen() {
    const { currentUser } = useAuth();
    const [form, setForm] = useState({
        title: "", sector: "Yazılım", type: "remote", location: "", duration: "", description: ""
    });
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleToggleSkill = (skill) => {
        if (selectedSkills.includes(skill)) {
            setSelectedSkills(selectedSkills.filter(s => s !== skill));
        } else {
            setSelectedSkills([...selectedSkills, skill]);
        }
    };

    const handleSubmit = async () => {
        if (!form.title || !form.description) return;
        setLoading(true);
        try {
            // Fetch company logo before posting
            const companySnap = await getDoc(doc(db, "companies", currentUser.uid));
            const companyData = companySnap.exists() ? companySnap.data() : null;

            await addDoc(collection(db, "jobs"), {
                ...form,
                companyId: currentUser.uid,
                companyName: currentUser.displayName,
                companyLogo: companyData?.logoUrl || "",
                skills: selectedSkills,
                status: "active",
                createdAt: new Date().toISOString()
            });
            router.replace("/(tabs)/applications");
        } catch (err) {
            console.error("Post job error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <IconButton icon="close" iconColor="white" onPress={() => router.back()} />
                <Text variant="titleLarge" style={styles.title}>Yeni İlan Ver</Text>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Surface style={styles.card} elevation={1}>
                        <TextInput
                            label="İlan Başlığı"
                            value={form.title}
                            onChangeText={t => setForm(f => ({ ...f, title: t }))}
                            mode="outlined"
                            style={styles.input}
                            placeholder="Örn: Frontend Geliştirici Stajyeri"
                        />

                        <View style={styles.row}>
                            <TextInput
                                label="Sektör"
                                value={form.sector}
                                onChangeText={t => setForm(f => ({ ...f, sector: t }))}
                                mode="outlined"
                                style={[styles.input, { flex: 1 }]}
                            />
                            <TextInput
                                label="Süre (Ay)"
                                value={form.duration}
                                onChangeText={t => setForm(f => ({ ...f, duration: t }))}
                                mode="outlined"
                                keyboardType="numeric"
                                style={[styles.input, { flex: 1, marginLeft: 10 }]}
                            />
                        </View>

                        <TextInput
                            label="Konum / Çalışma Tipi"
                            value={form.location}
                            onChangeText={t => setForm(f => ({ ...f, location: t }))}
                            mode="outlined"
                            style={styles.input}
                            placeholder="Örn: İstanbul veya Remote"
                        />

                        <TextInput
                            label="İş Açıklaması"
                            value={form.description}
                            onChangeText={t => setForm(f => ({ ...f, description: t }))}
                            mode="outlined"
                            multiline
                            numberOfLines={6}
                            style={styles.input}
                            placeholder="Aradığınız stajerde hangi özellikleri bekliyorsunuz?"
                        />

                        <Text variant="labelLarge" style={styles.label}>Aranan Yetenekler</Text>
                        <View style={styles.skillsContainer}>
                            {SKILLS.map(skill => (
                                <Chip
                                    key={skill}
                                    selected={selectedSkills.includes(skill)}
                                    onPress={() => handleToggleSkill(skill)}
                                    style={styles.chip}
                                    selectedColor="#6366f1"
                                >
                                    {skill}
                                </Chip>
                            ))}
                        </View>
                    </Surface>

                    <Button
                        mode="contained"
                        onPress={handleSubmit}
                        loading={loading}
                        disabled={loading || !form.title}
                        style={styles.submitBtn}
                        contentStyle={{ height: 50 }}
                    >
                        İlanı Yayınla
                    </Button>
                </ScrollView>
            </KeyboardAvoidingView>
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
        fontWeight: "800",
    },
    scrollContent: {
        padding: 20,
    },
    card: {
        padding: 20,
        borderRadius: 20,
        backgroundColor: "#16213e",
    },
    input: {
        marginBottom: 15,
        backgroundColor: "#0f0f1a",
    },
    row: {
        flexDirection: "row",
    },
    label: {
        color: "white",
        marginTop: 10,
        marginBottom: 10,
    },
    skillsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        backgroundColor: "#0f0f1a",
    },
    submitBtn: {
        marginTop: 30,
        borderRadius: 15,
        backgroundColor: "#6366f1",
        marginBottom: 50,
    },
});
