import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from "react-native";
import { TextInput, Button, Text, Surface, HelperText, IconButton } from "react-native-paper";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";

export default function RegisterScreen() {
    const [step, setStep] = useState(1);
    const [userType, setUserType] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const router = useRouter();

    const handleRegister = async () => {
        if (!displayName || !email || !password) {
            setError("Lütfen tüm alanları doldurun.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            await register(email, password, displayName, userType);
            router.replace("/(tabs)");
        } catch (err) {
            setError("Kayıt sırasında bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    if (step === 1) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={styles.title}>Nasıl Katılıyorsun?</Text>
                    <Text variant="bodyMedium" style={styles.subtitle}>Sana en uygun hesap türünü seç</Text>
                </View>

                <View style={styles.typeContainer}>
                    <TouchableOpacity
                        style={styles.typeCard}
                        onPress={() => { setUserType("student"); setStep(2); }}
                    >
                        <Surface style={styles.typeSurface} elevation={2}>
                            <Text style={styles.typeIcon}>🎓</Text>
                            <Text style={styles.typeTitle}>Öğrenci</Text>
                            <Text style={styles.typeDesc}>Staj ilanlarına göz at ve başvur</Text>
                        </Surface>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.typeCard}
                        onPress={() => { setUserType("company"); setStep(2); }}
                    >
                        <Surface style={styles.typeSurface} elevation={2}>
                            <Text style={styles.typeIcon}>🏢</Text>
                            <Text style={styles.typeTitle}>Şirket</Text>
                            <Text style={styles.typeDesc}>Stajer ilanı ver, aday bul</Text>
                        </Surface>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.backToLogin} onPress={() => router.back()}>
                    <Text style={styles.link}>Zaten hesabın var mı? Giriş Yap</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <IconButton
                    icon="arrow-left"
                    iconColor="white"
                    size={30}
                    onPress={() => setStep(1)}
                    style={styles.backButton}
                />

                <View style={styles.header}>
                    <Text variant="headlineMedium" style={styles.title}>
                        {userType === "student" ? "Öğrenci Kaydı" : "Şirket Kaydı"}
                    </Text>
                    <Text variant="bodyMedium" style={styles.subtitle}>Bilgilerini girerek devam et</Text>
                </View>

                <Surface style={styles.card} elevation={2}>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TextInput
                        label={userType === "student" ? "Ad Soyad" : "Şirket Adı"}
                        value={displayName}
                        onChangeText={setDisplayName}
                        mode="outlined"
                        style={styles.input}
                    />

                    <TextInput
                        label="E-posta"
                        value={email}
                        onChangeText={setEmail}
                        mode="outlined"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={styles.input}
                    />

                    <TextInput
                        label="Şifre"
                        value={password}
                        onChangeText={setPassword}
                        mode="outlined"
                        secureTextEntry
                        style={styles.input}
                    />

                    <Button
                        mode="contained"
                        onPress={handleRegister}
                        loading={loading}
                        disabled={loading}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                    >
                        Kayıt Ol
                    </Button>
                </Surface>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0f0f1a",
        padding: 20,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
    },
    backButton: {
        position: "absolute",
        top: 40,
        left: 0,
        zIndex: 1,
    },
    header: {
        alignItems: "center",
        marginTop: 60,
        marginBottom: 40,
    },
    title: {
        color: "white",
        fontWeight: "700",
        marginBottom: 8,
        textAlign: "center",
    },
    subtitle: {
        color: "#94a3b8",
        textAlign: "center",
    },
    typeContainer: {
        flexDirection: "row",
        gap: 15,
    },
    typeCard: {
        flex: 1,
    },
    typeSurface: {
        padding: 20,
        borderRadius: 20,
        backgroundColor: "#16213e",
        alignItems: "center",
        height: 180,
        justifyContent: "center",
    },
    typeIcon: {
        fontSize: 40,
        marginBottom: 10,
    },
    typeTitle: {
        color: "white",
        fontWeight: "700",
        fontSize: 18,
        marginBottom: 5,
    },
    typeDesc: {
        color: "#94a3b8",
        fontSize: 12,
        textAlign: "center",
    },
    card: {
        padding: 25,
        borderRadius: 20,
        backgroundColor: "#16213e",
    },
    input: {
        marginBottom: 15,
        backgroundColor: "transparent",
    },
    button: {
        marginTop: 10,
        borderRadius: 12,
    },
    buttonContent: {
        paddingVertical: 8,
    },
    errorText: {
        color: "#ef4444",
        marginBottom: 15,
        textAlign: "center",
    },
    backToLogin: {
        marginTop: 30,
        alignItems: "center",
    },
    link: {
        color: "#6366f1",
        fontWeight: "700",
    },
});
