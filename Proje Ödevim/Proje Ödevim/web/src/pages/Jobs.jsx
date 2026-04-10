import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    limit,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { Search, RotateCcw, Briefcase } from "lucide-react";
import "./Jobs.css";

const SECTORS = ["Tüm Sektörler", "Yazılım", "Finans", "Sağlık", "Tasarım", "Pazarlama", "Eğitim", "Mühendislik", "Hukuk", "Muhasebe", "Lojistik", "Diğer"];
const TYPES = ["Tüm Türler", "remote", "hybrid", "onsite"];
const EXPERIENCE_LEVELS = ["Tüm Seviyeler", "Stajyer", "Yeni Mezun (0-2 Yıl)", "Deneyimli (3-5 Yıl)", "Uzman (5+ Yıl)"];
const EMPLOYMENT_TYPES = ["Tüm Şekiller", "Stajyer", "Tam Zamanlı", "Yarı Zamanlı", "Proje Bazlı"];
const EDUCATION_LEVELS = ["Tüm Eğitimler", "Lise", "Ön Lisans", "Lisans Devam", "Lisans Mezun", "Yüksek Lisans"];
const TYPE_LABELS = { remote: "Uzaktan", hybrid: "Hibrit", onsite: "Ofis" };

export default function Jobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sector, setSector] = useState("Tüm Sektörler");
    const [type, setType] = useState("Tüm Türler");
    const [expLevel, setExpLevel] = useState("Tüm Seviyeler");
    const [empType, setEmpType] = useState("Tüm Şekiller");
    const [eduLevel, setEduLevel] = useState("Tüm Eğitimler");
    const { userProfile } = useAuth();

    useEffect(() => {
        let unsubscribe = () => { };
        setLoading(true);

        try {
            const q = query(
                collection(db, "jobs"),
                limit(100)
            );

            unsubscribe = onSnapshot(q, (snap) => {
                const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

                // Sort in memory
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
                console.error("İlanlar dinlenemedi:", err);
                setJobs(DEMO_JOBS);
                setLoading(false);
            });
        } catch (err) {
            console.error("İlanlar başlatılamadı:", err);
            setLoading(false);
        }

        return () => unsubscribe();
    }, []);

    const filtered = jobs.filter((job) => {
        const matchSearch =
            !search ||
            job.title?.toLowerCase().includes(search.toLowerCase()) ||
            job.companyName?.toLowerCase().includes(search.toLowerCase()) ||
            job.location?.toLowerCase().includes(search.toLowerCase());
        const matchSector = sector === "Tüm Sektörler" || job.sector === sector;
        const matchType = type === "Tüm Türler" || job.type === type;
        const matchExp = expLevel === "Tüm Seviyeler" || job.experienceLevel === expLevel;
        const matchEmp = empType === "Tüm Şekiller" || job.employmentType === empType;
        const matchEdu = eduLevel === "Tüm Eğitimler" || job.minEducation === eduLevel;
        const isNotDeleted = job.status !== "deleted";
        return matchSearch && matchSector && matchType && matchExp && matchEmp && matchEdu && isNotDeleted;
    });

    return (
        <div className="page-wrapper">
            <div className="content-wrapper page-enter">
                {/* Header */}
                <div className="jobs-header">
                    <div>
                        <h1 className="jobs-title">Staj İlanları</h1>
                        <p className="jobs-subtitle">
                            {filtered.length} ilan bulundu
                        </p>
                    </div>
                    {userProfile?.type === "company" && (
                        <Link to="/company/post-job" className="btn btn-primary">
                            ➕ İlan Ver
                        </Link>
                    )}
                </div>

                {/* Filters */}
                <div className="jobs-filters card">
                    <input
                        className="search-input form-input"
                        placeholder="🔍  İlan, şirket veya konum ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className="filter-row">
                        <select
                            className="form-select"
                            value={sector}
                            onChange={(e) => setSector(e.target.value)}
                        >
                            {SECTORS.map((s) => <option key={s}>{s}</option>)}
                        </select>
                        <select
                            className="form-select"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            {TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {TYPE_LABELS[t] || t}
                                </option>
                            ))}
                        </select>
                        <select
                            className="form-select"
                            value={expLevel}
                            onChange={(e) => setExpLevel(e.target.value)}
                        >
                            {EXPERIENCE_LEVELS.map((e) => <option key={e}>{e}</option>)}
                        </select>
                        <select
                            className="form-select"
                            value={empType}
                            onChange={(e) => setEmpType(e.target.value)}
                        >
                            {EMPLOYMENT_TYPES.map((e) => <option key={e}>{e}</option>)}
                        </select>
                        <select
                            className="form-select"
                            value={eduLevel}
                            onChange={(e) => setEduLevel(e.target.value)}
                        >
                            {EDUCATION_LEVELS.map((e) => <option key={e}>{e}</option>)}
                        </select>
                    </div>
                </div>

                {/* Job List */}
                {loading ? (
                    <div className="jobs-loading">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="job-card-skeleton">
                                <div className="skeleton" style={{ width: 52, height: 52, borderRadius: 12 }} />
                                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                                    <div className="skeleton" style={{ height: 18, width: "60%" }} />
                                    <div className="skeleton" style={{ height: 14, width: "40%" }} />
                                    <div className="skeleton" style={{ height: 12, width: "80%" }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="jobs-empty-simple">
                        <div className="simple-icon-box"><Briefcase size={32} /></div>
                        <p>Henüz yayınlanmış bir ilan bulunmuyor.</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="jobs-empty">
                        <div className="empty-icon-wrapper">
                            <div className="empty-glow" />
                            <Search size={48} />
                        </div>
                        <h3 className="empty-title">Maceraya Başlamaya Hazır Mısın?</h3>
                        <p className="empty-description">
                            Görünüşe göre aradığın kriterlerde aktif bir ilan henüz yok. <br/>
                            Farklı anahtar kelimeler kullanarak şansını tekrar deneyebilirsin!
                        </p>
                        <button className="btn-glass-action" onClick={() => {
                            setSearch("");
                            setSector("Tüm Sektörler");
                            setType("Tüm Türler");
                            setExpLevel("Tüm Seviyeler");
                            setEmpType("Tüm Şekiller");
                            setEduLevel("Tüm Eğitimler");
                        }}>
                             <RotateCcw size={16} /> <span>Filtreleri Temizle</span>
                        </button>
                    </div>
                ) : (
                    <div className="jobs-list">
                        {filtered.map((job) => (
                            <JobCard key={job.id} job={job} />
                        ))}
                    </div>
                )}
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
        <Link to={`/jobs/${job.id}`} className="job-card card">
            <div className="job-card-logo avatar avatar-lg">
                {job.companyLogo ? (
                    <img src={job.companyLogo} alt={job.companyName} />
                ) : (
                    initials
                )}
            </div>

            <div className="job-card-info">
                <div className="job-card-top">
                    <h3 className="job-title">{job.title}</h3>
                    <span className={`badge badge-${typeColors[job.type] || "muted"}`}>
                        {job.type === "remote" ? "Uzaktan" : job.type === "hybrid" ? "Hibrit" : "Ofis"}
                    </span>
                </div>
                <p className="job-company">{job.companyName}</p>
                <div className="job-card-meta-line">
                    <span className="job-meta-item">📍 {job.location || "Belirtilmedi"}</span>
                    {job.sector && <span className="job-meta-item">🏷️ {job.sector}</span>}
                    {job.department && <span className="job-meta-item">🛡️ {job.department}</span>}
                    {job.experienceLevel && <span className="job-meta-item">⚡ {job.experienceLevel}</span>}
                    {job.salary && <span className="job-meta-item" style={{ color: 'var(--success-light)' }}>💰 {job.salary}</span>}
                </div>
                <div className="job-skills">
                    {(job.skills || []).slice(0, 4).map((s) => (
                        <span key={s} className="badge badge-primary">{s}</span>
                    ))}
                    {(job.skills || []).length > 4 && (
                        <span className="badge badge-muted">+{job.skills.length - 4}</span>
                    )}
                </div>
            </div>

            <div className="job-card-right">
                <span className="job-date">
                    {safeDate}
                </span>
            </div>
        </Link>
    );
}

