import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import "./PostJob.css";

const SECTORS = ["Yazılım", "Finans", "Sağlık", "Tasarım", "Pazarlama", "Eğitim", "Mühendislik", "Hukuk", "Muhasebe", "Lojistik", "Diğer"];

const SKILLS_BY_SECTOR = {
    "Yazılım": ["JavaScript", "React", "Python", "Java", "Node.js", "CSS", "HTML", "SQL", "Git", "TypeScript", "Vue.js", "C#", "Firebase", "Docker"],
    "Finans": ["Ekonomi Analizi", "Banka İşlemleri", "Muhasebe", "Excel", "Finansal Raporlama", "Bütçe Yönetimi", "SAP", "ERP", "Vergi Hukuku"],
    "Sağlık": ["Hasta Bakımı", "Tıbbi Terminoloji", "İlk Yardım", "Laboratuvar", "Hasta Kayıt", "Biyokimya", "Farmakoloji", "Hemşirelik"],
    "Tasarım": ["Figma", "Photoshop", "Illustrator", "Adobe XD", "UI Tasarımı", "UX Araştırması", "Grafik Tasarım", "3D Modelleme", "After Effects"],
    "Pazarlama": ["Sosyal Medya Yönetimi", "SEO", "Google Ads", "İçerik Pazarlaması", "CRM", "Pazar Araştırması", "E-ticaret", "Copywriting"],
    "Eğitim": ["Öğretim Teknikleri", "Pedagoji", "Müfredat Geliştirme", "Eğitim Teknolojileri", "İngilizce", "Sınıf Yönetimi"],
    "Mühendislik": ["AutoCAD", "SolidWorks", "MATLAB", "Proje Yönetimi", "Teknik Çizim", "Statik Hesaplama", "Elektrik Devreleri"],
    "Hukuk": ["Dava Takibi", "Hukuki Yazışma", "Sözleşme Hazırlama", "İş Hukuku", "Ceza Hukuku", "İcra İflas Hukuku"],
    "Muhasebe": ["Logo", "Mikro", "Maliyet Muhasebesi", "Beyanname", "E-Fatura", "Genel Muhasebe"],
    "Lojistik": ["Tedarik Zinciri", "Depo Yönetimi", "Gümrük Mevzuatı", "Stok Takibi", "Filo Yönetimi", "Operasyonel Planlama"],
    "Diğer": ["İletişim", "Takım Çalışması", "Problem Çözme", "Zaman Yönetimi", "MS Office"]
};

