// Mobile Cloudinary Configuration
export const CLOUDINARY_CONFIG = {
    cloudName: "dszitptag",
    uploadPreset: "ml_default",
    uploadUrl: "https://api.cloudinary.com/v1_1/dszitptag/auto/upload"
};

/**
 * Dosyayı Cloudinary'ye yükleyen yardımcı fonksiyon (React Native için)
 * @param {any} fileUri - Dosyanın yerel URI'si
 * @param {string} fileName - Dosya adı
 * @param {string} fileType - Dosya tipi
 * @returns {Promise<string>} - Yüklenen dosyanın URL'si
 */
export const uploadToCloudinary = async (fileUri, fileName, fileType) => {
    const formData = new FormData();
    formData.append("file", {
        uri: fileUri,
        type: fileType || "image/jpeg",
        name: fileName || "upload.jpg",
    });
    formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

    try {
        const response = await fetch(CLOUDINARY_CONFIG.uploadUrl, {
            method: "POST",
            body: formData,
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Cloudinary error detail:", errorData);
            throw new Error("Cloudinary yükleme hatası");
        }

        const data = await response.json();
        return data.secure_url;
    } catch (err) {
        console.error("Cloudinary upload error:", err);
        throw err;
    }
};
