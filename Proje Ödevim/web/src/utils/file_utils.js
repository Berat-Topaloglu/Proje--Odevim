/**
 * CV Görüntüleme ve İndirme için temizlik yapar.
 * Artık veritabanında doğrudan Base64 veya ham URL saklandığı için 
 * Cloudinary transformasyonlarına ihtiyacımız yok.
 */
export const getSafeCvUrl = (url) => {
    if (!url) return "";
    // Cloudinary ise önbellek kırmak için timestamp ekle, değilse (Base64) olduğu gibi döndür
    if (url.includes("cloudinary.com")) {
        return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
    }
    return url;
};

export const getDownloadCvUrl = (url) => {
    if (!url) return "";
    
    // Cloudinary ise attachment flag'i ekle
    if (url.includes("cloudinary.com") && url.includes("/upload/")) {
        return url.replace("/upload/", "/upload/fl_attachment/");
    }
    
    // Base64 dosyaları için doğrudan link indirilebilir
    return url;
};
