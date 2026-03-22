import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, orderBy, getDocs, serverTimestamp, addDoc } from "firebase/firestore";
import { updateProfile, updatePassword } from "firebase/auth";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import "./StudentProfile.css";

//const SKILLS_LIST = ["JavaScript", "React", "Python", "Java", "Node.js", "CSS", "HTML", "Figma", "SQL", "Git", "TypeScript", "Vue.js", "C#", "C++", "PHP", "Swift", "Kotlin", "Flutter", "Django", "MongoDB", "PostgreSQL", "MySQL", "AWS", "Docker", "Machine Learning"];

export default function StudentProfile() {
    const { id: paramId } = useParams();
    const { currentUser, userProfile, updateDisplayName, logout } = useAuth();
    
    // Determine whose profile to show
    const effectiveId = paramId || currentUser?.uid;
    const isOwnProfile = !paramId || paramId === currentUser?.uid;

    const [profile, setProfile] = useState({
        university: "", department: "", gpa: "", bio: "", skills: [], cvUrl: "",
        displayName: currentUser?.displayName || ""
    });
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingCV, setUploadingCV] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const [skillInput, setSkillInput] = useState("");
    const [reviews, setReviews] = useState([]);

    // Available Skills State
    const [availableSkills, setAvailableSkills] = useState([]);

    // Auth error modal
    const [authErrorModal, setAuthErrorModal] = useState(false);

    // Password state
    const [newPassword, setNewPassword] = useState("");
    const [settingPassword, setSettingPassword] = useState(false);
    const [passwordSuccessModal, setPasswordSuccessModal] = useState(false);
    const isGoogleSignIn = currentUser?.providerData?.some(provider => provider.providerId === 'google.com');
    const hasPassword = currentUser?.providerData?.some(provider => provider.providerId === 'password');

    // Camera & Modal States
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Company Rating State
    const [ratingValue, setRatingValue] = useState(5);
    const [ratingComment, setRatingComment] = useState("");
    const [submittingRating, setSubmittingRating] = useState(false);
    const [reportModal, setReportModal] = useState({ show: false, studentId: "", studentName: "" });
    const [reportReason, setReportReason] = useState("");
    const [reporting, setReporting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!effectiveId) return;
            try {
                // Fetch basic user data (for email/name) from users collection
                const uDoc = await getDoc(doc(db, "users", effectiveId));
                let userData = {};
                if (uDoc.exists()) {
                    userData = uDoc.data();
                }

                const snap = await getDoc(doc(db, "students", effectiveId));
                if (snap.exists()) {
                    const data = snap.data();
                    setProfile(prev => ({
                        ...prev,
                        ...data,
                        email: userData.email || data.email || "",
                        displayName: userData.displayName || data.displayName || prev.displayName,
                        skills: data.skills || [],
                        photoUrl: data.photoUrl || userData.photoUrl || userData.photoURL || prev.photoUrl
                    }));
                } else if (uDoc.exists()) {
                    // If only user document exists (maybe hasn't filled profile yet)
                    setProfile(prev => ({
                        ...prev,
                        email: userData.email || "",
                        displayName: userData.displayName || prev.displayName,
                        photoUrl: userData.photoUrl || userData.photoURL || prev.photoUrl
                    }));
                }

                const q = query(
                    collection(db, "reviews"),
                    where("toId", "==", effectiveId)
                );
                const reviewSnap = await getDocs(q);
                const reviewData = reviewSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                setReviews(reviewData.sort((a, b) => {
                    const getMs = (val) => {
                        if (!val) return 0;
                        if (val.toMillis) return val.toMillis();
                        const d = new Date(val).getTime();
                        return isNaN(d) ? 0 : d;
                    };
                    return getMs(b.createdAt) - getMs(a.createdAt);
                }));
            } catch (err) { console.error(err); }
            setLoading(false);
        };
        fetchData();

        // Cleanup camera on unmount
        return () => {
            stopCamera();
        };
    }, [effectiveId, currentUser]);

    const handleCompanyRating = async () => {
        if (!currentUser || userProfile?.type !== "company") return;
        setSubmittingRating(true);
        setError("");
        setSuccess("");
        
        try {
            const reviewId = `${currentUser.uid}_${effectiveId}`;
            const reviewRef = doc(db, "reviews", reviewId);
            
            const reviewData = {
                fromId: currentUser.uid,
                toId: effectiveId,
                rating: ratingValue,
                comment: ratingComment,
                jobTitle: "Şirket Değerlendirmesi",
                createdAt: new Date().toISOString()
            };

            const snap = await getDoc(reviewRef);
            if (snap.exists()) {
                await updateDoc(reviewRef, { 
                    rating: ratingValue, 
                    comment: ratingComment,
                    updatedAt: new Date().toISOString() 
                });
            } else {
                await setDoc(reviewRef, reviewData);
            }

            setSuccess("Değerlendirmeniz başarıyla kaydedildi! ⭐");
            setRatingComment("");
            
            // Refetch reviews
            const q = query(collection(db, "reviews"), where("toId", "==", effectiveId));
            const reviewSnap = await getDocs(q);
            setReviews(reviewSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => {
                const getTs = (x) => x.createdAt?.toMillis ? x.createdAt.toMillis() : new Date(x.createdAt || 0).getTime();
                return getTs(b) - getTs(a);
            }));

        } catch (err) {
            console.error("Rating error:", err);
            setError("Değerlendirme gönderilirken bir hata oluştu.");
        }
        setSubmittingRating(false);
    };

    const handleReportSubmit = async () => {
        if (!reportReason.trim() || !currentUser) return;
        setReporting(true);
        try {
            // Write report
            await addDoc(collection(db, "reports"), {
                reporterId: currentUser.uid,
                reporterName: userProfile?.displayName || "Bir Şirket",
                targetId: effectiveId,
                targetName: profile.displayName,
                reason: reportReason,
                status: "pending",
                createdAt: serverTimestamp()
            });

            // Notify reporter (company)
            await addDoc(collection(db, `notifications/${currentUser.uid}/items`), {
                type: "system",
                message: `${profile.displayName} hakkındaki ihbarınız merkeze iletildi. Gereği yapılacaktır.`,
                read: false,
                createdAt: serverTimestamp()
            });

            setReportModal({ show: false, studentId: "", studentName: "" });
            setReportReason("");
            setSuccess("İhbarınız başarıyla merkeze iletildi! 🛡️");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Report error:", err);
            setError("İhbar iletilemedi.");
        }
        setReporting(false);
    };

    const handleSave = async () => {
        if (!isOwnProfile) return;
        setSaving(true);
        try {
            // Update auth and users table
            if (profile.displayName !== currentUser.displayName) {
                await updateDisplayName(profile.displayName);
            }

            const { displayName, email, ...roleData } = profile;
            await setDoc(doc(db, "students", currentUser.uid), roleData, { merge: true });

            setEditMode(false);
            setSuccess("Profil güncellendi! ✅");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error(err);
        }
        setSaving(false);
    };

    const handleSetPassword = async () => {
        if (newPassword.length < 6) return;
        setSettingPassword(true);
        try {
            await updatePassword(currentUser, newPassword);
            setNewPassword("");
            setPasswordSuccessModal(true);
        } catch (err) {
            if (err.code === "auth/requires-recent-login") {
                setAuthErrorModal(true);
            } else {
                setError("Şifre belirlenirken bir hata oluştu.");
                setTimeout(() => setError(""), 3000);
            }
        }
        setSettingPassword(false);
    };

    const handlePhotoUpload = async (e) => {
        const file = e instanceof File ? e : e.target.files[0];
        if (!file) return;
        setUploadingPhoto(true);
        try {
            const url = await uploadToCloudinary(file);
            setProfile((p) => ({ ...p, photoUrl: url }));
            await setDoc(doc(db, "students", currentUser.uid), { photoUrl: url }, { merge: true });
            await updateDoc(doc(db, "users", currentUser.uid), { photoUrl: url });

            try { await updateProfile(currentUser, { photoURL: url }); } catch (e) { }

            setSuccess("Profil fotoğrafı güncellendi! ✅");
            setShowPhotoModal(false);
            setPreviewPhoto(null);
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Fotoğraf yüklenemedi:", err);
            setError("Fotoğraf yüklenirken bir hata oluştu.");
            setTimeout(() => setError(""), 3000);
        }
        setUploadingPhoto(false);
    };

    const startCamera = async () => {
        setIsCameraActive(true);
        setPreviewPhoto(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: false
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Kamera açılamadı:", err);
            setError("Kameraya erişilemedi. Lütfen izinleri kontrol edin.");
            setIsCameraActive(false);
            setTimeout(() => setError(""), 3000);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => {
                track.stop();
                track.enabled = false;
            });
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL("image/jpeg");
            setPreviewPhoto(dataUrl);
            stopCamera(); // Stop camera as soon as photo is taken
        }
    };

    const saveCapturedPhoto = () => {
        if (previewPhoto) {
            fetch(previewPhoto)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
                    handlePhotoUpload(file);
                });
        }
    };

    const retakePhoto = () => {
        setPreviewPhoto(null);
        startCamera(); // Restart camera for retake
    };

    const handleCVUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingCV(true);
        try {
            const url = await uploadToCloudinary(file);
            setProfile((p) => ({ ...p, cvUrl: url }));
            await setDoc(doc(db, "students", currentUser.uid), { cvUrl: url }, { merge: true });
            setSuccess("CV yüklendi! ✅");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("CV yüklenemedi:", err);
            setError("Dosya yüklenirken bir hata oluştu.");
            setTimeout(() => setError(""), 3000);
        }
        setUploadingCV(false);
    };

    const handleDeleteCV = async () => {
        if (!window.confirm("CV'nizi silmek istediğinizden emin misiniz?")) return;
        try {
            await updateDoc(doc(db, "students", currentUser.uid), { cvUrl: "" });
            setProfile(p => ({ ...p, cvUrl: "" }));
            setSuccess("CV başarıyla silindi! ✅");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("CV silinemedi:", err);
        }
    };

    const toggleSkill = (skill) => {
        setProfile((p) => {
            const currentSkills = p.skills || [];
            return {
                ...p,
                skills: currentSkills.includes(skill)
                    ? currentSkills.filter((s) => s !== skill)
                    : [...currentSkills, skill],
            };
        });
    };

    const addCustomSkill = () => {
        const s = skillInput.trim();
        const currentSkills = profile.skills || [];
        if (s && !currentSkills.includes(s)) {
            setProfile((p) => ({ ...p, skills: [...(p.skills || []), s] }));
            setSkillInput("");
        }
    };

    const suggestSkills = (dept) => {
        const mapping = {
            // Mühendislikler
            "bilgisayar": ["JavaScript", "React", "Node.js", "SQL", "Git", "Python", "Java", "C#", "C++", "Docker", "AWS", "Go", "TypeScript", "NoSQL", "Machine Learning", "System Design", "Agile", "Linux", "Data Structures"],
            "yazılım": ["JavaScript", "React", "Node.js", "SQL", "Git", "Java", "C#", "Python", "Docker", "Kubernetes", "CI/CD", "Software Architecture", "TDD", "REST API", "GraphQL"],
            "bilişim": ["Siber Güvenlik", "Ağ Yönetimi", "Network Security", "Penetration Testing", "Cloud Computing", "Linux", "Veritabanı Yönetimi", "ITIL"],
            "endüstri": ["SQL", "Python", "Data Analysis", "Excel", "Optimizasyon", "Yalın Üretim", "Supply Chain Management", "ERP", "SAP", "Six Sigma", "Operations Research", "Simülasyon", "Veri Madenciliği"],
            "elektrik": ["C++", "Python", "MATLAB", "Embedded Systems", "PLC", "Devre Tasarımı", "AutoCAD Electrical", "Güç Sistemleri", "Otomasyon", "Sinyal İşleme", "Mikrodenetleyiciler"],
            "elektronik": ["C++", "MATLAB", "Embedded Systems", "PLC", "Devre Tasarımı", "Altium Designer", "PCB", "IoT", "Sensörler", "RF Tasarımı"],
            "makine": ["AutoCAD", "SolidWorks", "Python", "Termodinamik", "CAD/CAM", "ANSYS", "Finite Element Analysis (FEA)", "Catia", "İmalat Yöntemleri", "Akışkanlar Mekaniği", "Robotik", "CNC"],
            "inşaat": ["AutoCAD", "Revit", "SAP2000", "ETABS", "Civil 3D", "Primavera P6", "Statik Hesap", "Şantiye Yönetimi", "Proje Yönetimi", "Yapı Malzemeleri", "Zemin Mekaniği"],
            "mimarlık": ["AutoCAD", "Revit", "SketchUp", "3ds Max", "Lumion", "Photoshop", "Rhino", "V-Ray", "İç Mekan Tasarımı", "BIM", "Maket Yapımı", "Sürdürülebilir Tasarım", "Archicad"],
            "mekatronik": ["Python", "C++", "MATLAB", "SolidWorks", "PLC", "Robotik", "Arduino/Raspberry Pi", "Otomasyon", "Görüntü İşleme", "Kontrol Sistemleri"],
            "uzay": ["Aerodinamik", "Catia", "MATLAB", "ANSYS", "Python", "Uçuş Mekaniği", "Termodinamik", "İtki Sistemleri"],
            "havacılık": ["Aerodinamik", "Catia", "MATLAB", "ANSYS", "Python", "Uçuş Mekaniği", "Termodinamik", "İtki Sistemleri"],
            "uçak": ["Aerodinamik", "Catia", "MATLAB", "ANSYS", "Python", "Uçuş Mekaniği", "Sistem Mühendisliği"],
            "kimya mühendisliği": ["Process Engineering", "Aspen HYSYS", "MATLAB", "Termodinamik", "Polimer Kimyası", "Kalite Kontrol", "Laboratuvar Teknikleri", "Chemcad"],
            "biyomedikal": ["Biyomalzemeler", "Tıbbi Cihazlar", "Sinyal İşleme", "MATLAB", "Görüntü İşleme", "Python", "Arduino", "Anatomi", "Biyomekanik"],
            
            // Doğa Bilimleri ve Matematik
            "matematik": ["Python", "SQL", "MATLAB", "İstatistik", "R", "Data Analysis", "Optimization", "Problem Çözme", "Algoritma Analizi"],
            "fizik": ["Python", "MATLAB", "Data Analysis", "Kuantum Fiziği", "İstatistiksel Mekanik", "Laboratuvar Yöntemleri", "Radyasyon Güvenliği", "Veri Modelleme"],
            "kimya": ["Laboratuvar Spektroskopisi", "Kromatografi (HPLC/GC)", "Organik Sentez", "Araştırma Geliştirme (Ar-Ge)", "Analitik Kimya", "Veri Analizi", "Kalite Kontrol"],
            "biyoloji": ["Genetik Analiz", "Mikrobiyoloji", "Moleküler Biyoloji", "PCR", "Biyoinformatik", "Laboratuvar Güvenliği", "Python", "R"],
            "biyoteknoloji": ["Hücre Kültürü", "CRISPR", "Genetik Mühendisliği", "Biyokimya", "Veri Analizi", "Laboratuvar Yönetimi"],
            "istatistik": ["R", "Python", "SQL", "SAS", "SPSS", "Machine Learning", "Data Visualization", "Veri Madenciliği", "Ekonometri", "Tableau", "Power BI"],
            
            // Sağlık Bilimleri
            "tıp": ["İlk Yardım", "Hasta Bakımı", "Tıbbi Terminoloji", "Anatomi", "Kriz Yönetimi", "İletişim", "Tanı ve Tedavi", "Klinik Araştırma", "Cerrahi Uygulamalar", "Pediatri", "Dahiliye", "Farmakoloji"],
            "hekimlik": ["İlk Yardım", "Hasta Bakımı", "Tıbbi Terminoloji", "Anatomi", "Kriz Yönetimi", "İletişim", "Tanı ve Tedavi"],
            "diş hekimliği": ["Ağız ve Diş Sağlığı", "Protetik Diş Tedavisi", "Ortodonti", "Endodonti", "Hasta İletişimi", "Röntgen Analizi", "Cerrahi Müdahale"],
            "hemşirelik": ["İlk Yardım", "Hasta Bakımı", "Tıbbi Terminoloji", "Kriz Yönetimi", "İlaç Uygulamaları", "Hasta İletişimi", "Vital Bulgular", "Kan Alma", "Yoğun Bakım", "Pediatrik Bakım"],
            "eczacılık": ["Farmakoloji", "İlaç Etkileşimleri", "Toksikoloji", "Hasta Danışmanlığı", "Laboratuvar Uygulamaları", "Klinik Eczacılık", "Dozaj Hesaplama"],
            "sağlık yönetimi": ["Sağlık Ekonomisi", "Hastane Yönetimi", "Kalite Yönetimi", "Kriz Yönetimi", "İletişim", "Finans", "Sağlık Bilişimi"],
            "fizyoterapi": ["Anatomi", "Kinezyoloji", "Rehabilitasyon", "Manuel Terapi", "Egzersiz Fizyolojisi", "Hasta İletişimi", "Masaj Terapisi", "Ortopedik Rehabilitasyon"],
            "veteriner": ["Hayvan Anatomisi", "Hayvan Sağlığı", "Cerrahi Müdahale", "Aşı Uygulamaları", "Zootekni", "Farmakoloji"],
            
            // İktisadi ve İdari Bilimler
            "ekonomi": ["Finansal Analiz", "Muhasebe", "Risk Yönetimi", "Bütçeleme", "Excel", "Makroekonomi", "Mikroekonomi", "Ekonometri", "Stata", "R", "Python", "Veri Analizi"],
            "iktisat": ["Finansal Analiz", "Muhasebe", "Risk Yönetimi", "Bütçeleme", "Excel", "Makroekonomi", "Mikroekonomi", "Ekonometri", "Stata", "R", "Python", "Veri Analizi"],
            "işletme": ["Proje Yönetimi", "Liderlik", "Pazarlama", "Muhasebe", "Excel", "Stratejik Planlama", "İnsan Kaynakları", "Finans", "SWOT Analizi", "Müşteri İlişkileri", "Girişimcilik", "B2B Marketing"],
            "maliye": ["Vergi Hukuku", "Muhasebe", "Kamu Maliyesi", "Finansal Analiz", "Bütçeleme", "Mali Denetim", "SAP", "Excel"],
            "uluslararası ilişkiler": ["Araştırma", "Diplomasi", "Politik Analiz", "Dil Becerileri", "Kültürlerarası İletişim", "Kriz Yönetimi", "Müzakere", "Sunum Becerileri", "Raporlama"],
            "siyaset": ["Araştırma", "Diplomasi", "Politik Analiz", "Kamu Yönetimi", "Kriz Yönetimi", "Eleştirel Düşünme"],
            "kamu yönetimi": ["Mevzuat Bilgisi", "Yerel Yönetimler", "Politika Geliştirme", "İnsan Kaynakları", "Stratejik Planlama"],
            "çalışma ekonomisi": ["İş Hukuku", "İnsan Kaynakları Yönetimi", "Sosyal Güvenlik", "Bordro", "Sendika İlişkileri", "Performans Değerlendirme"],
            "insan kaynakları": ["İşe Alım", "Bordro", "Eğitim ve Gelişim", "Performans Değerlendirme", "İş Hukuku", "Çalışan Bağlılığı", "Yetenek Yönetimi", "İK Analitiği", "Kariyer Planlama"],
            
            // Sosyal ve Beşeri Bilimler
            "psikoloji": ["Klinik Gözlem", "Görüşme Teknikleri", "Araştırma Yöntemleri", "İstatistik (SPSS)", "Veri Analizi", "Empati", "İletişim", "Nöropsikoloji", "Bilişsel Terapi"],
            "sosyoloji": ["Sosyal Araştırma Yöntemleri", "Veri Analizi (SPSS/R)", "Saha Çalışması", "Kültürel Analiz", "Eleştirel Düşünme", "Anket Tasarımı", "Raporlama"],
            "felsefe": ["Eleştirel Düşünme", "Mantıksal Analiz", "Argüman Geliştirme", "Araştırma", "Etik Değerlendirme", "Yazılı İletişim", "Kavramsal Analiz"],
            "tarih": ["Arşiv Araştırması", "Veri Analizi", "Eleştirel Düşünme", "Yazılı İletişim", "Müzecilik", "Sosyokültürel Analiz", "Metin Çevirisi"],
            "coğrafya": ["CBS (Coğrafi Bilgi Sistemleri)", "ArcGIS", "QGIS", "Kartografi", "Araştırma", "Veri Analizi", "Saha Çalışması", "Çevre Etki Değerlendirmesi", "Uzaktan Algılama"],
            "edebiyat": ["Metin Analizi", "Yaratıcı Yazarlık", "Eleştirel Düşünme", "Editörlük", "İletişim", "Araştırma", "Çeviri"],
            "iletişim": ["Metin Yazarlığı", "Halkla İlişkiler (PR)", "Kurumsal İletişim", "Medya Okuryazarlığı", "Sosyal Medya Yönetimi", "Kriz İletişimi", "Sunum Becerileri"],
            "halkla ilişkiler": ["Kriz Yönetimi", "Basın Bülteni Tasarımı", "Medya İlişkileri", "Sponsorluk", "Etkinlik Yönetimi", "Sosyal Medya Yönetimi", "Metin Yazarlığı", "Kurumsal İletişim"],
            "gazetecilik": ["Haber Yazımı", "Röportaj Teknikleri", "Kurgu", "Araştırmacı Gazetecilik", "SEO", "Dijital Medya", "Fotoğrafçılık", "Video Montajı"],
            "radyo ve televizyon": ["Kurgu (Premiere Pro, Final Cut)", "Senaryo Yazımı", "Kamera Kullanımı", "Yönetmenlik", "Canlı Yayın Akışı", "Ses Tasarımı"],
            "reklamcılık": ["Metin Yazarlığı", "Pazarlama Stratejisi", "Medya Planlama", "Müşteri İlişkileri", "Adobe Creative Cloud", "Dijital Pazarlama", "SEO/SEM"],
            
            // Hukuk
            "hukuk": ["Mevzuat Bilgisi", "Dava Takibi", "Sözleşme Hazırlama", "Araştırma", "Müzakere", "Uyuşmazlık Çözümü", "Ticaret Hukuku", "İş Hukuku", "Ceza Hukuku", "Medeni Hukuk", "Uluslararası Hukuk", "Hukuki Danışmanlık", "Adli Yazışmalar"],
            "adalet": ["Mevzuat Bilgisi", "Dosya Yönetimi", "Hukuki Yazışmalar", "İcra Takibi", "Kalem İşleri"],
            
            // Eğitim Bilimleri
            "öğretmenlik": ["Eğitim Psikolojisi", "Sınıf Yönetimi", "Müfredat Geliştirme", "Ölçme ve Değerlendirme", "Sunum Becerileri", "İletişim", "Eğitim Teknolojileri", "İçerik Geliştirme", "Özel Eğitim"],
            "eğitim bilimleri": ["Araştırma Yöntemleri", "Eğitim Planlaması", "Psikolojik Danışmanlık", "Eğitim Yönetimi", "İstatistik"],
            
            // Tasarım ve Sanat
            "görsel iletişim": ["Grafik Tasarım", "Adobe Creative Cloud", "UX/UI Tasarım", "Tipografi", "Video Kurgu (Premiere)", "Hareketli Grafik (After Effects)", "Dijital İllüstrasyon", "Web Tasarım"],
            "endüstriyel tasarım": ["Rhinoceros", "SolidWorks", "3D Modelleme", "Prototipleme", "Tasarım Odaklı Düşünme", "Kullanıcı Deneyimi (UX)", "Ergonomi", "Malzeme Bilimi", "Sketching"],
            "moda tasarımı": ["Kalıp Çıkarma", "Dikiş Teknikleri", "Tekstil Bilgisi", "Adobe Illustrator", "Moda İllüstrasyonu", "Trend Analizi", "Koleksiyon Hazırlama"],
            "iç mimarlık": ["AutoCAD", "SketchUp", "3ds Max", "Revit", "V-Ray", "Photoshop", "Mobilya Tasarımı", "Aydınlatma Tasarımı", "Malzeme Bilgisi"],
            "animasyon": ["2D Animasyon", "3D Animasyon", "Maya", "Blender", "After Effects", "Karakter Tasarımı", "Storyboard İşlemleri"],
            "grafik": ["Photoshop", "Illustrator", "InDesign", "CorelDraw", "Kurumsal Kimlik Tasarımı", "Tipografi", "Renk Teorisi", "Ambalaj Tasarımı"],
            
            // Turizm ve Gastronomi
            "turizm": ["Otel Yönetimi", "Müşteri İlişkileri", "Rehberlik", "Etkinlik Planlama", "Yabancı Dil", "Amadeus / Galileo", "Rezervasyon Sistemleri", "Satış ve Pazarlama"],
            "gastronomi": ["Mutfak Yönetimi", "Gıda Güvenliği", "Menü Planlama", "Maliyet Kontrolü", "Dünya Mutfakları", "Pastacılık", "İnovatif Pişirme Teknikleri"],
            
            // Spor Bilimleri
            "spor bilimleri": ["Anatomi", "Antrenman Bilgisi", "Beslenme Bilgisi", "Kinezyoloji", "Spor Psikolojisi", "Fiziksel Kondisyon", "Spor Yönetimi", "Etkinlik Yönetimi"],
            
            // Diğer
            "maden": ["Maden Tasarımı", "Cevher Hazırlama", "AutoCAD", "Saha Yönetimi", "İş Sağlığı ve Güvenliği", "Netcad", "Patlatma Teknikleri", "Jeoloji"],
            "jeoloji": ["Saha Araştırması", "CBS (GIS)", "Netcad", "ArcGIS", "Veri Analizi", "Zemin Etüdü", "Sondaj Takibi"],
            "çevre": ["Atık Yönetimi", "ÇED Raporlama", "Su Arıtma Tasarımı", "AutoCAD", "Çevre Mevzuatı", "Sürdürülebilirlik", "Karbon Ayak İzi Hesaplama", "Geri Dönüşüm Sistemleri"],
            "gıda mühendisliği": ["Kalite Kontrol (HACCP)", "Gıda Mikrobiyolojisi", "Üretim Planlama", "Ar-Ge", "Gıda Güvenliği Standartları", "Ambalajlama", "Laboratuvar Uygulamaları"],
            "tekstil": ["İplik ve Kumaş Üretimi", "Kalite Kontrol", "Ürün Geliştirme (Ar-Ge)", "Malzeme Bilimi", "Üretim Planlama", "Pazarlama"],
            "harita mühendisliği": ["CBS (GIS)", "Netcad", "AutoCAD", "Fotogrametri", "Uzaktan Algılama", "Geodezi", "Topoğrafya"],
            "tarım": ["Tarımsal Üretim", "Bitki Koruma", "Toprak Bilimi", "Sulama Sistemleri", "Sürdürülebilir Tarım", "Agrobilişim"],
            "ziraat": ["Tarımsal Üretim", "Bitki Koruma", "Toprak Bilimi", "Sulama Sistemleri", "Sürdürülebilir Tarım", "Agrobilişim"],
            "lojistik": ["Tedarik Zinciri Yönetimi", "Depo Yönetimi", "Gümrük Mevzuatı", "Nakliye Organizasyonu", "ERP", "SAP", "Operasyon Yönetimi", "Envanter Kontrolü"],
            "denizcilik": ["Gemi Yönetimi", "Deniz Hukuku", "Lojistik Yönetimi", "Navigasyon", "Deniz Emniyeti", "Liman İşletmeciliği"]
        };

        const lowerDept = (dept || "").toLowerCase().trim();
        
        if (!lowerDept) {
            setAvailableSkills([]);
            return;
        }

        let foundSkills = [];
        
        Object.keys(mapping).forEach(key => {
            if (lowerDept.includes(key)) {
                foundSkills = [...foundSkills, ...mapping[key]];
            }
        });

        if (foundSkills.length > 0) {
            // Sadece bulunan (bölüme ait) yetenekleri göster
            const newSkills = Array.from(new Set(foundSkills));
            setAvailableSkills(newSkills);
        } else {
            // Hiçbir eşleşme yoksa alanı boşalt
            setAvailableSkills([]);
        }
    };

    const initials = (profile.displayName || profile.email || "?")
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    if (loading) return (
        <div className="page-wrapper">
            <div className="content-wrapper" style={{ maxWidth: 700 }}>
                <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
            </div>
        </div>
    );

    return (
        <div className="page-wrapper">
            <div className="content-wrapper page-enter" style={{ maxWidth: 750 }}>
                {success && <div className="alert alert-success mb-16">{success}</div>}
                {error && <div className="alert alert-danger mb-16">{error}</div>}

                {/* Profile Header */}
                <div className="profile-header card">
                    <div className="profile-avatar-container">
                        <div className="avatar avatar-xl profile-avatar" onClick={() => isOwnProfile && setShowPhotoModal(true)} style={{ cursor: isOwnProfile ? "pointer" : "default" }}>
                            {(profile.photoUrl || (isOwnProfile && currentUser?.photoURL)) ? (
                                <img src={profile.photoUrl || (isOwnProfile && currentUser?.photoURL)} alt="Profil" className="avatar-img" />
                            ) : initials}
                        </div>
                        {isOwnProfile && (
                            <button className="photo-upload-badge" title="Fotoğraf Değiştir" onClick={() => setShowPhotoModal(true)}>
                                📷
                            </button>
                        )}
                    </div>
                    <div className="profile-header-info">
                        <h1 className="profile-name">{profile.displayName || "İsimsiz Öğrenci"}</h1>
                        <p className="profile-email">{profile.email || "E-posta belirtilmedi"}</p>
                        <span className="badge badge-primary">
                            🎓 Öğrenci
                        </span>
                    </div>
                    {isOwnProfile && !editMode && (
                        <button className="btn btn-secondary" onClick={() => setEditMode(true)}>
                            ✏️ Düzenle
                        </button>
                    )}
                </div>

                {/* Info */}
                <div className="card mt-24">
                    <div className="section-header-profile">
                        <h2 className="section-title2">👤 Kişisel Bilgiler</h2>
                    </div>

                    {editMode ? (
                        <div className="profile-form">
                            <div className="form-group">
                                <label className="form-label">Ad Soyad</label>
                                <input className="form-input" value={profile.displayName} onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))} placeholder="Adınız Soyadınız" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Üniversite</label>
                                <input className="form-input" value={profile.university} onChange={e => setProfile(p => ({ ...p, university: e.target.value }))} placeholder="Örn: İTÜ" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Bölüm</label>
                                <input
                                    className="form-input"
                                    value={profile.department || ""}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setProfile(p => ({ ...p, department: val }));
                                        suggestSkills(val);
                                    }}
                                    placeholder="Örn: Bilgisayar Mühendisliği"
                                />
                                <small style={{ color: "var(--text-muted)", fontSize: 11 }}>Bölümünüzü yazdıkça beceriler listesi anında güncellenir.</small>
                            </div>
                            <div className="form-group">
                                <label className="form-label">GPA / Not Ortalaması</label>
                                <input className="form-input" value={profile.gpa} onChange={e => setProfile(p => ({ ...p, gpa: e.target.value }))} placeholder="Örn: 3.50 / 4.00" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Hakkımda</label>
                                <textarea className="form-textarea" value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Kendinizi kısaca tanıtın..." rows={4} />
                            </div>
                        </div>
                    ) : (
                        <div className="profile-info-grid">
                            <InfoItem icon="🏛️" label="Üniversite" value={profile.university || "—"} />
                            <InfoItem icon="📚" label="Bölüm" value={profile.department || "—"} />
                            <InfoItem icon="📊" label="GPA" value={profile.gpa || "—"} />
                            <InfoItem icon="📝" label="Hakkımda" value={profile.bio || "—"} wide />
                        </div>
                    )}
                </div>

                {/* Skills */}
                <div className="card mt-24">
                    <h2 className="section-title2">🛠️ Beceriler</h2>
                    {editMode ? (
                        <>
                            <div className="skills-grid">
                                {availableSkills.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => toggleSkill(s)}
                                        className={`skill-chip ${(profile.skills || []).includes(s) ? "selected" : ""}`}
                                        type="button"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                            <div className="custom-skill-row">
                                <input
                                    className="form-input"
                                    placeholder="Özel beceri ekle..."
                                    value={skillInput}
                                    onChange={(e) => setSkillInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
                                />
                                <button className="btn btn-secondary" onClick={addCustomSkill} type="button">Ekle</button>
                            </div>
                            <div className="selected-skills-preview">
                                <p className="form-label">Seçilen: {(profile.skills || []).length}</p>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                                    {(profile.skills || []).map((s) => (
                                        <span key={s} className="badge badge-primary">
                                            {s}
                                            <button onClick={() => toggleSkill(s)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", marginLeft: 4, padding: 0 }}>×</button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {(profile.skills || []).length === 0 ? (
                                <p style={{ color: "var(--text-muted)" }}>Henüz beceri eklenmedi</p>
                            ) : (profile.skills || []).map((s) => (
                                <span key={s} className="badge badge-primary" style={{ fontSize: 13, padding: "6px 12px" }}>{s}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* CV */}
                <div className="card mt-24">
                    <h2 className="section-title2">📄 CV</h2>
                    <div className="cv-section">
                        {profile.cvUrl ? (
                            <div className="cv-item-box">
                                <div className="cv-uploaded">
                                    <span className="cv-icon">📄</span>
                                    <div>
                                        <p className="cv-label">CV Yüklendi</p>
                                        <div className="cv-links">
                                            <a
                                                href={profile.cvUrl.includes("/upload/") ? profile.cvUrl.replace("/upload/", "/upload/fl_attachment:false/") : profile.cvUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="cv-view-link"
                                            >
                                                👁️ Görüntüle
                                            </a>
                                            {isOwnProfile && <button className="cv-delete-btn" onClick={handleDeleteCV}>🗑️ Sil</button>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Henüz CV yüklenmedi</p>
                        )}
                        {isOwnProfile && (
                            <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
                                {uploadingCV ? "Yükleniyor..." : (profile.cvUrl ? "📤 Güncelle" : "📤 CV Yükle")}
                                <input type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={handleCVUpload} disabled={uploadingCV} />
                            </label>
                        )}
                    </div>
                </div>

                {/* Photo Modal */}
                {showPhotoModal && (
                    <div className="modal-overlay" onClick={() => { stopCamera(); setPreviewPhoto(null); setShowPhotoModal(false); }}>
                        <div className="modal-content photo-modal card" onClick={e => e.stopPropagation()}>
                            <h3>Profil Fotoğrafı</h3>

                            {(!isCameraActive && !previewPhoto) ? (
                                <div className="photo-options mt-24">
                                    <label className="photo-option-btn card">
                                        <span>📁</span>
                                        <p>Dosyalarından Seç</p>
                                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
                                    </label>
                                    <button className="photo-option-btn card" onClick={startCamera}>
                                        <span>📷</span>
                                        <p>Kamera ile Çek</p>
                                    </button>
                                </div>
                            ) : (
                                <div className="camera-wrapper mt-16">
                                    <div className="camera-container">
                                        {previewPhoto ? (
                                            <img src={previewPhoto} className="photo-preview-img" alt="Önizleme" />
                                        ) : (
                                            <video ref={videoRef} autoPlay playsInline className="video-preview" />
                                        )}
                                        <canvas ref={canvasRef} style={{ display: "none" }} />

                                        {!previewPhoto && (
                                            <button className="shutter-btn" onClick={capturePhoto} title="Fotoğraf Çek">
                                                <div className="shutter-icon"></div>
                                            </button>
                                        )}
                                    </div>

                                    <div className="camera-controls mt-16">
                                        {previewPhoto ? (
                                            <div style={{ display: "flex", gap: "12px", width: "100%", flexDirection: "column" }}>
                                                <button className="btn btn-primary w-full" onClick={saveCapturedPhoto} disabled={uploadingPhoto}>
                                                    {uploadingPhoto ? "Yükleniyor..." : "✅ Profil Fotoğrafı Yap"}
                                                </button>
                                                <button className="btn btn-secondary w-full" onClick={retakePhoto}>🔄 Yeniden Çek</button>
                                            </div>
                                        ) : (
                                            <button className="btn btn-secondary w-full" onClick={() => { stopCamera(); setPreviewPhoto(null); }}>❌ Vazgeç</button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <button className="btn btn-sm btn-secondary mt-24" onClick={() => { stopCamera(); setPreviewPhoto(null); setShowPhotoModal(false); }}>Kapat</button>
                        </div>
                    </div>
                )}

                {/* Reviews */}
                <div className="card mt-24">
                    <div className="section-header-profile" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h2 className="section-title2">⭐ Değerlendirmeler</h2>
                        {reviews.length > 0 && (
                            <span className="badge badge-warning" style={{ fontSize: 16 }}>
                                ⭐️ {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)} / 5
                            </span>
                        )}
                    </div>
                    <div className="reviews-list mt-16">
                        {reviews.length === 0 ? (
                            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Henüz bir değerlendirme yapılmamış.</p>
                        ) : (
                            reviews.map((r) => (
                                <div key={r.id} className="review-item" style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                        <span style={{ fontWeight: 700, color: "var(--primary-color)" }}>{r.jobTitle || "Değerlendirme"}</span>
                                        <span style={{ color: "var(--warning)" }}>{"⭐".repeat(r.rating)}</span>
                                    </div>
                                    <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>{r.comment || "Yorum yok."}</p>
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                        {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString("tr-TR") : (r.createdAt ? new Date(r.createdAt).toLocaleDateString("tr-TR") : "—")}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Company Action: Rate Student */}
                {!isOwnProfile && userProfile?.type === "company" && (
                    <div className="card mt-24">
                        <h2 className="section-title2">⭐ Öğrenciyi Değerlendir</h2>
                        <p className="text-muted" style={{ marginBottom: 16 }}>Bu öğrencinin performansını veya profilini değerlendirin:</p>
                        <div className="rating-form">
                            <div style={{ display: "flex", justifyContent: "center", gap: "10px", fontSize: "32px", marginBottom: "16px" }}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <span 
                                        key={star} 
                                        onClick={() => setRatingValue(star)} 
                                        style={{ cursor: "pointer", color: star <= ratingValue ? "#fbbf24" : "#475569" }}
                                    >
                                        ★
                                    </span>
                                ))}
                            </div>
                            <textarea
                                className="form-textarea"
                                placeholder="Öğrenci hakkında yorumunuzu buraya yazın..."
                                value={ratingComment}
                                onChange={e => setRatingComment(e.target.value)}
                                rows={3}
                            />
                            <button 
                                className="btn btn-primary" 
                                style={{ width: "100%", marginTop: "16px" }}
                                onClick={handleCompanyRating}
                                disabled={submittingRating}
                            >
                                {submittingRating ? "Gönderiliyor..." : "Değerlendirmeyi Kaydet"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Save/Cancel */}
                {editMode && (
                    <div className="profile-actions">
                        <button className="btn btn-secondary" onClick={() => setEditMode(false)}>İptal</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? "Kaydediliyor..." : "💾 Kaydet"}
                        </button>
                    </div>
                )}

                {/* Password Setting for Google Users */}
                {isOwnProfile && isGoogleSignIn && !hasPassword && !editMode && (
                    <div className="card mt-24">
                        <h2 className="section-title2">🔒 Şifre Belirle</h2>
                        <p className="text-muted" style={{ marginBottom: 16 }}>Google hesabınızla giriş yaptığınız için hesabınıza standart bir şifre de tanımlayabilirsiniz. E-posta ve belirlediğiniz şifreyle normal giriş de yapabilirsiniz.</p>
                        <div className="profile-form" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <div className="form-group" style={{ width: "100%", maxWidth: 500 }}>
                                <input
                                    type="password"
                                    className="form-input"
                                    style={{ textAlign: "center", padding: "12px", fontSize: "16px" }}
                                    placeholder="Yeni şifrenizi girin (En az 6 hane)"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                />
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={handleSetPassword}
                                disabled={settingPassword || newPassword.length < 6}
                                style={{ marginTop: 16, padding: "12px 32px", fontSize: "15px", width: "100%", maxWidth: 500 }}
                            >
                                {settingPassword ? "Kaydediliyor..." : "Şifreyi Kaydet"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Auth Error Modal */}
                {authErrorModal && (
                    <div className="modal-overlay" onClick={() => setAuthErrorModal(false)}>
                        <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: "center", padding: "32px 24px" }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
                            <h3 style={{ marginBottom: 12, color: "var(--warning)" }}>Oturum Süresi Doldu</h3>
                            <p style={{ color: "var(--text-secondary)", marginBottom: 24, fontSize: 15, lineHeight: 1.5 }}>
                                Güvenliğiniz için şifre belirlemeden önce kimliğinizi tekrar doğrulamamız gerekiyor. Lütfen çıkış yapıp tekrar giriş yapın.
                            </p>
                            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                                <button className="btn btn-secondary" onClick={() => setAuthErrorModal(false)}>İptal</button>
                                <button className="btn btn-primary" onClick={() => { logout(); window.location.href = '/login'; }}>Yeniden Giriş Yap</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Password Success Modal - logout button */}
                {passwordSuccessModal && (
                    <div className="modal-overlay">
                        <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, textAlign: "center", padding: "40px 28px" }}>
                            <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
                            <h3 style={{ marginBottom: 12, color: "var(--success)" }}>Şifre Başarıyla Belirlendi!</h3>
                            <p style={{ color: "var(--text-secondary)", marginBottom: 28, fontSize: 15, lineHeight: 1.6 }}>
                                Şifreniz güvenli şekilde kaydedildi. Güvenliğiniz için lütfen tekrar giriş yapın.
                            </p>
                            <button
                                className="btn btn-primary"
                                style={{ width: "100%", padding: "14px", fontSize: 16 }}
                                onClick={async () => { await logout(); window.location.href = '/login'; }}
                            >
                                🚪 Çıkış Yap ve Tekrar Giriş Yap
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function InfoItem({ icon, label, value, wide }) {
    return (
        <div className={`info-item ${wide ? "wide" : ""}`}>
            <p className="info-label">{icon} {label}</p>
            <p className="info-value">{value}</p>
        </div>
    );
}
