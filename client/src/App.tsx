import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import React, { lazy, Suspense } from 'react';

// Lazy loading components - these are not needed anymore as we are using the new import method in the edited code
//const LazyComponent = (Component) => (props) => (
//  <Suspense fallback={<div>Loading...</div>}>
//    <Component {...props} />
//  </Suspense>
//);

//Lazy loading components are handled differently in the edited code.
import { LazyComponent } from "@/lib/lazy-component";
import { ProtectedRoute } from "@/lib/protected-route";

const LazyAdminDashboard = () => import("@/pages/dashboard/admin");
const LazyTeacherDashboard = () => import("@/pages/dashboard/teacher");
const LazyStudentDashboard = () => import("@/pages/dashboard/student");
const LazyProfile = () => import("@/pages/profile");
const LazyAssignmentList = () => import("@/pages/assignments/list");
const LazyCreateAssignment = () => import("@/pages/assignments/create");
const LazyAssignmentDetail = () => import("@/pages/assignments/assignment-detail");
const LazyReviewAssignment = () => import("@/pages/assignments/review");
const LazyUploadAssignment = () => import("@/pages/assignments/upload");
const LazySubmissionDetail = () => import("@/pages/submissions/submission-detail");
const LazyClassList = () => import("@/pages/classes/list");
const LazyClassDetail = () => import("@/pages/classes/class-detail");
const LazyBranchList = () => import("@/pages/branches/list");
const LazyBranchDetail = () => import("@/pages/branches/detail");
const LazyTeacherList = () => import("@/pages/teachers/list");
const LazyTeacherDetail = () => import("@/pages/teachers/detail");
const LazyStudentList = () => import("@/pages/students/list");
const AuthPage = () => import("@/pages/auth-page");
const NotFound = () => import("@/pages/not-found");


function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />

      {/* Admin Routes */}
      <ProtectedRoute path="/admin" component={LazyComponent(LazyAdminDashboard)} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/profile" component={LazyComponent(LazyProfile)} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/assignments" component={LazyComponent(LazyAssignmentList)} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/assignments/create" component={LazyComponent(LazyCreateAssignment)} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/assignments/:id" component={LazyComponent(LazyAssignmentDetail)} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/assignments/review/:id/edit" component={LazyComponent(LazyReviewAssignment)} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/assignments/review/:id" component={LazyComponent(LazyReviewAssignment)} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/classes" component={LazyComponent(LazyClassList)} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/classes/:id" component={LazyComponent(LazyClassDetail)} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/branches" component={LazyComponent(LazyBranchList)} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/branches/:id" component={LazyComponent(LazyBranchDetail)} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/teachers" component={LazyComponent(LazyTeacherList)} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/teachers/:id" component={LazyComponent(LazyTeacherDetail)} allowedRole="ADMIN" />
      <ProtectedRoute path="/admin/students" component={LazyComponent(LazyStudentList)} allowedRole="ADMIN" />

      {/* Teacher Routes */}
      <ProtectedRoute path="/teacher" component={LazyComponent(LazyTeacherDashboard)} allowedRole="TEACHER" />
      <ProtectedRoute path="/teacher/profile" component={LazyComponent(LazyProfile)} allowedRole="TEACHER" />
      <ProtectedRoute path="/teacher/assignments" component={LazyComponent(LazyAssignmentList)} allowedRole="TEACHER" />
      <ProtectedRoute path="/teacher/assignments/create" component={LazyComponent(LazyCreateAssignment)} allowedRole="TEACHER" />
      <ProtectedRoute path="/teacher/assignments/:id" component={LazyComponent(LazyAssignmentDetail)} allowedRole="TEACHER" />
      <ProtectedRoute path="/teacher/assignments/review/:id/edit" component={LazyComponent(LazyReviewAssignment)} allowedRole="TEACHER" />
      <ProtectedRoute path="/teacher/assignments/review/:id" component={LazyComponent(LazyReviewAssignment)} allowedRole="TEACHER" />
      <ProtectedRoute path="/teacher/classes" component={LazyComponent(LazyClassList)} allowedRole="TEACHER" />
      <ProtectedRoute path="/teacher/classes/:id" component={LazyComponent(LazyClassDetail)} allowedRole="TEACHER" />

      {/* Student Routes */}
      <ProtectedRoute path="/student" component={LazyComponent(LazyStudentDashboard)} allowedRole="STUDENT" />
      <ProtectedRoute path="/student/profile" component={LazyComponent(LazyProfile)} allowedRole="STUDENT" />
      <ProtectedRoute path="/student/assignments" component={LazyComponent(LazyAssignmentList)} allowedRole="STUDENT" />
      <ProtectedRoute path="/student/assignments/:id" component={LazyComponent(LazyAssignmentDetail)} allowedRole="STUDENT" />
      <ProtectedRoute path="/student/assignments/upload/:id" component={LazyComponent(LazyUploadAssignment)} allowedRole="STUDENT" />
      <ProtectedRoute path="/student/submissions/:id" component={LazyComponent(LazySubmissionDetail)} allowedRole="STUDENT" />
      <ProtectedRoute path="/student/classes" component={LazyComponent(LazyClassList)} allowedRole="STUDENT" />
      <ProtectedRoute path="/student/classes/:id" component={LazyComponent(LazyClassDetail)} allowedRole="STUDENT" />

      {/* Common Routes - Accessible by all authenticated users */}
      <ProtectedRoute path="/submissions/:id" component={LazyComponent(LazySubmissionDetail)} />
      <ProtectedRoute path="/assignments/:id/upload" component={LazyComponent(LazyUploadAssignment)} allowedRole={["TEACHER", "ADMIN"]} />

      {/* Default route - redirect to appropriate dashboard based on role */}
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

      {/* Not found route */}
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