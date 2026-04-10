import { PaperProvider, MD3DarkTheme, Text } from "react-native-paper";
import { View, Image, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "../src/context/AuthContext";

function Content() {
    const { systemSettings, isAdmin, loading } = useAuth();

    if (loading) return null;

    if (systemSettings?.maintenance && !isAdmin) {
        return (
            <View style={styles.maintenanceContainer}>
                <View style={styles.maintenanceCard}>
                    <Image 
                        source={require("../assets/icon.png")} 
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text variant="headlineMedium" style={styles.brandName}>StajHub</Text>
                    <View style={styles.divider} />
                    <Text variant="titleMedium" style={styles.maintenanceTitle}>Sistem Bakımda</Text>
                    <Text variant="bodyMedium" style={styles.maintenanceText}>
                        Size daha iyi bir deneyim sunmak için kısa bir ara verdik. Çok yakında dümene geri döneceğiz!
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(student)" options={{ headerShown: false }} />
            <Stack.Screen name="(company)" options={{ headerShown: false }} />
            <Stack.Screen name="(messages)" options={{ headerShown: false }} />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <PaperProvider theme={MD3DarkTheme}>
                <Content />
            </PaperProvider>
        </AuthProvider>
    );
}

const styles = StyleSheet.create({
    maintenanceContainer: {
        flex: 1,
        backgroundColor: "#0f0f1a",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    maintenanceCard: {
        backgroundColor: "#16213e",
        padding: 40,
        borderRadius: 24,
        alignItems: "center",
        width: "100%",
        maxWidth: 400,
        borderWidth: 1,
        borderColor: "rgba(99, 102, 241, 0.2)",
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: 10,
    },
    brandName: {
        color: "white",
        fontWeight: "800",
        letterSpacing: 1,
    },
    divider: {
        height: 4,
        width: 40,
        backgroundColor: "#6366f1",
        borderRadius: 2,
        marginVertical: 20,
    },
    maintenanceTitle: {
        color: "#6366f1",
        fontWeight: "bold",
        marginBottom: 10,
    },
    maintenanceText: {
        color: "#94a3b8",
        textAlign: "center",
        lineHeight: 22,
    },
});
