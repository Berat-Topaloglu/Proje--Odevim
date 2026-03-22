import React, { useState } from "react";
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { TextInput, Button, Text, Surface, HelperText } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useAuth } from "../../src/context/AuthContext";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../src/firebase/config";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [userType, setUserType] = useState("student"); // New state for selection during login
    const { login, loginWithGoogle, completeGoogleRegistration } = useAuth();
    const router = useRouter();

    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: "550310950985-tkm13mfksfu0mgdqnudfa4lcbivimksf.apps.googleusercontent.com",
        iosClientId: "550310950985-ios-actual-id.apps.googleusercontent.com",
        androidClientId: "550310950985-android-actual-id.apps.googleusercontent.com",
    });

    React.useEffect(() => {
        if (response?.type === "success") {
            const { id_token } = response.params;
            handleGoogleLogin(id_token);
        }
    }, [response]);

    const handleGoogleLogin = async (idToken) => {
        setLoading(true);
        setError("");
        try {
            const userCredential = await loginWithGoogle(idToken);
            const user = userCredential.user;
            
            // Check if user has profile
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                // New user - Complete registration with the type SELECTED AT LOGIN
                await completeGoogleRegistration(user, userType);
                router.replace("/(tabs)");
            } else {
                router.replace("/(tabs)");
            }
        } catch (err) {
            setError("Google ile giriş yapılamadı: " + err.message);
        } finally {
            setLoading(false);
        }
    };

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
                <View style={styles.header}>
                    <Surface style={styles.logoContainer} elevation={4}>
                        <Image 
                            source={require("../../assets/stajhub-logo-removebg-preview.png")} 
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </Surface>
                    <Text variant="headlineMedium" style={styles.title}>
                        Staj<Text style={{ color: "#6366f1" }}>Hub</Text>
                    </Text>
                    <Text variant="bodyMedium" style={styles.subtitle}>Geleceğin burada başlıyor</Text>
                </View>

                <Surface style={styles.card} elevation={2}>
                    <Text variant="titleMedium" style={styles.selectionLabel}>Giriş Türü</Text>
                    <View style={styles.selectionContainer}>
                        <Button 
                            mode={userType === "student" ? "contained" : "outlined"}
                            onPress={() => setUserType("student")}
                            style={[styles.typeButton, userType === "student" && styles.activeType]}
                            icon="school"
                        >
                            Öğrenci
                        </Button>
                        <Button 
                            mode={userType === "company" ? "contained" : "outlined"}
                            onPress={() => setUserType("company")}
                            style={[styles.typeButton, userType === "company" && styles.activeType]}
                            icon="domain"
                        >
                            Şirket
                        </Button>
                    </View>

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

                    <Button
                        mode="outlined"
                        onPress={() => promptAsync()}
                        disabled={loading || !request}
                        style={[styles.button, styles.googleButton]}
                        contentStyle={styles.buttonContent}
                        icon="google"
                        textColor="#4285F4"
                    >
                        Google ile Giriş Yap
                    </Button>

                    <View style={styles.footer}>
                        <Text style={{ color: "white" }}>Hesabın yok mu? </Text>
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
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: "#16213e",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "rgba(99, 102, 241, 0.3)",
        overflow: "hidden",
    },
    logoImage: {
        width: 50,
        height: 50,
    },
    logoText: {
        color: "white",
        fontSize: 32,
        fontWeight: "800",
    },
    title: {
        color: "white",
        fontWeight: "900",
        marginBottom: 8,
        letterSpacing: -1,
    },
    subtitle: {
        color: "#94a3b8",
        fontSize: 16,
        fontWeight: "500",
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
    selectionLabel: {
        color: "white",
        marginBottom: 10,
        textAlign: "center",
        fontWeight: "600",
    },
    selectionContainer: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 20,
    },
    typeButton: {
        flex: 1,
        borderRadius: 12,
    },
    activeType: {
        backgroundColor: "#6366f1",
    },
    button: {
        marginTop: 10,
        borderRadius: 12,
    },
    buttonContent: {
        paddingVertical: 8,
    },
    googleButton: {
        backgroundColor: "white",
        borderColor: "#4285F4",
        borderWidth: 1,
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
