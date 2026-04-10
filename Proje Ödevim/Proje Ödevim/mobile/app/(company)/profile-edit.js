import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity } from "react-native";
import { Text, TextInput, Button, Surface, IconButton, ActivityIndicator, Avatar } from "react-native-paper";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../src/firebase/config";
import { useAuth } from "../../src/context/AuthContext";
import { uploadToCloudinary } from "../../src/utils/cloudinary";

export default function CompanyProfileEdit() {
    const { currentUser } = useAuth();
    const [profile, setProfile] = useState({
        companyName: "", sector: "", website: "", description: "", logoUrl: "",
        linkedin: "", twitter: "", instagram: "", facebook: "", youtube: ""
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const snap = await getDoc(doc(db, "companies", currentUser.uid));
                if (snap.exists()) setProfile(snap.data());
            } catch (err) {
                console.error("Fetch profile error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [currentUser]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Clean profile to remove undefined values
            const cleanProfile = Object.entries(profile).reduce((acc, [key, value]) => {
                if (value !== undefined) acc[key] = value;
                return acc;
            }, {});

            const updateData = {
                ...cleanProfile,
                companyName: cleanProfile.companyName || currentUser.displayName,
                updatedAt: new Date().toISOString()
            };

            await updateDoc(doc(db, "companies", currentUser.uid), updateData);
            
            // Sync companyName with user document displayName
            await updateDoc(doc(db, "users", currentUser.uid), { 
                displayName: updateData.companyName,
                updatedAt: new Date().toISOString()
            });
            
            // Sync with Firebase Auth currentUser
            if (updateData.companyName !== currentUser.displayName) {
                const { updateProfile } = require("firebase/auth");
                await updateProfile(currentUser, { displayName: updateData.companyName });
            }

            Alert.alert("Başarılı", "Şirket profili güncellendi.");
            router.back();
        } catch (err) {
            console.error("Save profile error:", err);
            Alert.alert("Hata", "Profil güncellenirken bir hata oluştu.");
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled) {
                setUploadingLogo(true);
                const asset = result.assets[0];
                const url = await uploadToCloudinary(asset.uri, "logo.jpg", "image/jpeg");

                setProfile(p => ({ ...p, logoUrl: url }));
                await updateDoc(doc(db, "companies", currentUser.uid), { logoUrl: url });
                Alert.alert("Başarılı", "Şirket logosu yüklendi.");
            }
        } catch (err) {
            console.error("Logo Upload error:", err);
            Alert.alert("Hata", "Logo yüklenirken bir hata oluştu.");
        } finally {
            setUploadingLogo(false);
        }
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;

    const initials = profile.companyName?.charAt(0).toUpperCase() || "C";

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" iconColor="white" onPress={() => router.back()} />
                <Text variant="titleLarge" style={styles.title}>Şirket Profilini Düzenle</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={handleLogoUpload} disabled={uploadingLogo}>
                        {profile.logoUrl ? (
                            <Image source={{ uri: profile.logoUrl }} style={styles.logoImage} />
                        ) : (
                            <Avatar.Text size={100} label={initials} style={styles.avatar} />
                        )}
                        <Surface style={styles.editIcon} elevation={4}>
                            <IconButton icon="camera" size={20} iconColor="white" />
                        </Surface>
                    </TouchableOpacity>
                    {uploadingLogo && <ActivityIndicator color="#6366f1" style={{ marginTop: 10 }} />}
                </View>

                <Surface style={styles.card} elevation={1}>
                    <TextInput
                        label="Şirket Adı"
                        value={profile.companyName}
                        onChangeText={t => setProfile(p => ({ ...p, companyName: t }))}
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Sektör"
                        value={profile.sector}
                        onChangeText={t => setProfile(p => ({ ...p, sector: t }))}
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Web Sitesi"
                        value={profile.website}
                        onChangeText={t => setProfile(p => ({ ...p, website: t }))}
                        mode="outlined"
                        style={styles.input}
                        placeholder="https://..."
                    />
                    <TextInput
                        label="Şirket Açıklaması"
                        value={profile.description}
                        onChangeText={t => setProfile(p => ({ ...p, description: t }))}
                        mode="outlined"
                        multiline
                        numberOfLines={6}
                        style={styles.input}
                    />
                    
                    <TextInput
                        label="LinkedIn URL"
                        value={profile.linkedin}
                        onChangeText={t => setProfile(p => ({ ...p, linkedin: t }))}
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Twitter / X URL"
                        value={profile.twitter}
                        onChangeText={t => setProfile(p => ({ ...p, twitter: t }))}
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Instagram URL"
                        value={profile.instagram}
                        onChangeText={t => setProfile(p => ({ ...p, instagram: t }))}
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Facebook URL"
                        value={profile.facebook}
                        onChangeText={t => setProfile(p => ({ ...p, facebook: t }))}
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="YouTube URL"
                        value={profile.youtube}
                        onChangeText={t => setProfile(p => ({ ...p, youtube: t }))}
                        mode="outlined"
                        style={styles.input}
                    />
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
    avatarSection: {
        alignItems: "center",
        marginBottom: 30,
    },
    avatar: {
        backgroundColor: "#6366f1",
    },
    logoImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#16213e",
    },
    editIcon: {
        position: "absolute",
        bottom: -5,
        right: -5,
        backgroundColor: "#6366f1",
        borderRadius: 20,
        width: 35,
        height: 35,
        justifyContent: "center",
        alignItems: "center",
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
    saveBtn: {
        marginTop: 30,
        borderRadius: 15,
        backgroundColor: "#6366f1",
        marginBottom: 50,
    },
});
