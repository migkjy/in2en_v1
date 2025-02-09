import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
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
import BranchList from "@/pages/branches/list";
import BranchDetail from "@/pages/branches/branch-detail";
import ClassList from "@/pages/classes/list";
import ClassDetail from "@/pages/classes/class-detail"; // Updated import
import TeacherList from "@/pages/teachers/list";
import TeacherDetail from "@/pages/teachers/teacher-detail";
import StudentList from "@/pages/students/list";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />

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

      {/* Teacher Routes */} 
      <ProtectedRoute 
        path="/teacher" 
        component={TeacherDashboard} 
        allowedRole="TEACHER"
      />
      <ProtectedRoute 
        path="/assignments/create" 
        component={CreateAssignment} 
        allowedRole="TEACHER"
      />
      <ProtectedRoute 
        path="/assignments/upload" 
        component={UploadAssignment} 
        allowedRole="TEACHER"
      />
      <ProtectedRoute 
        path="/assignments/review/:id" 
        component={ReviewAssignment} 
        allowedRole="TEACHER"
      />

      {/* Student Routes */}
      <ProtectedRoute 
        path="/student" 
        component={StudentDashboard} 
        allowedRole="STUDENT"
      />

      {/* Redirect to auth by default */}
      <Route path="/">
        <AuthPage />
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
