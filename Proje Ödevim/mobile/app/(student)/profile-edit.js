import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { Text, TextInput, Button, Surface, IconButton, ActivityIndicator, Chip } from "react-native-paper";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from 'expo-file-system';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../src/firebase/config";
import { useAuth } from "../../src/context/AuthContext";
import { uploadToCloudinary } from "../../src/utils/cloudinary"; // Required for photos
const SKILLS_LIST = ["JavaScript", "React", "Python", "Java", "Node.js", "CSS", "HTML", "SQL", "Git", "TypeScript", "UI/UX"];

export default function StudentProfileEdit() {
    const { currentUser, updateProfileData } = useAuth();
    const [profile, setProfile] = useState({
        university: "", department: "", gpa: "", bio: "", skills: [], cvUrl: ""
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingCV, setUploadingCV] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const snap = await getDoc(doc(db, "students", currentUser.uid));
                if (snap.exists()) setProfile(snap.data());
            } catch (err) {
                console.error("Fetch profile error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [currentUser]);

    const initials = currentUser?.displayName?.charAt(0).toUpperCase() || "U";
    const profileImage = profile.photoUrl || currentUser?.photoURL;

    const handleSave = async () => {
        setSaving(true);
        try {
            // Clean profile object (remove undefined values)
            const cleanProfile = Object.entries(profile).reduce((acc, [key, value]) => {
                if (value !== undefined) acc[key] = value;
                return acc;
            }, {});

            const updateData = {
                ...cleanProfile,
                updatedAt: new Date().toISOString()
            };

            await updateDoc(doc(db, "students", currentUser.uid), updateData);
            await updateProfileData(currentUser.displayName, profile.photoUrl, profile.phoneNumber || "");

            
            Alert.alert("Başarılı", "Profiliniz güncellendi.");
            router.back();
        } catch (err) {
            console.error("Save profile error:", err);
            Alert.alert("Hata", "Profil güncellenirken bir hata oluştu.");
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "image/*",
                copyToCacheDirectory: true,
            });

            if (!result.canceled) {
                setSaving(true);
                const file = result.assets[0];
                const url = await uploadToCloudinary(file.uri, file.name, file.mimeType);

                setProfile(p => ({ ...p, photoUrl: url }));
                // Instant sync noted
                await updateProfileData(currentUser.displayName, url, profile.phoneNumber || "");
                Alert.alert("Başarılı", "Profil fotoğrafınız güncellendi.");
            }
        } catch (err) {
            console.error("Photo Upload error:", err);
            Alert.alert("Hata", "Fotoğraf yüklenirken bir hata oluştu.");
        } finally {
            setSaving(false);
        }
    };

    const handleCVUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "application/pdf",
                copyToCacheDirectory: true,
            });

            if (!result.canceled) {
                setUploadingCV(true);
                const file = result.assets[0];
                
                // Construct Base64 explicitly to match Web exactly
                const base64Content = await FileSystem.readAsStringAsync(file.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                const base64Url = `data:${file.mimeType || 'application/pdf'};base64,${base64Content}`;

                setProfile(p => ({ ...p, cvUrl: base64Url }));
                await updateDoc(doc(db, "students", currentUser.uid), { cvUrl: base64Url });
                Alert.alert("Başarılı", "CV'niz başarıyla yüklendi.");
            }
        } catch (err) {
            console.error("CV Upload error:", err);
            Alert.alert("Hata", "Dosya yüklenirken bir hata oluştu.");
        } finally {
            setUploadingCV(false);
        }
    };

    const toggleSkill = (skill) => {
        setProfile(p => ({
            ...p,
            skills: p.skills.includes(skill)
                ? p.skills.filter(s => s !== skill)
                : [...p.skills, skill]
        }));
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" iconColor="white" onPress={() => router.back()} />
                <Text variant="titleLarge" style={styles.title}>Profili Düzenle</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Surface style={[styles.card, { alignItems: "center", marginBottom: 20 }]} elevation={1}>
                    {profileImage ? (
                        <Avatar.Image size={100} source={{ uri: profileImage }} />
                    ) : (
                        <Avatar.Text size={100} label={initials} />
                    )}
                    <Button 
                        mode="text" 
                        onPress={handlePhotoUpload}
                        textColor="#6366f1"
                        style={{ marginTop: 10 }}
                    >
                        Fotoğrafı Değiştir
                    </Button>
                </Surface>

                <Surface style={styles.card} elevation={1}>
                    <TextInput
                        label="Üniversite"
                        value={profile.university}
                        onChangeText={t => setProfile(p => ({ ...p, university: t }))}
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Bölüm"
                        value={profile.department}
                        onChangeText={t => setProfile(p => ({ ...p, department: t }))}
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="GPA / Not Ortalaması"
                        value={profile.gpa}
                        onChangeText={t => setProfile(p => ({ ...p, gpa: t }))}
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Hakkımda"
                        value={profile.bio}
                        onChangeText={t => setProfile(p => ({ ...p, bio: t }))}
                        mode="outlined"
                        multiline
                        numberOfLines={4}
                        style={styles.input}
                    />

                    <Text variant="labelLarge" style={styles.label}>Yetenekler</Text>
                    <View style={styles.skillsContainer}>
                        {SKILLS_LIST.map(skill => (
                            <Chip
                                key={skill}
                                selected={profile.skills.includes(skill)}
                                onPress={() => toggleSkill(skill)}
                                style={styles.chip}
                                selectedColor="#6366f1"
                            >
                                {skill}
                            </Chip>
                        ))}
                    </View>
                </Surface>

                <Surface style={[styles.card, { marginTop: 20 }]} elevation={1}>
                    <Text variant="labelLarge" style={styles.label}>Özgeçmiş (CV)</Text>
                    <View style={styles.cvRow}>
                        <View style={{ flex: 1 }}>
                            <Text variant="bodyMedium" style={{ color: "#94a3b8" }}>
                                {profile.cvUrl ? "✅ CV Yüklendi" : "❌ CV Henüz Yüklenmedi"}
                            </Text>
                        </View>
                        <Button
                            mode="contained-tonal"
                            onPress={handleCVUpload}
                            loading={uploadingCV}
                            disabled={uploadingCV}
                        >
                            {profile.cvUrl ? "Güncelle" : "Dosya Seç"}
                        </Button>
                    </View>
                </Surface>

                <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={saving}
                    disabled={saving}
                    style={styles.saveBtn}
                    contentStyle={{ height: 50 }}
                >
                    Değişiklikleri Kaydet
                </Button>
            </ScrollView>
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
    label: {
        color: "white",
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
    cvRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5,
    },
    saveBtn: {
        marginTop: 30,
        borderRadius: 15,
        backgroundColor: "#6366f1",
        marginBottom: 50,
    },
});
