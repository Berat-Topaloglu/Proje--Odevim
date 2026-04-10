import { Stack } from "expo-router";
import { AuthProvider } from "../src/context/AuthContext";
import { PaperProvider, MD3DarkTheme } from "react-native-paper";

export default function RootLayout() {
    return (
        <AuthProvider>
            <PaperProvider theme={MD3DarkTheme}>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                </Stack>
            </PaperProvider>
        </AuthProvider>
    );
}
