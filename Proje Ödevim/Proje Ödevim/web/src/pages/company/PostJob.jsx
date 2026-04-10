import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { useValidation } from "../../hooks/useValidation";
import { 
    PlusCircle, FileText, MapPin, Target, 
    ClipboardList, Wrench, Scale, Rocket, X 
} from "lucide-react";
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
    
    const { 
        loading, 
        setLoading, 
        error, 
        setError, 
        clearStatus 
    } = useValidation();

    const [form, setForm] = useState({
        title: "", position: "", department: "", openings: "1", 
        description: "", sector: "Yazılım", type: "remote",
        location: "", salary: "", duration: "", deadline: "",
        startDate: "", employmentType: "Stajyer",
        minEducation: "Ön Lisans", language: "İngilizce (Temel)",
        experienceLevel: "Stajyer", gender: "Farketmez",
        disabilityFriendly: false, ageRange: "", 
        driverLicense: "Gerekli Değil", travelRequirement: "Yok",
        cvRequired: true, portfolioRequired: false,
        militaryStatus: false, skills: [], requirements: "", benefits: ""
    });
    const [skillInput, setSkillInput] = useState("");

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(p => ({ ...p, [name]: type === "checkbox" ? checked : value }));
    };

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
        clearStatus();
        
        const requiredFields = {
            title: "İlan Başlığı",
            description: "İş Tanımı",
            position: "Pozisyon / Rol",
            department: "Birim / Departman",
            sector: "Sektör",
            location: "Konum"
        };

        const missingFields = Object.keys(requiredFields).filter(key => !form[key] || form[key].trim() === "");
        
        if (missingFields.length > 0) {
            const fieldNames = missingFields.map(key => requiredFields[key]).join(", ");
            setError(`Lütfen şu zorunlu alanları doldurun: ${fieldNames}`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setLoading(true);
        try {
            const companySnap = await getDoc(doc(db, "companies", currentUser.uid));
            const companyData = companySnap.data();

            await addDoc(collection(db, "jobs"), {
                ...form,
                companyId: currentUser.uid,
                companyName: currentUser.displayName,
                companyLogo: companyData?.logoUrl || "",
                status: "active",
                createdAt: new Date().toISOString()
            });
            navigate("/company/jobs");
            setTimeout(() => window.location.reload(), 100);
        } catch (err) {
            setError("İlan oluşturulamadı: " + err.message);
        }
        setLoading(false);
    };

    return (
        <div className="page-wrapper">
            <div className="content-wrapper page-enter" style={{ maxWidth: 940 }}>
                <h1 className="page-heading">
                    <PlusCircle className="header-icon" /> Tam Teşekküllü İlan Oluştur
                </h1>
                <p className="page-sub">Görseldeki tüm profesyonel kriterleri kapsayan detaylı ilan formu.</p>

                {error && <div className="alert alert-error mt-16 mb-16">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {/* Temel Bilgiler */}
                    <div className="card mb-24">
                        <h2 className="section-title2">
                            <FileText size={18} className="me-8" /> İlan Bilgileri
                        </h2>
                        <div className="post-form">
                            <div className="form-group">
                                <label className="form-label">İlan Başlığı *</label>
                                <input className="form-input" name="title" value={form.title} onChange={handleChange} placeholder="Örn: Kıdemli Frontend Geliştirici Stajyeri" required />
                            </div>
                            <div className="form-row-3">
                                <div className="form-group">
                                    <label className="form-label">Pozisyon / Rol</label>
                                    <input className="form-input" name="position" value={form.position} onChange={handleChange} placeholder="Örn: React Developer" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Birim / Departman</label>
                                    <input className="form-input" name="department" value={form.department} onChange={handleChange} placeholder="Örn: Ar-Ge Merkezi" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Alınacak Kişi Sayısı</label>
                                    <input className="form-input" type="number" name="openings" value={form.openings} onChange={handleChange} min="1" />
                                </div>
                            </div>
                            <div className="form-row-3">
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
                                <div className="form-group">
                                    <label className="form-label">İstihdam Şekli</label>
                                    <select className="form-select" name="employmentType" value={form.employmentType} onChange={handleChange}>
                                        <option>Stajyer</option>
                                        <option>Tam Zamanlı</option>
                                        <option>Yarı Zamanlı</option>
                                        <option>Proje Bazlı</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Konum & Şartlar */}
                    <div className="card mb-24">
                        <h2 className="section-title2">
                            <MapPin size={18} className="me-8" /> Konum ve Yan Haklar
                        </h2>
                        <div className="post-form">
                            <div className="form-row-3">
                                <div className="form-group">
                                    <label className="form-label">Şehir / Semt</label>
                                    <input className="form-input" name="location" value={form.location} onChange={handleChange} placeholder="Örn: İstanbul / Beşiktaş" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Maaş / Ücret</label>
                                    <input className="form-input" name="salary" value={form.salary} onChange={handleChange} placeholder="Örn: 15.000 - 20.000 TL" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tahmini Başlangıç</label>
                                    <input className="form-input" type="date" name="startDate" value={form.startDate} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Sosyal Olanaklar / Yan Haklar</label>
                                <textarea className="form-input" name="benefits" value={form.benefits} onChange={handleChange} placeholder="Özel sağlık sigortası, Yemek kartı, Eğitim desteği vb." rows={2} />
                            </div>
                        </div>
                    </div>

                    {/* Aday Kriterleri */}
                    <div className="card mb-24">
                        <h2 className="section-title2">
                            <Target size={18} className="me-8" /> Aday Kriterleri
                        </h2>
                        <div className="post-form">
                            <div className="form-row-3">
                                <div className="form-group">
                                    <label className="form-label">Minimum Eğitim</label>
                                    <select className="form-select" name="minEducation" value={form.minEducation} onChange={handleChange}>
                                        <option>Lise</option>
                                        <option>Ön Lisans</option>
                                        <option>Lisans Devam</option>
                                        <option>Lisans Mezun</option>
                                        <option>Yüksek Lisans</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Yabancı Dil</label>
                                    <input className="form-input" name="language" value={form.language} onChange={handleChange} placeholder="Örn: İngilizce (B2)" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tecrübe</label>
                                    <select className="form-select" name="experienceLevel" value={form.experienceLevel} onChange={handleChange}>
                                        <option>Stajyer</option>
                                        <option>Yeni Mezun (0-2 Yıl)</option>
                                        <option>Deneyimli (3-5 Yıl)</option>
                                        <option>Uzman (5+ Yıl)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row-3">
                                <div className="form-group">
                                    <label className="form-label">Cinsiyet</label>
                                    <select className="form-select" name="gender" value={form.gender} onChange={handleChange}>
                                        <option>Farketmez</option>
                                        <option>Erkek</option>
                                        <option>Kadın</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Yaş Aralığı</label>
                                    <input className="form-input" name="ageRange" value={form.ageRange} onChange={handleChange} placeholder="Örn: 20 - 28" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ehliyet Sınıfı</label>
                                    <input className="form-input" name="driverLicense" value={form.driverLicense} onChange={handleChange} placeholder="Örn: B Sınıfı" />
                                </div>
                            </div>
                            <div className="form-row-3">
                                <div className="form-group">
                                    <label className="form-label">Seyahat Durumu</label>
                                    <select className="form-select" name="travelRequirement" value={form.travelRequirement} onChange={handleChange}>
                                        <option>Seyahat Engeli Yok</option>
                                        <option>Seyahat Edebilir</option>
                                        <option>Seyahat Gerekmiyor</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Son Başvuru</label>
                                    <input className="form-input" type="date" name="deadline" value={form.deadline} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Süre</label>
                                    <input className="form-input" name="duration" value={form.duration} onChange={handleChange} placeholder="3 Ay / Proje Boyu" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detaylı Açıklama */}
                    <div className="card mb-24">
                        <h2 className="section-title2">
                            <ClipboardList size={18} className="me-8" /> İş Tanımı ve Detaylar *
                        </h2>
                        <textarea
                            className="form-textarea"
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            placeholder="Sorumluluklar, beklenen çıktılar ve şirket kültürü hakkında bilgi verin..."
                            rows={8}
                            required
                        />
                    </div>

                    {/* Yetenekler */}
                    <div className="card mb-24">
                        <h2 className="section-title2">
                            <Wrench size={18} className="me-8" /> Teknik Beceriler
                        </h2>
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
                        <div className="custom-skill-row" style={{ marginTop: 12 }}>
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
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                                {form.skills.map(s => (
                                    <span key={s} className="badge badge-primary">
                                        {s}
                                        <button onClick={() => toggleSkill(s)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", marginLeft: 4, padding: 0 }}>×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Seçenekler */}
                    <div className="card mb-24">
                        <h2 className="section-title2">
                            <Scale size={18} className="me-8" /> Başvuru Seçenekleri
                        </h2>
                        <div className="options-grid">
                            <label className="check-option">
                                <input type="checkbox" name="cvRequired" checked={form.cvRequired} onChange={handleChange} />
                                <span>📄 Özgeçmiş (CV) Zorunlu</span>
                            </label>
                            <label className="check-option">
                                <input type="checkbox" name="portfolioRequired" checked={form.portfolioRequired} onChange={handleChange} />
                                <span>🎨 Portfolyo / Repo Linki Zorunlu</span>
                            </label>
                            <label className="check-option">
                                <input type="checkbox" name="disabilityFriendly" checked={form.disabilityFriendly} onChange={handleChange} />
                                <span>♿ Engelliye Uygun / Kontenjan</span>
                            </label>
                            <label className="check-option">
                                <input type="checkbox" name="militaryStatus" checked={form.militaryStatus} onChange={handleChange} />
                                <span>🪖 Askerlik Tecilli / Yapıldı Sorgula</span>
                            </label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="form-actions-fixed">
                        <button type="button" className="btn btn-secondary" onClick={() => navigate("/company/jobs")}>
                            <X size={18} className="me-8" /> İptal
                        </button>
                        <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ minWidth: 220 }}>
                            {loading ? "📦 Sistem Hazırlanıyor..." : (
                                <>
                                    <Rocket size={18} className="me-8" /> İlanı Profesyonelce Yayınla
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};