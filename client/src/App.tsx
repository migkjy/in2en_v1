import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Suspense, lazy, useEffect } from 'react';
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Lazy loading components
const AuthPage = lazy(() => import("@/pages/auth-page"));
const AdminDashboard = lazy(() => import("@/pages/dashboard/admin"));
const TeacherDashboard = lazy(() => import("@/pages/dashboard/teacher"));
const StudentDashboard = lazy(() => import("@/pages/dashboard/student"));
const Profile = lazy(() => import("@/pages/profile"));
const AssignmentList = lazy(() => import("@/pages/assignments/list"));
const CreateAssignment = lazy(() => import("@/pages/assignments/create"));
const AssignmentDetail = lazy(() => import("@/pages/assignments/assignment-detail"));
const ReviewAssignment = lazy(() => import("@/pages/assignments/review"));
const UploadAssignment = lazy(() => import("@/pages/assignments/upload"));
const SubmissionDetail = lazy(() => import("@/pages/submissions/submission-detail"));
const ClassList = lazy(() => import("@/pages/classes/list"));
const ClassDetail = lazy(() => import("@/pages/classes/class-detail"));
const BranchList = lazy(() => import("@/pages/branches/list"));
const BranchDetail = lazy(() => import("@/pages/branches/detail"));
const TeacherList = lazy(() => import("@/pages/teachers/list"));
const TeacherDetail = lazy(() => import("@/pages/teachers/detail"));
const StudentList = lazy(() => import("@/pages/students/list"));
const NotFound = lazy(() => import("@/pages/not-found"));
const AdminAuthPage = lazy(() => import("@/pages/admin-auth-page"));

function ProtectedRoute({ component: Component, ...rest }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/auth');
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return user ? <Component {...rest} /> : null;
}

function Router() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      const homePath = 
        user.role === "ADMIN" ? "/admin" :
        user.role === "TEACHER" ? "/teacher" : "/student/assignments";
      setLocation(homePath);
    }
  }, [user, setLocation]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/admin/auth" component={AdminAuthPage} />

        {/* Common Routes */}
        <Route path="/assignments/:id/upload" component={(props) => <ProtectedRoute component={UploadAssignment} {...props} />} />
        <Route path="/assignments/:id" component={(props) => <ProtectedRoute component={AssignmentDetail} {...props} />} />
        <Route path="/submissions/:id" component={(props) => <ProtectedRoute component={SubmissionDetail} {...props} />} />

        {/* Admin Routes */}
        <Route path="/admin" component={(props) => <ProtectedRoute component={AdminDashboard} {...props} />} />
        <Route path="/admin/profile" component={(props) => <ProtectedRoute component={Profile} {...props} />} />
        <Route path="/admin/assignments/create" component={(props) => <ProtectedRoute component={CreateAssignment} {...props} />} />
        <Route path="/admin/assignments/review/:id" component={(props) => <ProtectedRoute component={ReviewAssignment} {...props} />} />
        <Route path="/admin/assignments/:id/upload" component={(props) => <ProtectedRoute component={UploadAssignment} {...props} />} />
        <Route path="/admin/assignments/:id" component={(props) => <ProtectedRoute component={AssignmentDetail} {...props} />} />
        <Route path="/admin/assignments" component={(props) => <ProtectedRoute component={AssignmentList} {...props} />} />
        <Route path="/admin/classes/:id" component={(props) => <ProtectedRoute component={ClassDetail} {...props} />} />
        <Route path="/admin/classes" component={(props) => <ProtectedRoute component={ClassList} {...props} />} />
        <Route path="/admin/branches/:id" component={(props) => <ProtectedRoute component={BranchDetail} {...props} />} />
        <Route path="/admin/branches" component={(props) => <ProtectedRoute component={BranchList} {...props} />} />
        <Route path="/admin/teachers/:id" component={(props) => <ProtectedRoute component={TeacherDetail} {...props} />} />
        <Route path="/admin/teachers" component={(props) => <ProtectedRoute component={TeacherList} {...props} />} />
        <Route path="/admin/students" component={(props) => <ProtectedRoute component={StudentList} {...props} />} />

        {/* Teacher Routes */}
        <Route path="/teacher" component={(props) => <ProtectedRoute component={TeacherDashboard} {...props} />} />
        <Route path="/teacher/profile" component={(props) => <ProtectedRoute component={Profile} {...props} />} />
        <Route path="/teacher/assignments/create" component={(props) => <ProtectedRoute component={CreateAssignment} {...props} />} />
        <Route path="/teacher/assignments/review/:id" component={(props) => <ProtectedRoute component={ReviewAssignment} {...props} />} />
        <Route path="/teacher/assignments/:id/upload" component={(props) => <ProtectedRoute component={UploadAssignment} {...props} />} />
        <Route path="/teacher/assignments/:id" component={(props) => <ProtectedRoute component={AssignmentDetail} {...props} />} />
        <Route path="/teacher/assignments" component={(props) => <ProtectedRoute component={AssignmentList} {...props} />} />
        <Route path="/teacher/classes/:id" component={(props) => <ProtectedRoute component={ClassDetail} {...props} />} />
        <Route path="/teacher/classes" component={(props) => <ProtectedRoute component={ClassList} {...props} />} />

        {/* Student Routes */}
        <Route path="/student/profile" component={(props) => <ProtectedRoute component={Profile} {...props} />} />
        <Route path="/student/assignments/:id/upload" component={(props) => <ProtectedRoute component={UploadAssignment} {...props} />} />
        <Route path="/student/assignments/:id" component={(props) => <ProtectedRoute component={AssignmentDetail} {...props} />} />
        <Route path="/student/assignments" component={(props) => <ProtectedRoute component={AssignmentList} {...props} />} />
        <Route path="/student/submissions/:id" component={(props) => <ProtectedRoute component={SubmissionDetail} {...props} />} />
        <Route path="/student/classes/:id" component={(props) => <ProtectedRoute component={ClassDetail} {...props} />} />
        <Route path="/student/classes" component={(props) => <ProtectedRoute component={ClassList} {...props} />} />

        {/* Root Route */}
        <Route path="/" component={() => {
          if (!user) {
            setLocation('/auth');
            return null;
          }
          return null;
        }} />

        {/* Not found route */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;