import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

// Cache for dynamic words from Firestore
let dynamicWords = [];
let dynamicPatterns = [];

// Listen for forbidden content updates
if (db) {
    onSnapshot(doc(db, "settings", "forbiddenContent"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            dynamicWords = data.words || [];
            dynamicPatterns = (data.patterns || []).map(p => {
                try {
                    // Convert string patterns back to RegExp
                    const match = p.match(/\/(.*)\/(.*)/);
                    return match ? new RegExp(match[1], match[2]) : new RegExp(p, "i");
                } catch (e) { return null; }
            }).filter(Boolean);
            console.log("Dinamik yasaklı kelime listesi güncellendi.");
        }
    });
}export const FORBIDDEN_WORDS = [
  // ================================================================
  // 🇹🇷 TÜRKÇE KÜFÜRLER — ANA FORMLAR
  // ================================================================
  "sik", "sikim", "siki", "sikik", "sikiş", "sikişmek",
  "sikerim", "sikeyim", "siktiğimin", "siktir", "siktirgit",
  "siktim", "siktirip", "siktir et", "siktirin", "siktirilmiş",
  "sikişmek", "sikmelik", "sikilmiş", "sikilmek",
  "orospu", "orospuçocuğu", "orosbu", "orosbuçocuğu",
  "oç", "o.ç", "o/ç",
  "amk", "amına", "amını", "amın", "amcık", "amına koyayım",
  "amına koyim", "amınakoyim", "amınakoyayım",
  "göt", "götlek", "götveren", "götü", "götten",
  "yarrak", "yarak", "taşak", "taşşak", "taşaklar",
  "piç", "piçlik", "piçin", "piçler",
  "bok", "boktan", "boka", "bok yemek", "boklaşmak",
  "ibne", "ibnelik", "ibneler",
  "puşt", "puştluk", "puştlar",
  "pezevenk", "pezevenklik",
  "kahpe", "kahpelik", "kahpeler",
  "kaltak", "kaltak karı",
  "sürtük", "fahişe", "şıllık", "şıllıklar",
  "haysiyetsiz", "şerefsiz", "şerefsizlik",
  "alçak", "alçaklar", "alçaklık",
  "gerizekalı", "gerzek", "salak", "aptal", "mal",
  "dangalak", "embesil", "ahmak", "budala", "avanak",
  "it", "itoğluit", "eşek", "katır", "domuz", "hayvan",
  "hıyar", "hıyarlar", "sümük",
  "ananı sikeyim", "babanı sikeyim", "ananı sikim",
  "anan ağlasın", "anan avradın",
  "götünü sikeyim", "götüne koyayım",
  "orospu evladı", "kahpe oğlu",
  "sik oğlu sik", "piç kurusu",
  "defol", "defol git", "sik git",

  // ================================================================
  // 🇹🇷 TÜRKÇE — LEET / KARAKTER DEĞİŞTİRME VARYANTLARI
  // ================================================================
  "s1k", "s!k", "s*k", "s.i.k", "s-i-k",
  "s1ktir", "s!ktir", "s*ktir",
  "am*", "a.m.k", "amk.", "a-m-k",
  "p1ç", "p!ç", "pic", "p*ç",
  "g0t", "g*t", "g.ö.t",
  "b0k", "b*k",
  "ib.ne", "ib*ne",
  "şr.fsz", "şerefsz",
  "orsp", "orspu", "0rospu",
  "sktrr", "sktir", "sktirr", "sktr",
  "amına koyym", "amınakoyym",
  "yarr4k", "yar*ak",

  // ================================================================
  // 🇬🇧🇺🇸 ENGLISH PROFANITY — CORE FORMS
  // ================================================================
  "fuck", "fucking", "fucker", "fucked", "fuckhead", "fucktard",
  "fuckwit", "fuckface", "motherfucker", "motherfucker",
  "shit", "shitty", "shithead", "shitface", "bullshit",
  "horseshit", "dogshit", "dipshit", "apeshit",
  "ass", "asshole", "asswipe", "jackass", "smartass", "dumbass",
  "bitch", "bitching", "bitchy", "son of a bitch",
  "bastard", "bastards",
  "cunt", "cunts",
  "dick", "dickhead", "dickface", "tiny dick",
  "cock", "cockhead", "cocksucker", "cocker",
  "pussy", "pussycat", "little pussy",
  "nigger", "nigga", "nigg3r",
  "faggot", "fag", "faggy",
  "whore", "whoring", "whorehouse",
  "slut", "slutty", "sluttish",
  "prick", "pricks",
  "twat", "twats",
  "wank", "wanker", "wanking",
  "jerk", "jerkoff", "jerk off",
  "retard", "retarded",
  "idiot", "imbecile", "moron", "dumbass", "dumb fuck",
  "kike", "spic", "chink", "gook", "wetback",
  "tranny", "shemale",
  "rape", "rapist",
  "kill yourself", "kys",
  "go fuck yourself", "gfy",
  "piece of shit", "pos",
  "holy shit", "oh shit",

  // ================================================================
  // 🇬🇧🇺🇸 ENGLISH — LEET / OBFUSCATION VARIANTS
  // ================================================================
  "f*ck", "f**k", "fu*k", "fck", "fuk", "f u c k",
  "f-u-c-k", "ph*ck", "phuck",
  "sh*t", "sh!t", "s.h.i.t", "shlt",
  "a$$", "a**", "a55",
  "b!tch", "b*tch", "bytch", "biatch",
  "d!ck", "d*ck", "dik",
  "c*nt", "c**t",
  "p*ssy", "pu55y",
  "n!gger", "n*gger", "n1gger", "nigg4",
  "wh0re", "wh*re",
  "sl*t", "s1ut",
  "r3tard", "ret@rd",
  "k*ke", "sp*c",

  // ================================================================
  // 🇷🇺 RUSÇA (RUSSIAN MAT) — CORE
  // ================================================================
  "блядь", "бляд", "блять",
  "пиздa", "пизда", "пездa",
  "хуй", "хуйло", "хуец",
  "ёбaный", "ёбаный", "ёб твою мать",
  "сука", "суки",
  "пидор", "пидорас",
  "мудак", "мудила",
  "залупа", "залупаться",
  "ёб", "ёбать", "ёбнуть",
  "выблядок", "выблядки",
  "иди нахуй", "нахуй",
  "шлюха", "шлюхи",
  "конченый", "конченая",
  "дрочить", "дрочила",
  "blyad", "blyat", "blyadt",
  "pizda", "pezdа",
  "khuy", "hui", "chuy",
  "yebany", "yob tvoyu mat",
  "suka", "pidor", "mudak",
  "shlyukha", "dрочила",
  "nahuy", "idi nahuy",

  // ================================================================
  // 🇩🇪 ALMANCA (GERMAN) — CORE
  // ================================================================
  "scheiße", "scheißkerl", "scheiß",
  "fick", "ficken", "gefickt", "fickt",
  "hurensohn", "hure", "nutte",
  "arschloch", "arsch", "arschgesicht",
  "wichser", "wichsen", "gewichst",
  "pisser", "pissen",
  "drecksau", "dreckig", "dreck",
  "verpiß dich", "verpiss dich",
  "wixer", "wixen",
  "Schlampe", "schlampe",
  "Fotze", "fotze",
  "Schwanz", "schwanz",
  "Vollidiot", "idiot", "volltrottel", "trottel",
  "Dummkopf", "blödmann",
  "Bastard", "mistkerl",

  // ================================================================
  // 🇫🇷 FRANSIZCA (FRENCH) — CORE
  // ================================================================
  "putain", "pute", "putes",
  "merde", "merder", "emmerdeur",
  "connard", "connards", "connasse",
  "salope", "salopes",
  "enculé", "encule", "enculer",
  "fils de pute", "fdp",
  "bâtard", "batard",
  "nique ta mère", "ntm",
  "ta gueule", "ferme ta gueule",
  "bordel", "foutaise",
  "branleur", "branler",
  "chier", "va te faire foutre",
  "con", "cons", "couillon",
  "cul", "trou du cul",
  "maudit", "ostie", "tabarnac", "crisse", "câlice",

  // ================================================================
  // 🇪🇸 İSPANYOLCA (SPANISH) — CORE
  // ================================================================
  "puta", "putas", "puto",
  "mierda", "mierdas",
  "coño", "cono",
  "joder", "jodido", "jodida",
  "cabrón", "cabron", "cabrona",
  "hostia", "hostias",
  "gilipollas", "gilipolla",
  "maricón", "maricon",
  "culo", "culos",
  "follar", "follando",
  "chinga", "chingada", "chingado", "chingarte",
  "pendejo", "pendejos",
  "culero", "culeros",
  "verga", "vergas",
  "mamón", "mamon",
  "pinche", "güey", "wey",
  "hijo de puta", "hdp",
  "la concha de tu madre",
  "vete a la mierda",

  // ================================================================
  // 🇮🇹 İTALYANCA (ITALIAN) — CORE
  // ================================================================
  "cazzo", "cazzi", "cazzata",
  "vaffanculo", "fanculo", "fancul",
  "stronzo", "stronzi", "stronza",
  "puttana", "puttane",
  "figlio di puttana",
  "merda", "merde",
  "coglione", "coglioni",
  "minchia", "minchiate",
  "bastardo", "bastardi",
  "testa di cazzo",
  "porco dio", "porco madonna",
  "troia", "troie",
  "fica", "fiche",
  "suca", "sucami",

  // ================================================================
  // 🇵🇹 PORTEKIZCE (PORTUGUESE) — CORE
  // ================================================================
  "porra", "porras",
  "caralho", "caralhos",
  "merda", "merdas",
  "foda", "fodase", "foda-se",
  "buceta", "bucetas",
  "viado", "viadão",
  "puta", "putas", "putaria",
  "cuzão", "cuzona",
  "arrombado", "arrombados",
  "desgraçado", "desgraçada",
  "seu merda", "vai se foder",
  "babaca", "babacas",
  "cacete", "cacetes",

  // ================================================================
  // 🇦🇪 ARAPÇA (ARABIC) — LATIN TRANSLİTERASYON
  // ================================================================
  "kess ommak", "kos omak",
  "ibn el sharmouta", "ibn sharmouta",
  "ayri feek", "ayri fik",
  "zebbi", "zeb",
  "sharmouta", "sharmuta",
  "khawal", "khawwad",
  "yil'an abu", "yil3an",
  "ayre feek", "ayre",
  "tiz", "teez",
  "manyak",
  "kalb ibn el", "kelb",

  // ================================================================
  // 🇮🇷 FARSÇA (PERSIAN) — LATIN TRANSLİTERASYON
  // ================================================================
  "kos", "kir", "kos kesh",
  "jende", "jendeh",
  "pedar sag", "pedar sug",
  "kos nanat", "koon",
  "nanat jendeh",
  "boro gom sho",
  "maderjaab", "madar",

  // ================================================================
  // 🌐 EVRENSEL / ÇOK DİLLİ HAKARET KALIPLARI
  // ================================================================
  "go to hell", "gtfo", "stfu",
  "eat shit", "eat a dick",
  "suck my dick", "smd",
  "kiss my ass", "kma",
  "nazi", "heil hitler",
  "white power", "white supremacy",
  "kkk",

  // ================================================================
  // 🔤 UNICODE / ÖZEL KARAKTER VARYANTLARI
  // ================================================================
  "f u c k", "s h i t", "b i t c h",
  "s i k", "a m k", "p i ç",
  "f.u.c.k", "s.h.i.t",
  "s.i.k", "a.m.k",
  "f-u-c-k", "s-h-i-t",
  "s-i-k", "a-m-k",
  "\u200bfuck", "\u200bsik"
];

