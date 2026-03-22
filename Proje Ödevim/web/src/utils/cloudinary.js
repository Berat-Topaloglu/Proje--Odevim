// Cloudinary Yapılandırması
export const CLOUDINARY_CONFIG = {
    cloudName: "dszitptag",
    uploadPreset: "ml_default", // Unsigned preset
    uploadUrl: "https://api.cloudinary.com/v1_1/dszitptag/auto/upload"
};

/**
 * Dosyayı Cloudinary'ye yükleyen yardımcı fonksiyon
 * @param {File} file - Yüklenecek dosya
 * @returns {Promise<string>} - Yüklenen dosyanın URL'si
 */
export const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);
    formData.append("cloud_name", CLOUDINARY_CONFIG.cloudName);

    // PDF ve diğer dökümanlar için 'raw' veya 'image' yerine 'auto' kullanıyoruz
    // Ancak Cloudinary'nin PDF'i 'image' olarak algılaması önizleme için bazen daha iyidir.
    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    try {
        const response = await fetch(CLOUDINARY_CONFIG.uploadUrl, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Cloudinary yükleme hatası");
        }

        const data = await response.json();
        let url = data.secure_url;

        // PDF görüntüleme sorununu çözmek için URL'ye müdahale ediyoruz:
        // 'fl_attachment' bayrağını kaldırıp tarayıcıda açılmasını sağlıyoruz.
        if (isPDF) {
            // Cloudinary URL'lerinde /upload/ kısmından sonra fl_inline veya fl_attachment:false eklenebilir.
            url = url.replace("/upload/", "/upload/fl_attachment:false/");
        }

        return url;
    } catch (err) {
        console.error("Cloudinary upload error:", err);
        throw err;
    }
};
