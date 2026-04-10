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
export const uploadToCloudinary = async (file, resourceType = "auto") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);
    formData.append("cloud_name", CLOUDINARY_CONFIG.cloudName);

    try {
        // PDF'ler için 'image' resource_type kullanmak, Cloudinary'nin önizleme sunmasını sağlar.
        // Ancak 'auto' genellikle en güvenlisidir. 
        const response = await fetch(CLOUDINARY_CONFIG.uploadUrl.replace("/auto/", `/${resourceType}/`), {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Cloudinary error details:", errorData);
            throw new Error(errorData.error?.message || "Cloudinary yükleme hatası");
        }

        const data = await response.json();
        let url = data.secure_url;

        // PDF dosyaları için tarayıcı önizlemesini zorlamak adına URL manipülasyonu
        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
            // Eğer URL'de uzantı yoksa ekle veya Cloudinary viewer'ı tetikle
            if (!url.toLowerCase().endsWith(".pdf")) {
                url = url.replace(/\/v\d+\//, "$&").replace(/upload\//, "upload/fl_attachment:false/");
            }
        }

        return url;
    } catch (err) {
        console.error("Cloudinary upload error:", err);
        throw err;
    }
};
