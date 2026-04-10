import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { MapPin, Briefcase, DollarSign, Clock, Search, Filter, Compass, PlusCircle } from "lucide-react";
import "./Jobs.css";

const SECTORS = ["Yazılım", "Finans", "Sağlık", "Tasarım", "Pazarlama", "Eğitim", "Mühendislik", "Diğer"];
const TYPES = ["remote", "hybrid", "onsite"];
const TYPE_LABELS = { remote: "Uzaktan", hybrid: "Hibrit", onsite: "Ofis" };

export default function Jobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedSectors, setSelectedSectors] = useState([]);
    const [selectedType, setSelectedType] = useState("all");
    const { userProfile } = useAuth();

    useEffect(() => {
        let unsubscribe = () => { };
        setLoading(true);

        try {
            const q = query(
                collection(db, "jobs"),
                where("status", "==", "active"),
                limit(100)
            );

            unsubscribe = onSnapshot(q, (snap) => {
                const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

                data.sort((a, b) => {
                    const getMs = (val) => {
                        if (!val) return 0;
                        if (val.toMillis) return val.toMillis();
                        const d = new Date(val).getTime();
                        return isNaN(d) ? 0 : d;
                    };
                    return getMs(b.createdAt) - getMs(a.createdAt);
                });

                setJobs(data);
                setLoading(false);
            }, (err) => {
                console.error("Gelişmiş senkronizasyon başarısız:", err);
                setJobs(DEMO_JOBS);
                setLoading(false);
            });
        } catch (err) {
            console.error("Kritik veri akışı hatası:", err);
            setLoading(false);
        }

        return () => unsubscribe();
    }, []);

    const toggleSector = (sector) => {
        setSelectedSectors(prev => 
            prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]
        );
    };

    const filtered = useMemo(() => {
        return jobs.filter((job) => {
            const matchSearch =
                !search ||
                job.title?.toLowerCase().includes(search.toLowerCase()) ||
                job.companyName?.toLowerCase().includes(search.toLowerCase()) ||
                job.location?.toLowerCase().includes(search.toLowerCase());
            
            const matchSector = selectedSectors.length === 0 || selectedSectors.includes(job.sector);
            const matchType = selectedType === "all" || job.type === selectedType;
            
            return matchSearch && matchSector && matchType;
        });
    }, [jobs, search, selectedSectors, selectedType]);

    return (
        <div className="page-wrapper jobs-omega-wrapper page-enter">
            {/* OMEGA HERO SECTION */}
            <div className="jobs-omega-hero">
                <div className="omega-hero-content">
                    <span className="omega-hero-badge"><Compass size={18} /> Keşfetmeye Başla</span>
                    <h1 className="omega-hero-title">
                        Gelecekteki Kariyerine <br/>
                        <span className="text-gradient">İlk Adımı At</span>
                    </h1>
                    <p className="omega-hero-subtitle">
                        Sektörünün en iyi şirketlerindeki staj fırsatlarını filtrele, hayalindeki pozisyonu anında bul. 
                        Şu an platformda <strong>{jobs.length} aktif ilan</strong> bulunuyor.
                    </p>
                    
                    {/* Advanced Floating Search Bar */}
                    <div className="omega-floating-search">
                        <div className="search-input-group">
                            <Search className="search-icon" size={24} color="var(--primary-light)" />
                            <input
                                type="text"
                                placeholder="Stajyer rolü, şirket veya şehir ara..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        {userProfile?.type === "company" && (
                            <Link to="/company/post-job" className="btn btn-primary omega-hero-btn">
                                <PlusCircle size={20} /> İlan Yayınla
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* OMEGA MAIN CONTAINER (Dual Pane) */}
            <div className="omega-container">
                
                {/* SIDEBAR FILTERS */}
                <aside className="omega-sidebar">
                    <div className="omega-filter-box glass">
                        <div className="filter-header">
                            <h3 className="filter-title"><Filter size={18}/> Dinamik Filtreler</h3>
                            {(selectedSectors.length > 0 || selectedType !== "all" || search) && (
                                <button className="clear-filters-btn" onClick={() => {
                                    setSelectedSectors([]);
                                    setSelectedType("all");
                                    setSearch("");
                                }}>Temizle</button>
                            )}
                        </div>

                        <div className="filter-section mt-24">
                            <h4>Çalışma Modeli</h4>
                            <div className="radio-group">
                                <label className={`radio-label ${selectedType === "all" ? "active" : ""}`}>
                                    <input type="radio" name="type" checked={selectedType === "all"} onChange={() => setSelectedType("all")} />
                                    <span>Tümü</span>
                                </label>
                                {TYPES.map(t => (
                                    <label key={t} className={`radio-label ${selectedType === t ? "active" : ""}`}>
                                        <input type="radio" name="type" checked={selectedType === t} onChange={() => setSelectedType(t)} />
                                        <span>{TYPE_LABELS[t]}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <hr className="filter-divider" />

                        <div className="filter-section">
                            <h4>Sektörler</h4>
                            <div className="checkbox-grid">
                                {SECTORS.map(s => (
                                    <label key={s} className={`checkbox-label ${selectedSectors.includes(s) ? 'active' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedSectors.includes(s)}
                                            onChange={() => toggleSector(s)} 
                                        />
                                        <span>{s}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* MAIN CONTENT FEED */}
                <main className="omega-feed">
                    <div className="feed-header">
                        <h2>{filtered.length} Fırsat Eşleşti</h2>
                        <div className="feed-sort text-muted">A-Z Senkronize Filtreleme</div>
                    </div>

                    {loading ? (
                        <div className="omega-grid">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="omega-card-skeleton glass">
                                    <div className="skeleton" style={{ width: 64, height: 64, borderRadius: 16 }} />
                                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, width: '100%' }}>
                                        <div className="skeleton" style={{ height: 24, width: "70%" }} />
                                        <div className="skeleton" style={{ height: 16, width: "40%" }} />
                                        <div className="skeleton" style={{ height: 16, width: "100%", marginTop: 16 }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="omega-empty-state glass">
                            <div className="empty-state-art">
                                <div className="orbit-1"></div>
                                <div className="orbit-2"></div>
                                <div className="planet"><Compass size={48} color="rgba(99, 102, 241, 0.4)" /></div>
                            </div>
                            <h3>Radarda Bir Şey Bulunamadı</h3>
                            <p>Kriterlerinize uygun bir ilan şu an sistemimizde bulunmuyor. Farklı filtreler deneyerek tekrar arama yapabilirsiniz.</p>
                            <button className="btn btn-secondary mt-16" onClick={() => {
                                setSelectedSectors([]);
                                setSelectedType("all");
                                setSearch("");
                            }}>Tüm Fırsatları Göster</button>
                        </div>
                    ) : (
                        <div className="omega-grid">
                            {filtered.map(job => (
                                <JobCard key={job.id} job={job} />
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

function JobCard({ job }) {
    const typeColors = { remote: "success", hybrid: "info", onsite: "warning" };
    const initials = (job.companyName || "?")
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const safeDate = (() => {
        const d = job.createdAt?.toMillis ? new Date(job.createdAt.toMillis()) : (job.createdAt ? new Date(job.createdAt) : null);
        return d && !isNaN(d.getTime()) ? d.toLocaleDateString("tr-TR") : "";
    })();

    return (
        <Link to={`/jobs/${job.id}`} className="omega-job-card glass">
            {/* Top Glow & Borders handled by CSS */}
            <div className={`omega-badge badge-${typeColors[job.type] || "muted"}`}>
                {job.type === "remote" ? "Uzaktan" : job.type === "hybrid" ? "Hibrit" : "Ofis"}
            </div>

            <div className="omega-card-info">
                <div className="omega-logo-box">
                    {job.companyLogo ? (
                        <img src={job.companyLogo} alt={job.companyName} />
                    ) : (
                        initials
                    )}
                </div>
                <div>
                    <h3 className="omega-job-title" title={job.title}>{job.title}</h3>
                    <p className="omega-job-company">{job.companyName}</p>
                </div>
            </div>

            <div className="omega-job-meta">
                <div className="meta-pill"><MapPin size={14} color="var(--primary)" /> <span>{job.location || "Türkiye"}</span></div>
                <div className="meta-pill"><Briefcase size={14} color="var(--warning)" /> <span>{job.sector || "Genel"}</span></div>
                {job.salary && <div className="meta-pill"><DollarSign size={14} color="var(--success)" /> <span>{job.salary}</span></div>}
                <div className="meta-pill"><Clock size={14} color="var(--text-muted)" /> <span>{safeDate || "Yeni"}</span></div>
            </div>

            <div className="omega-job-skills">
                {(job.skills || []).slice(0, 5).map((s) => (
                    <span key={s} className="skill-chip">{s}</span>
                ))}
                {(job.skills || []).length > 5 && (
                    <span className="skill-chip more">+{job.skills.length - 5}</span>
                )}
            </div>
        </Link>
    );
}

const DEMO_JOBS = [
    { id: "1", title: "Kıdemli React Özelliğinde Stajyer Geliştirici", companyName: "HyperCore Solutions", sector: "Yazılım", type: "remote", location: "İstanbul", skills: ["React", "JavaScript", "TypeScript"], salary: "Asgari Ücret", status: "active", createdAt: new Date().toISOString() },
    { id: "2", title: "Görsel Tasarım & Ürün Uzmanı Stajyeri (Creative)", companyName: "Nexus Designs Studio", sector: "Tasarım", type: "hybrid", location: "Ankara", skills: ["Figma", "Photoshop", "Illustration"], salary: "Stajyer Maaşı", status: "active", createdAt: new Date().toISOString() },
    { id: "3", title: "Performans Pazarlama Asistan Stajyeri", companyName: "GrowthHunters A.Ş.", sector: "Pazarlama", type: "onsite", location: "İzmir", skills: ["SEO", "Google Ads", "Analiz", "İçerik Stratejisi"], salary: "Pazarlık Payı Var", status: "active", createdAt: new Date().toISOString() },
    { id: "4", title: "Yapay Zeka Eğitim & Test Veri Geliştirici", companyName: "Omega Systems", sector: "Yazılım", type: "remote", location: "Global (Uzaktan)", skills: ["Python", "TensorFlow", "Veri Analizi"], salary: "", status: "active", createdAt: new Date().toISOString() }
];