// ================================================================
// REGEX PATTERN'LERİ — Leet speak ve gizleme için
// ================================================================
export const FORBIDDEN_PATTERNS = [
  // Türkçe
  /s[\W_]*[i1!|][\W_]*k/i,
  /a[\W_]*m[\W_]*[kq]/i,
  /[gğ][\W_]*[oö0][\W_]*t/i,
  /p[\W_]*[iı1!][\W_]*[çc]/i,
  /b[\W_]*[o0][\W_]*k/i,
  /y[\W_]*[a@][\W_]*r[\W_]*[a@][\W_]*k/i,
  /[oö0][\W_]*r[\W_]*[oö0][\W_]*s[\W_]*p[\W_]*u/i,

  // English
  /f[\W_]*u[\W_]*c[\W_]*k/i,
  /s[\W_]*h[\W_]*[i1!][\W_]*t/i,
  /[a@][\W_]*s[\W_]*s/i,
  /b[\W_]*[i1!][\W_]*t[\W_]*c[\W_]*h/i,
  /c[\W_]*u[\W_]*n[\W_]*t/i,
  /d[\W_]*[i1!][\W_]*c[\W_]*k/i,
  /n[\W_]*[i1!][\W_]*g[\W_]*g[\W_]*[ae3]/i,
  /w[\W_]*h[\W_]*[o0][\W_]*r[\W_]*e/i,
  /c[\W_]*[o0][\W_]*c[\W_]*k/i,
  /p[\W_]*u[\W_]*s[\W_]*s[\W_]*y/i,

  // Türk telefon numarası desenleri
  /0\s*[35][0-9]\s*[0-9]{3}\s*[0-9]{2}\s*[0-9]{2}/,
  /\+\s*9\s*0\s*[35][0-9]/,
];

