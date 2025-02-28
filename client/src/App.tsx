import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "./lib/protected-route";
import AdminDashboard from "@/pages/dashboard/admin";
import TeacherDashboard from "@/pages/dashboard/teacher";
import StudentDashboard from "@/pages/dashboard/student";
import CreateAssignment from "@/pages/assignments/create";
import ReviewAssignment from "@/pages/assignments/review";
import AssignmentList from "@/pages/assignments/list";
import AssignmentDetail from "@/pages/assignments/assignment-detail";
import UploadAssignment from "@/pages/assignments/upload";
import SubmissionDetail from "@/pages/submissions/submission-detail";
import ClassList from "@/pages/classes/list";
import ClassDetail from "@/pages/classes/class-detail";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />

      {/* Admin Routes */}
      <ProtectedRoute path="/admin" component={AdminDashboard} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/assignments" component={AssignmentList} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/assignments/create" component={CreateAssignment} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/assignments/:id" component={AssignmentDetail} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/assignments/review/:id/edit" component={ReviewAssignment} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/assignments/review/:id" component={ReviewAssignment} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/classes" component={ClassList} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/classes/:id" component={ClassDetail} allowedRole="ADMIN" />

      {/* Teacher Routes */}
      <ProtectedRoute path="/teacher" component={TeacherDashboard} allowedRole="TEACHER" />
      <ProtectedRoute path="/teacher/assignments" component={AssignmentList} allowedRole="TEACHER" />
      <ProtectedRoute path="/teacher/assignments/create" component={CreateAssignment} allowedRole="TEACHER" />
      <ProtectedRoute path="/teacher/assignments/:id" component={AssignmentDetail} allowedRole="TEACHER" />
      <ProtectedRoute path="/teacher/assignments/review/:id/edit" component={ReviewAssignment} allowedRole="TEACHER" />
      <ProtectedRoute path="/teacher/assignments/review/:id" component={ReviewAssignment} allowedRole="TEACHER" />
      <ProtectedRoute path="/teacher/classes" component={ClassList} allowedRole="TEACHER" />
      <ProtectedRoute path="/teacher/classes/:id" component={ClassDetail} allowedRole="TEACHER" />

      {/* Common Routes - Accessible by all authenticated users */}
      <ProtectedRoute path="/submissions/:id" component={SubmissionDetail} />
      <ProtectedRoute path="/assignments/:id/upload" component={UploadAssignment} allowedRole={["TEACHER", "ADMIN"]} />

      {/* Student Routes */}
      <ProtectedRoute path="/student" component={StudentDashboard} allowedRole="STUDENT" />

      {/* Redirect to auth by default */}
      <Route path="/">
        {() => {
          const role = localStorage.getItem("userRole");
          if (!role) return <Redirect to="/auth" />;

          switch (role) {
            case "ADMIN":
              return <Redirect to="/admin" />;
            case "TEACHER":
              return <Redirect to="/teacher" />;
            case "STUDENT":
              return <Redirect to="/student" />;
            default:
              return <Redirect to="/auth" />;
          }
        }}
      </Route>

      <Route component={NotFound} />
    </Switch>
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