/**
 * StajHub — Ortak Yardımcı Fonksiyonlar
 * Tekrar eden utility fonksiyonlar burada tanımlanır.
 */

/**
 * Firestore Timestamp, ISO Date string veya Date objesini millisaniyeye çevirir.
 * Güvenli sıralama ve tarih karşılaştırması için kullanılır.
 * @param {*} val - Firestore timestamp, ISO string veya Date
 * @returns {number} - Milisaniye cinsinden zaman
 */
export function getTimestamp(val) {
    if (!val) return 0;
    if (val.toMillis) return val.toMillis(); // Firestore Timestamp
    if (val.seconds) return val.seconds * 1000; // Firestore Timestamp fallback
    const d = new Date(val).getTime();
    return isNaN(d) ? 0 : d;
}

/**
 * İsimden baş harfleri çıkarır (Avatar gösterimi için)
 * @param {string} name - İsim veya e-posta
 * @returns {string} - En fazla 2 karakter baş harf
 */
export function getInitials(name) {
    if (!name) return "?";
    return name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Tarihi Türkçe locale ile biçimlendirir.
 * @param {*} val - Firestore timestamp, ISO string veya Date
 * @param {string} locale - Dil kodu (varsayılan: "tr-TR")
 * @returns {string} - Biçimlendirilmiş tarih string'i
 */
export function formatDate(val, locale = "tr-TR") {
    if (!val) return "—";
    try {
        if (val.toDate) return val.toDate().toLocaleDateString(locale);
        const d = new Date(val);
        return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(locale);
    } catch {
        return "—";
    }
}

/**
 * Zaman damgasına göre sıralama (en yeniden eskiye)
 * Array.sort() için kullanılır: array.sort(sortByDateDesc)
 * @param {object} a - createdAt alanı olan obje
 * @param {object} b - createdAt alanı olan obje
 * @returns {number}
 */
export function sortByDateDesc(a, b) {
    return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
}
