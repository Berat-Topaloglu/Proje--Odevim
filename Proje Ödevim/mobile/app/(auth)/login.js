import React, { useState } from "react";
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { TextInput, Button, Text, Surface, HelperText } from "react-native-paper";
import { Link, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) {
            setError("Lütfen tüm alanları doldurun.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            await login(email, password);
            router.replace("/(tabs)");
        } catch (err) {
            setError("E-posta veya şifre hatalı.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View className="auth-header" style={styles.header}>
                    <Surface style={styles.logoContainer} elevation={4}>
                        <Text style={styles.logoText}>S</Text>
                    </Surface>
                    <Text variant="headlineMedium" style={styles.title}>StajHub'a Hoş Geldin</Text>
                    <Text variant="bodyMedium" style={styles.subtitle}>Devam etmek için giriş yap</Text>
                </View>

                <Surface style={styles.card} elevation={2}>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
                        onPress={handleLogin}
                        loading={loading}
                        disabled={loading}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                    >
                        Giriş Yap
                    </Button>

                    <View style={styles.footer}>
                        <Text>Hesabın yok mu? </Text>
                        <Link href="/(auth)/register" asChild>
                            <Text style={styles.link}>Kayıt Ol</Text>
                        </Link>
                    </View>
                </Surface>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0f0f1a",
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 20,
    },
    header: {
        alignItems: "center",
        marginBottom: 40,
    },
    logoContainer: {
        width: 60,
        height: 60,
        borderRadius: 15,
        backgroundColor: "#6366f1",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    logoText: {
        color: "white",
        fontSize: 32,
        fontWeight: "800",
    },
    title: {
        color: "white",
        fontWeight: "700",
        marginBottom: 8,
    },
    subtitle: {
        color: "#94a3b8",
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
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 20,
    },
    link: {
        color: "#6366f1",
        fontWeight: "700",
    },
});
