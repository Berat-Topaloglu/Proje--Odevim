import React, { useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import {
  TextInput,
  Button,
  Text,
  Surface,
  HelperText,
  IconButton,
} from "react-native-paper";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useAuth } from "../../src/context/AuthContext";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../src/firebase/config";

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Type specific states
  const [university, setUniversity] = useState("");
  const [department, setDepartment] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [sector, setSector] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);

  const { register, loginWithGoogle, completeGoogleRegistration } = useAuth();
  const router = useRouter();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: "550310950985-tkm13mfksfu0mgdqnudfa4lcbivimksf.apps.googleusercontent.com",
    iosClientId: "550310950985-ios-actual-id.apps.googleusercontent.com",
    androidClientId: "550310950985-android-actual-id.apps.googleusercontent.com",
  });

  React.useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      handleGoogleAuth(id_token);
    }
  }, [response]);

  const handleGoogleAuth = async (idToken) => {
    setLoading(true);
    try {
      const userCredential = await loginWithGoogle(idToken);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        // Already registered
        router.replace("/(tabs)");
      } else {
        // New user - stay on Step 1 but mark as Google
        setGoogleUser(user);
        setIsGoogleUser(true);
        setDisplayName(user.displayName || "");
        setEmail(user.email || "");
      }
    } catch (err) {
      setError("Google ile işlem yapılamadı: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleFinalize = async (type) => {
    setLoading(true);
    try {
      await completeGoogleRegistration(googleUser, type);
      router.replace("/(tabs)");
    } catch (err) {
      setError("Profil tamamlanamadı: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (
      !displayName ||
      !email ||
      !password ||
      !confirmPassword ||
      !phoneNumber
    ) {
      setError("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const extraData = {
        phoneNumber,
        university,
        department,
        graduationYear: gradYear,
        sector,
        website,
        address,
      };
      await register(email, password, displayName, userType, extraData);
      router.replace("/(tabs)");
    } catch (err) {
      setError("Kayıt sırasında bir hata oluştu: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <View style={styles.container}>
        <View style={styles.centeredContent}>
          <View style={styles.headerCentered}>
            <Text variant="headlineMedium" style={styles.title}>
              Nasıl Katılıyorsun?
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Sana en uygun hesap türünü seç
            </Text>
          </View>

          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={styles.typeCard}
              onPress={async () => {
                if (isGoogleUser) {
                  await handleGoogleFinalize("student");
                } else {
                  setUserType("student");
                  setStep(2);
                }
              }}
            >
              <Surface style={styles.typeSurface} elevation={2}>
                <Text style={styles.typeIcon}>🎓</Text>
                <Text style={styles.typeTitle}>Öğrenci</Text>
                <Text style={styles.typeDesc}>
                  Staj ilanlarına göz at ve başvur
                </Text>
              </Surface>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.typeCard}
              onPress={async () => {
                if (isGoogleUser) {
                  await handleGoogleFinalize("company");
                } else {
                  setUserType("company");
                  setStep(2);
                }
              }}
            >
              <Surface style={styles.typeSurface} elevation={2}>
                <Text style={styles.typeIcon}>🏢</Text>
                <Text style={styles.typeTitle}>Şirket</Text>
                <Text style={styles.typeDesc}>Stajer ilanı ver, aday bul</Text>
              </Surface>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.backToLogin}
            onPress={() => router.back()}
          >
            <Text style={styles.footerMessage}>
              Zaten hesabın var mı? <Text style={styles.link}>Giriş Yap</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <IconButton
          icon="arrow-left"
          iconColor="white"
          size={30}
          onPress={() => setStep(1)}
          style={styles.backButton}
        />

        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            {userType === "student" ? "Öğrenci Kaydı" : "Şirket Kaydı"}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Siber-Premium deneyim için tüm bilgileri girin
          </Text>
        </View>

        <Surface style={styles.card} elevation={2}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TextInput
            label={userType === "student" ? "Ad Soyad *" : "Şirket Adı *"}
            value={displayName}
            onChangeText={setDisplayName}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="E-posta *"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <TextInput
            label="Telefon Numarası *"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
            placeholder="05xx xxx xx xx"
          />

          {userType === "student" ? (
            <>
              <TextInput
                label="Üniversite"
                value={university}
                onChangeText={setUniversity}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Bölüm"
                value={department}
                onChangeText={setDepartment}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Mezuniyet Yılı"
                value={gradYear}
                onChangeText={setGradYear}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
              />
            </>
          ) : (
            <>
              <TextInput
                label="Sektör"
                value={sector}
                onChangeText={setSector}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Web Sitesi"
                value={website}
                onChangeText={setWebsite}
                mode="outlined"
                autoCapitalize="none"
                style={styles.input}
                placeholder="https://..."
              />
              <TextInput
                label="Adres / Şehir"
                value={address}
                onChangeText={setAddress}
                mode="outlined"
                style={styles.input}
              />
            </>
          )}

          <TextInput
            label="Şifre *"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />

          <TextInput
            label="Şifre Onay *"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Hesap Oluştur
          </Button>
          {!isGoogleUser && (
            <Button
              mode="outlined"
              onPress={() => promptAsync()}
              disabled={loading || !request}
              style={[styles.button, styles.googleButton, { marginTop: 20 }]}
              contentStyle={styles.buttonContent}
              icon="google"
              textColor="#4285F4"
            >
              Google ile Kayıt Ol
            </Button>
          )}
        </Surface>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f1a",
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 0,
    zIndex: 1,
  },
  header: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 40,
  },
  headerCentered: {
    alignItems: "center",
    marginBottom: 40,
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    color: "white",
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#94a3b8",
    textAlign: "center",
  },
  typeContainer: {
    flexDirection: "row",
    gap: 15,
  },
  typeCard: {
    flex: 1,
  },
  typeSurface: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#16213e",
    alignItems: "center",
    height: 180,
    justifyContent: "center",
  },
  typeIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  typeTitle: {
    color: "white",
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 5,
  },
  typeDesc: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
  },
  card: {
    padding: 25,
    borderRadius: 20,
    backgroundColor: "#16213e",
  },
  input: {
    marginBottom: 15,
    backgroundColor: "transparent",
  },
  button: {
    marginTop: 10,
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  errorText: {
    color: "#ef4444",
    marginBottom: 15,
    textAlign: "center",
  },
  backToLogin: {
    marginTop: 40, // Fixed distance under the cards
    alignItems: "center",
  },
  footerMessage: {
    color: "white",
    fontWeight: "500",
  },
  link: {
    color: "#6366f1",
    fontWeight: "700",
  },
  googleButton: {
    backgroundColor: "white",
    borderColor: "#4285F4",
    borderWidth: 1,
  },
});