// Demo verisi - Firebase yapılandırılmadan önce gösterilir
const DEMO_JOBS = [
    { id: "1", title: "Frontend Geliştirici Stajyeri", companyName: "TechCorp A.Ş.", sector: "Yazılım", type: "remote", location: "İstanbul", skills: ["React", "JavaScript", "CSS"], salary: "", status: "active", createdAt: new Date().toISOString() },
    { id: "2", title: "UI/UX Tasarım Stajyeri", companyName: "DesignHub", sector: "Tasarım", type: "hybrid", location: "Ankara", skills: ["Figma", "Photoshop"], salary: "3500₺/ay", status: "active", createdAt: new Date().toISOString() },
    { id: "3", title: "Pazarlama Stajyeri", companyName: "MarketPro", sector: "Pazarlama", type: "onsite", location: "İzmir", skills: ["SEO", "İçerik", "Analiz"], salary: "", status: "active", createdAt: new Date().toISOString() },
    { id: "4", title: "Backend Developer Stajyeri", companyName: "DataSoft", sector: "Yazılım", type: "remote", location: "Uzaktan", skills: ["Node.js", "MongoDB", "Python"], salary: "4000₺/ay", status: "active", createdAt: new Date().toISOString() },
    { id: "5", title: "Veri Analisti Stajyeri", companyName: "FinTech Solutions", sector: "Finans", type: "hybrid", location: "İstanbul", skills: ["Python", "Excel", "SQL"], salary: "", status: "active", createdAt: new Date().toISOString() },
];