// ================================================================
// YARDIMCI FONKSİYONLAR
// ================================================================

/**
 * Metni normalize eder: küçük harf, boşluk temizleme,
 * zero-width karakter temizleme, leet speak normalize
 */
export function normalizeText(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[\u200b\u200c\u200d\u00ad\ufeff]/g, "") // invisible chars
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ýÿ]/g, "y")
    .replace(/[ñ]/g, "n")
    .replace(/[@]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[0]/g, "o")
    .replace(/[1]/g, "i")
    .replace(/[5]/g, "s")
    .replace(/[4]/g, "a")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ana kontrol fonksiyonu
 * @param {string} text - Kontrol edilecek metin
 * @returns {{ isForbidden: boolean, matchedWord: string|null }}
 */
export function containsForbiddenContent(text) {
  if (!text) return { isForbidden: false, matchedWord: null };
  
  const normalized = normalizeText(text);
  const original = text.toLowerCase();
  
  const allWords = [...FORBIDDEN_WORDS, ...dynamicWords];
  const allPatterns = [...FORBIDDEN_PATTERNS, ...dynamicPatterns];

  // 1. Direkt kelime eşleşmesi (orijinal metin)
  for (const word of allWords) {
    if (original.includes(word.toLowerCase())) {
      return { isForbidden: true, matchedWord: word };
    }
  }

  // 2. Direkt kelime eşleşmesi (normalize edilmiş metin)
  for (const word of allWords) {
    if (normalized.includes(normalizeText(word))) {
      return { isForbidden: true, matchedWord: word };
    }
  }

  // 3. Regex pattern kontrolü
  for (const pattern of allPatterns) {
    if (pattern.test(normalized) || pattern.test(original)) {
      return { isForbidden: true, matchedWord: pattern.toString() };
    }
  }

  return { isForbidden: false, matchedWord: null };
}

/**
 * Metni sansürler — yasaklı kelimeleri *** ile değiştirir
 */
export function censorText(text) {
  if (!text) return "";
  let result = text;
  const allWords = [...FORBIDDEN_WORDS, ...dynamicWords];
  
  for (const word of allWords) {
    try {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "gi");
      result = result.replace(regex, "*".repeat(word.length));
    } catch (e) { continue; }
  }
  return result;
}
