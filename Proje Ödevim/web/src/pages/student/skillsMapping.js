/**
 * Bölüm → Beceri eşleştirme haritası
 * StudentProfile'dan ayrılarak modüler hale getirildi
 */
export const SKILLS_MAPPING = {
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
    "iç mimarlık": ["AutoCAD", "SketchUp", "3ds Max", "Revit", "V-Ray", "Photoshop", "Mobilya Tasarımı", "Aydınlatma Tasarımı", "Malzeme Bilimi"],
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
