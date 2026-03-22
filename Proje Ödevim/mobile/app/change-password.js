import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { Text, TextInput, Button, Surface, IconButton } from "react-native-paper";
import { useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

export default function ChangePasswordScreen() {
    const { changePassword } = useAuth();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handlePasswordChange = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert("Hata", "Yeni şifreler eşleşmiyor.");
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert("Hata", "Şifre en az 6 karakter olmalıdır.");
            return;
        }

        setLoading(true);
        try {
            await changePassword(currentPassword, newPassword);
            Alert.alert("Başarılı", "Şifreniz başarıyla değiştirildi.");
            router.back();
        } catch (err) {
            console.error("Change password error:", err);
            let msg = "Şifre değiştirilirken bir hata oluştu.";
            if (err.code === "auth/wrong-password") msg = "Mevcut şifreniz hatalı.";
            Alert.alert("Hata", msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" iconColor="white" onPress={() => router.back()} />
                <Text variant="titleLarge" style={styles.title}>Şifre Değiştir</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Surface style={styles.card} elevation={1}>
                    <TextInput
                        label="Mevcut Şifre"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Yeni Şifre"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Yeni Şifre (Tekrar)"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        mode="outlined"
                        style={styles.input}
                    />

                    <Button
                        mode="contained"
                        onPress={handlePasswordChange}
                        loading={loading}
                        disabled={loading}
                        style={styles.btn}
                        contentStyle={{ height: 50 }}
                    >
                        Şifreyi Güncelle
                    </Button>
                </Surface>
                
                <Text style={styles.info}>
                    Güvenliğiniz için şifre değişikliği sonrası mevcut oturumunuz korunacaktır.
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f0f1a" },
    header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", backgroundColor: "#16213e" },
    title: { color: "white", fontWeight: "800" },
    scrollContent: { padding: 20 },
    card: { padding: 20, borderRadius: 20, backgroundColor: "#16213e" },
    input: { marginBottom: 15, backgroundColor: "#0f0f1a" },
    btn: { marginTop: 10, borderRadius: 12, backgroundColor: "#6366f1" },
    info: { color: "#94a3b8", textAlign: "center", marginTop: 20, fontSize: 12 }
});
