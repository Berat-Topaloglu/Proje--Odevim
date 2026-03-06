import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
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


// Private Route Component
function PrivateRoute({ children, type }) {
  const { currentUser, userProfile } = useAuth();

  if (!currentUser) return <Navigate to="/login" />;

  if (type && userProfile && userProfile?.type !== type) {
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
  const { currentUser, userProfile } = useAuth();

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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
