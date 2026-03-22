import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../src/context/AuthContext";

export default function TabLayout() {
    const { userProfile } = useAuth();
    const isStudent = userProfile?.type === "student";

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: "#6366f1",
                tabBarInactiveTintColor: "#94a3b8",
                tabBarHideOnKeyboard: true,
                tabBarStyle: {
                    backgroundColor: "#16213e",
                    borderTopColor: "#1e2a45",
                    paddingBottom: 5,
                    height: 60,
                },
                headerStyle: {
                    backgroundColor: "#0f0f1a",
                },
                headerTintColor: "white",
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Ana Sayfa",
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="jobs"
                options={{
                    title: "İlanlar",
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="briefcase-search" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="applications"
                options={{
                    title: isStudent ? "Başvurularım" : "İlanlarım",
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="send" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    title: "Mesajlar",
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="forum" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: userProfile ? "Profil" : "Giriş Yap",
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons 
                            name={userProfile ? "account" : "login"} 
                            color={color} 
                            size={size} 
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
