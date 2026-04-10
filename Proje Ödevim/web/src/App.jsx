import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import Notification from "./components/shared/Notification";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import FloatingNavbar from "./components/layout/Navbar"; // was Navbar, now used as Floating Top Header
import Sidebar from "./components/layout/Sidebar";

// Lazy loaded pages
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const AuthAction = lazy(() => import("./pages/auth/AuthAction"));
const Jobs = lazy(() => import("./pages/Jobs"));
const JobDetail = lazy(() => import("./pages/JobDetail"));
const Messages = lazy(() => import("./pages/shared/Messages"));
const Notifications = lazy(() => import("./pages/shared/Notifications"));
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const StudentProfile = lazy(() => import("./pages/student/StudentProfile"));
const StudentApplications = lazy(() => import("./pages/student/StudentApplications"));
const CompanyDashboard = lazy(() => import("./pages/company/CompanyDashboard"));
const CompanyProfile = lazy(() => import("./pages/company/CompanyProfile"));
const PostJob = lazy(() => import("./pages/company/PostJob"));
const CompanyJobs = lazy(() => import("./pages/company/CompanyJobs"));
const Applicants = lazy(() => import("./pages/company/Applicants"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));

// Loading state
function PageLoader() {
    return (
        <div className="page-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
            <div style={{ textAlign: "center" }}>
                <div className="loading-spinner" style={{ margin: "0 auto 16px" }} />
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Yükleniyor...</p>
            </div>
        </div>
    );
}

// Private Route Component
function PrivateRoute({ children, type }) {
    const { currentUser, userProfile, isAdmin } = useAuth();

    if (!currentUser) return <Navigate to="/login" />;

    if (type === "admin" && !isAdmin) return <Navigate to="/" />;

    if (type && type !== "admin" && userProfile && userProfile?.type !== type) {
        return <Navigate to={userProfile?.type === "student" ? "/student/dashboard" : "/company/dashboard"} />;
    }

    return children;
}

// ================= LAYOUT ================= //
function MainLayout({ children }) {
    const { currentUser } = useAuth();
    
    return (
        <div className={`app-layout ${currentUser ? 'has-sidebar' : 'public-layout'}`}>
            {currentUser ? <Sidebar /> : <FloatingNavbar />}
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}

function AppContent() {
    const { isAdmin, systemSettings } = useAuth();

    if (systemSettings?.maintenance && !isAdmin) {
        return (
            <div className="page-wrapper min-h-screen flex items-center justify-center text-center p-8 bg-primary">
                <div className="card glass max-w-md p-12 border-primary animate-pulse">
                    <div className="mx-auto mb-6" style={{ width: 80, height: 80 }}>
                        <img src="/stajhub-icon.svg" alt="logo" className="w-full h-full drop-shadow-2xl" />
                    </div>
                    <h1 className="text-4xl mb-4">🔧 Sistem Bakımda</h1>
                    <p className="text-secondary mb-8">Sistem Kurucu tarafından bakıma alındı. Lütfen daha sonra tekrar deneyin.</p>
                    <div className="loading-spinner mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <Router>
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* Auth Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/auth/action" element={<AuthAction />} />

                    {/* Shared Public Routes */}
                    <Route path="/jobs" element={<MainLayout><Jobs /></MainLayout>} />
                    <Route path="/jobs/:id" element={<MainLayout><JobDetail /></MainLayout>} />
                    
                    {/* Home Redirect */}
                    <Route path="/" element={
                        <MainLayout>
                            <Navigate to="/jobs" />
                        </MainLayout>
                    } />

                    {/* Authenticated Routes */}
                    <Route path="/messages" element={<PrivateRoute><MainLayout><Messages /></MainLayout></PrivateRoute>} />
                    <Route path="/messages/:chatId" element={<PrivateRoute><MainLayout><Messages /></MainLayout></PrivateRoute>} />
                    <Route path="/notifications" element={<PrivateRoute><MainLayout><Notifications /></MainLayout></PrivateRoute>} />

                    <Route path="/student/dashboard" element={<PrivateRoute type="student"><MainLayout><StudentDashboard /></MainLayout></PrivateRoute>} />
                    <Route path="/student/profile" element={<PrivateRoute type="student"><MainLayout><StudentProfile /></MainLayout></PrivateRoute>} />
                    <Route path="/student/profile/:id" element={<PrivateRoute><MainLayout><StudentProfile /></MainLayout></PrivateRoute>} />
                    <Route path="/student/applications" element={<PrivateRoute type="student"><MainLayout><StudentApplications /></MainLayout></PrivateRoute>} />

                    <Route path="/company/dashboard" element={<PrivateRoute type="company"><MainLayout><CompanyDashboard /></MainLayout></PrivateRoute>} />
                    <Route path="/company/profile" element={<PrivateRoute type="company"><MainLayout><CompanyProfile /></MainLayout></PrivateRoute>} />
                    <Route path="/company/post-job" element={<PrivateRoute type="company"><MainLayout><PostJob /></MainLayout></PrivateRoute>} />
                    <Route path="/company/jobs" element={<PrivateRoute type="company"><MainLayout><CompanyJobs /></MainLayout></PrivateRoute>} />
                    <Route path="/company/jobs/:jobId/applicants" element={<PrivateRoute type="company"><MainLayout><Applicants /></MainLayout></PrivateRoute>} />

                    {/* Admin */}
                    <Route path="/admin" element={<PrivateRoute type="admin"><MainLayout><AdminDashboard /></MainLayout></PrivateRoute>} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Suspense>
        </Router>
    );
}

export default function App() {
    return (
        <ErrorBoundary>
            <NotificationProvider>
                <AuthProvider>
                    <Notification />
                    <AppContent />
                </AuthProvider>
            </NotificationProvider>
        </ErrorBoundary>
    );
}
