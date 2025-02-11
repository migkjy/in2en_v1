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
import UploadAssignment from "@/pages/assignments/upload";
import ReviewAssignment from "@/pages/assignments/review";
import AssignmentList from "@/pages/assignments/list";
import AssignmentDetail from "@/pages/assignments/assignment-detail";
import BranchList from "@/pages/branches/list";
import BranchDetail from "@/pages/branches/branch-detail";
import ClassList from "@/pages/classes/list";
import ClassDetail from "@/pages/classes/class-detail";
import TeacherList from "@/pages/teachers/list";
import TeacherDetail from "@/pages/teachers/teacher-detail";
import StudentList from "@/pages/students/list";
import SubmissionDetail from "@/pages/submissions/submission-detail";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />

      {/* Submission Detail Route - Accessible by all authenticated users */}
      <ProtectedRoute 
        path="/submissions/:id"
        component={SubmissionDetail}
        allowedRole={["STUDENT", "TEACHER", "ADMIN"]}
      />

      {/* Admin Routes */}
      <ProtectedRoute 
        path="/admin" 
        component={AdminDashboard} 
        allowedRole="ADMIN"
      />
      <ProtectedRoute 
        path="/admin/branches" 
        component={BranchList} 
        allowedRole="ADMIN"
      />
      <ProtectedRoute 
        path="/admin/branches/:id"
        component={BranchDetail}
        allowedRole="ADMIN"
      />
      <ProtectedRoute 
        path="/admin/classes"
        component={ClassList}
        allowedRole="ADMIN"
      />
      <ProtectedRoute 
        path="/admin/classes/:id"
        component={ClassDetail}
        allowedRole="ADMIN"
      />
      <ProtectedRoute 
        path="/admin/teachers"
        component={TeacherList}
        allowedRole="ADMIN"
      />
      <ProtectedRoute 
        path="/admin/teachers/:id"
        component={TeacherDetail}
        allowedRole="ADMIN"
      />
      <ProtectedRoute 
        path="/admin/students"
        component={StudentList}
        allowedRole="ADMIN"
      />
      <ProtectedRoute 
        path="/admin/assignments"
        component={AssignmentList}
        allowedRole="ADMIN"
      />
      <ProtectedRoute 
        path="/admin/assignments/create"
        component={CreateAssignment}
        allowedRole="ADMIN"
      />

      {/* Teacher Routes */} 
      <ProtectedRoute 
        path="/teacher" 
        component={TeacherDashboard} 
        allowedRole="TEACHER"
      />
      <ProtectedRoute 
        path="/teacher/assignments"
        component={AssignmentList}
        allowedRole="TEACHER"
      />
      <ProtectedRoute 
        path="/teacher/assignments/create" 
        component={CreateAssignment} 
        allowedRole="TEACHER"
      />

      {/* Common Routes - Accessible by both Teacher and Admin */}
      <ProtectedRoute 
        path="/assignments/:id"
        component={AssignmentDetail}
        allowedRole={["TEACHER", "ADMIN"]}
      />
      <ProtectedRoute 
        path="/assignments/:id/upload"
        component={UploadAssignment}
        allowedRole={["TEACHER", "ADMIN"]}
      />

      {/* Handle /assignments/review/:id path */}
      <Route path="/assignments/review/:id">
        {(params) => {
          const role = localStorage.getItem("userRole");
          if (role !== "ADMIN" && role !== "TEACHER") {
            return <Redirect to="/" />;
          }
          if (!params?.id || isNaN(parseInt(params.id, 10))) {
            return <Redirect to={role === "ADMIN" ? "/admin/assignments" : "/teacher/assignments"} />;
          }
          return <ReviewAssignment />;
        }}
      </Route>

      {/* Handle /assignments/review path - Immediate redirect */}
      <Route path="/assignments/review">
        {() => {
          const role = localStorage.getItem("userRole");
          return (
            <Redirect 
              to={
                role === "ADMIN" 
                  ? "/admin/assignments" 
                  : role === "TEACHER" 
                  ? "/teacher/assignments"
                  : "/"
              } 
            />
          );
        }}
      </Route>

      {/* Student Routes */}
      <ProtectedRoute 
        path="/student" 
        component={StudentDashboard} 
        allowedRole="STUDENT"
      />

      {/* Redirect to auth by default */}
      <Route path="/">
        {() => {
          const role = localStorage.getItem("userRole");
          if (!role) return <AuthPage />;

          switch (role) {
            case "ADMIN":
              return <Redirect to="/admin" />;
            case "TEACHER":
              return <Redirect to="/teacher" />;
            case "STUDENT":
              return <Redirect to="/student" />;
            default:
              return <AuthPage />;
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