export default function PostJob() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        title: "", description: "", sector: "Yazılım", type: "remote",
        location: "", salary: "", duration: "", deadline: "",
        skills: [], requirements: ""
    });
    const [skillInput, setSkillInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const toggleSkill = (skill) => {
        setForm(p => ({
            ...p,
            skills: p.skills.includes(skill)
                ? p.skills.filter(s => s !== skill)
                : [...p.skills, skill]
        }));
    };

    const addCustomSkill = () => {
        const s = skillInput.trim();
        if (s && !form.skills.includes(s)) {
            setForm(p => ({ ...p, skills: [...p.skills, s] }));
            setSkillInput("");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.description) {
            setError("Başlık ve açıklama zorunludur.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const companySnap = await getDoc(doc(db, "companies", currentUser.uid));
            const companyData = companySnap.data();

            await addDoc(collection(db, "jobs"), {
                ...form,
                companyId: currentUser.uid,
                companyName: currentUser.displayName,
                companyLogo: companyData?.logoUrl || "",
                skills: form.skills,
                status: "active",
                createdAt: serverTimestamp()
            });
            navigate("/company/jobs");
            setTimeout(() => window.location.reload(), 100);
        } catch (err) {
            setError("İlan oluşturulamadı: " + err.message);
        }
        setLoading(false);
    };

    return (
        <div className="page-wrapper post-job-wrapper page-enter">
            {/* Massive Hero Area */}
            <div className="post-job-hero">
                <div className="post-job-hero-content">
                    <h1 className="hero-title">İlanını Oluştur</h1>
                    <p className="hero-subtitle">Mükemmel yeteneğe ulaşmak için detaylı ve ilgi çekici bir ilan hazırlayın.</p>
                </div>
            </div>

            <div className="content-wrapper post-job-container">
                {error && <div className="alert alert-error mb-24">{error}</div>}

                <form className="post-job-layout" onSubmit={handleSubmit}>
                    
                    {/* Left Column - Main Content */}
                    <div className="post-job-main">
                        <div className="glass-card mb-24">
                            <h2 className="section-title2">📝 Temel Bilgiler</h2>
                            <div className="post-form mt-24">
                                <div className="form-group">
                                    <label className="form-label">İlan Başlığı <span style={{color: 'var(--danger)'}}>*</span></label>
                                    <input className="form-input form-input-lg" name="title" value={form.title} onChange={handleChange} placeholder="Örn: Kıdemli Frontend Geliştirici" required />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Sektör</label>
                                        <select className="form-select" name="sector" value={form.sector} onChange={handleChange}>
                                            {SECTORS.map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Çalışma Türü</label>
                                        <select className="form-select" name="type" value={form.type} onChange={handleChange}>
                                            <option value="remote">Uzaktan</option>
                                            <option value="hybrid">Hibrit</option>
                                            <option value="onsite">Ofis</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Konum</label>
                                        <input className="form-input" name="location" value={form.location} onChange={handleChange} placeholder="Örn: İstanbul / Şişli" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Maaş / Yan Haklar</label>
                                        <input className="form-input" name="salary" value={form.salary} onChange={handleChange} placeholder="Örn: 15.000₺ Yemek+Yol" />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Staj Süresi (Ay)</label>
                                        <input className="form-input" name="duration" type="number" value={form.duration} onChange={handleChange} placeholder="3" min={1} max={12} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Son Başvuru</label>
                                        <input className="form-input" name="deadline" type="date" value={form.deadline} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card mb-24">
                            <h2 className="section-title2">📋 İlan Açıklaması <span style={{color: 'var(--danger)'}}>*</span></h2>
                            <div className="form-group mt-24">
                                <textarea
                                    className="form-textarea"
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    placeholder="Şirketinizden bahsedin. Bu pozisyondan beklentileriniz ve sunacağınız olanaklar nelerdir? İlgi çekici bir tanım yazın."
                                    rows={12}
                                    style={{fontSize: '16px', lineHeight: '1.6'}}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="post-job-sidebar">
                        <div className="glass-card sticky-sidebar">
                            <h2 className="section-title2">🛠️ Aranan Beceriler</h2>
                            <p className="text-muted" style={{fontSize: 13, marginBottom: 16}}>Adayların filtreleme yapabilmesi için pozisyona uygun anahtar kelimeleri ekleyin.</p>
                            
                            <div className="skills-grid-post">
                                {(SKILLS_BY_SECTOR[form.sector] || SKILLS_BY_SECTOR["Diğer"]).map(s => (
                                    <button key={s} type="button"
                                        className={`skill-chip ${form.skills.includes(s) ? "selected" : ""}`}
                                        onClick={() => toggleSkill(s)}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="custom-skill-row mt-16">
                                <input
                                    className="form-input"
                                    placeholder="Özel beceri ekle..."
                                    value={skillInput}
                                    onChange={e => setSkillInput(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
                                />
                                <button type="button" className="btn btn-secondary" onClick={addCustomSkill}>Ekle</button>
                            </div>
                            
                            {form.skills.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
                                    {form.skills.map(s => (
                                        <span key={s} className="badge badge-primary" style={{padding: '6px 10px'}}>
                                            {s}
                                            <button type="button" onClick={() => toggleSkill(s)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", marginLeft: 6, padding: 0 }}>×</button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <hr style={{borderTop: '1px solid rgba(255,255,255,0.05)', margin: '24px 0'}} />

                            <div style={{ display: "flex",flexDirection: 'column', gap: 12 }}>
                                <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{width: '100%', justifyContent: 'center'}}>
                                    {loading ? "Yayınlanıyor..." : "🚀 İlanı Yayınla"}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => navigate("/company/jobs")} style={{width: '100%', justifyContent: 'center'}}>İptal ve Geri Dön</button>
                            </div>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
}
