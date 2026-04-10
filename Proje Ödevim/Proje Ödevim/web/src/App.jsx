import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import Notification from "./components/shared/Notification";
import Navbar from "./components/layout/Navbar";

// Auth Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import AuthAction from "./pages/auth/AuthAction";

// Shared Pages
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import Messages from "./pages/shared/Messages";
import Notifications from "./pages/shared/Notifications";

// Student Pages
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentProfile from "./pages/student/StudentProfile";
import StudentApplications from "./pages/student/StudentApplications";

// Company Pages
import CompanyDashboard from "./pages/company/CompanyDashboard";
import CompanyProfile from "./pages/company/CompanyProfile";
import PostJob from "./pages/company/PostJob";
import CompanyJobs from "./pages/company/CompanyJobs";
import Applicants from "./pages/company/Applicants";
import AdminDashboard from "./pages/admin/AdminDashboard";


// Private Route Component
function PrivateRoute({ children, type }) {
  const { currentUser, userProfile, isAdmin } = useAuth();

  if (!currentUser) return <Navigate to="/login" />;

  // Admin access check for specifically admin-only routes
  if (type === "admin" && !isAdmin) {
    return <Navigate to="/" />;
  }

  // Role based redirection (for dual-role users)
  if (type && type !== "admin" && userProfile && userProfile?.type !== type) {
    return <Navigate to={userProfile?.type === "student" ? "/student/dashboard" : "/company/dashboard"} />;
  }

  return children;
}

function MainLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

function AppContent() {
  const { currentUser, userProfile, isAdmin, systemSettings } = useAuth();

  if (systemSettings?.maintenance && !isAdmin) {
    return (
      <div 
        className="flex items-center justify-center text-center p-4 bg-primary"
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          zIndex: 9999,
          backgroundColor: 'var(--bg-primary)'
        }}
      >
        <div className="card-glass p-10 border-primary flex flex-col items-center justify-center sm:p-14" style={{ minHeight: '850px', width: '95%' }}>
          <div className="mb-10" style={{ width: 125, height: 140 }}>
            <img src="/stajhub-icon.svg" alt="logo" className="w-full h-full drop-shadow-[0_0_20px_rgba(var(--primary-rgb),0.6)]" />
          </div>
          <h2 className="text-5xl font-black tracking-tighter mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            StajHub
          </h2>
          <h1 className="text-4xl font-bold mb-8 flex items-center gap-2">
            <span role="img" aria-label="lock">🔒</span> Sistem Bakımda
          </h1>
          <p className="text-secondary mb-8 text-lg font-medium opacity-80">
            Sistem Kurucu tarafından bakıma alındı. <br /> Lütfen daha sonra tekrar deneyin.
          </p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/action" element={<AuthAction />} />

        {/* Home Redirect */}
        <Route path="/" element={
          currentUser ? (
              userProfile?.type === "student" ?
                <Navigate to="/student/dashboard" /> :
                <Navigate to="/company/dashboard" />
          ) : <Navigate to="/jobs" />
        } />

        {/* Shared Public/Auth Routes */}
        <Route path="/jobs" element={<MainLayout><Jobs /></MainLayout>} />
        <Route path="/jobs/:id" element={<MainLayout><JobDetail /></MainLayout>} />
        <Route path="/messages" element={
          <PrivateRoute>
            <MainLayout><Messages /></MainLayout>
          </PrivateRoute>
        } />
        <Route path="/messages/:chatId" element={
          <PrivateRoute>
            <MainLayout><Messages /></MainLayout>
          </PrivateRoute>
        } />
        <Route path="/notifications" element={
          <PrivateRoute>
            <MainLayout><Notifications /></MainLayout>
          </PrivateRoute>
        } />

        {/* Student Routes */}
        <Route path="/student/dashboard" element={
          <PrivateRoute type="student">
            <MainLayout><StudentDashboard /></MainLayout>
          </PrivateRoute>
        } />
        <Route path="/student/profile" element={
          <PrivateRoute type="student">
            <MainLayout><StudentProfile /></MainLayout>
          </PrivateRoute>
        } />
        <Route path="/student/profile/:id" element={
          <PrivateRoute>
            <MainLayout><StudentProfile /></MainLayout>
          </PrivateRoute>
        } />
        <Route path="/student/applications" element={
          <PrivateRoute type="student">
            <MainLayout><StudentApplications /></MainLayout>
          </PrivateRoute>
        } />

        {/* Company Routes */}
        <Route path="/company/dashboard" element={
          <PrivateRoute type="company">
            <MainLayout><CompanyDashboard /></MainLayout>
          </PrivateRoute>
        } />
        <Route path="/company/profile" element={
          <PrivateRoute type="company">
            <MainLayout><CompanyProfile /></MainLayout>
          </PrivateRoute>
        } />
        <Route path="/company/post-job" element={
          <PrivateRoute type="company">
            <MainLayout><PostJob /></MainLayout>
          </PrivateRoute>
        } />
        <Route path="/company/jobs" element={
          <PrivateRoute type="company">
            <MainLayout><CompanyJobs /></MainLayout>
          </PrivateRoute>
        } />
        <Route path="/company/jobs/:jobId/applicants" element={
          <PrivateRoute type="company">
            <MainLayout><Applicants /></MainLayout>
          </PrivateRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <PrivateRoute type="admin">
            <MainLayout><AdminDashboard /></MainLayout>
          </PrivateRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <Notification />
        <AppContent />
      </AuthProvider>
    </NotificationProvider>
  );
}
