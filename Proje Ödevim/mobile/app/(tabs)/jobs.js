import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { Text, Searchbar, Card, Avatar, Chip, ActivityIndicator, Surface } from "react-native-paper";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../src/firebase/config";
import { useRouter } from "expo-router";

const SECTORS = ["Yazılım", "Tasarım", "Pazarlama", "Mühendislik", "Finans"];

export default function JobsScreen() {
    const [search, setSearch] = useState("");
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedSector, setSelectedSector] = useState(null);
    const router = useRouter();

    const fetchJobs = async () => {
        try {
            let q = query(
                collection(db, "jobs"),
                where("status", "==", "active"),
                orderBy("createdAt", "desc")
            );

            const snap = await getDocs(q);
            let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Fallback for demo if empty
            if (data.length === 0) {
                data = DEMO_JOBS;
            }

            setJobs(data);
        } catch (err) {
            console.error("Fetch jobs error:", err);
            setJobs(DEMO_JOBS);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchJobs();
    };

    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.title?.toLowerCase().includes(search.toLowerCase()) ||
            job.companyName?.toLowerCase().includes(search.toLowerCase());
        const matchesSector = !selectedSector || job.sector === selectedSector;
        return matchesSearch && matchesSector;
    });

    const renderJobItem = ({ item }) => (
        <Card
            style={styles.card}
            onPress={() => router.push({ pathname: "/(student)/job-detail", params: { id: item.id } })}
        >
            <Card.Content style={styles.cardContent}>
                {item.companyLogo ? (
                    <Avatar.Image size={45} source={{ uri: item.companyLogo }} style={styles.jobAvatar} />
                ) : (
                    <Avatar.Text size={45} label={item.companyName.charAt(0)} style={styles.jobAvatar} />
                )}
                <View style={styles.jobInfo}>
                    <Text variant="titleMedium" style={styles.jobTitle}>{item.title}</Text>
                    <Text variant="bodySmall" style={styles.jobCompany}>{item.companyName}</Text>
                    <View style={styles.badgeRow}>
                        <View style={styles.badgeSmall}>
                            <Text style={styles.badgeText}>{item.type === "remote" ? "🌐 Uzaktan" : "📍 " + (item.location || "Ofis")}</Text>
                        </View>
                        <View style={[styles.badgeSmall, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
                            <Text style={[styles.badgeText, { color: "#34d399" }]}>{item.sector}</Text>
                        </View>
                    </View>
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <View style={styles.container}>
            <Surface style={styles.searchContainer} elevation={0}>
                <Searchbar
                    placeholder="İlan veya şirket ara..."
                    onChangeText={setSearch}
                    value={search}
                    style={styles.searchbar}
                    inputStyle={styles.searchInput}
                    placeholderTextColor="#94a3b8"
                    iconColor="#6366f1"
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                    <Chip
                        selected={!selectedSector}
                        onPress={() => setSelectedSector(null)}
                        style={styles.chip}
                        selectedColor="#6366f1"
                    >
                        Tümü
                    </Chip>
                    {SECTORS.map(s => (
                        <Chip
                            key={s}
                            selected={selectedSector === s}
                            onPress={() => setSelectedSector(s)}
                            style={styles.chip}
                            selectedColor="#6366f1"
                        >
                            {s}
                        </Chip>
                    ))}
                </ScrollView>
            </Surface>

            {loading ? (
                <ActivityIndicator animating={true} color="#6366f1" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={filteredJobs}
                    renderItem={renderJobItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <IconButton icon="magnify-close" size={50} iconColor="#94a3b8" />
                            <Text style={styles.emptyText}>Aradığın kriterlere uygun ilan bulunamadı.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const DEMO_JOBS = [
    { id: "1", title: "Frontend Geliştirici Stajyeri", companyName: "TechCorp A.Ş.", sector: "Yazılım", type: "remote", location: "İstanbul" },
    { id: "2", title: "UI/UX Tasarım Stajyeri", companyName: "DesignHub", sector: "Tasarım", type: "hybrid", location: "Ankara" },
    { id: "3", title: "Pazarlama Stajyeri", companyName: "MarketPro", sector: "Pazarlama", type: "onsite", location: "İzmir" },
    { id: "4", title: "Backend Developer Stajyeri", companyName: "DataSoft", sector: "Yazılım", type: "remote", location: "Uzaktan" },
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0f0f1a",
    },
    searchContainer: {
        padding: 15,
        backgroundColor: "#0f0f1a",
        borderBottomWidth: 1,
        borderBottomColor: "#1e2a45",
    },
    searchbar: {
        backgroundColor: "#16213e",
        borderRadius: 12,
        elevation: 0,
        height: 50,
    },
    searchInput: {
        fontSize: 14,
        color: "white",
    },
    filterRow: {
        marginTop: 15,
        flexDirection: "row",
    },
    chip: {
        marginRight: 8,
        backgroundColor: "#16213e",
        borderColor: "#1e2a45",
    },
    listContent: {
        padding: 15,
        paddingBottom: 30,
    },
    card: {
        marginBottom: 15,
        backgroundColor: "#16213e",
        borderRadius: 15,
    },
    cardContent: {
        flexDirection: "row",
        alignItems: "center",
        padding: 5,
    },
    jobAvatar: {
        backgroundColor: "#6366f1",
    },
    jobInfo: {
        flex: 1,
        marginLeft: 15,
    },
    jobTitle: {
        color: "white",
        fontWeight: "700",
    },
    jobCompany: {
        color: "#94a3b8",
        marginBottom: 8,
    },
    badgeRow: {
        flexDirection: "row",
        gap: 8,
    },
    badgeSmall: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: "rgba(99, 102, 241, 0.1)",
    },
    badgeText: {
        color: "#a5b4fc",
        fontSize: 10,
        fontWeight: "600",
    },
    emptyContainer: {
        alignItems: "center",
        marginTop: 80,
    },
    emptyText: {
        color: "#94a3b8",
        textAlign: "center",
        paddingHorizontal: 40,
    },
});
