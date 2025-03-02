import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "./lib/protected-route";
import React, { lazy, Suspense } from 'react';

// Lazy loading components
const LazyComponent = (Component) => (props) => (
  <Suspense fallback={<div>Loading...</div>}>
    <Component {...props} />
  </Suspense>
);

const LazyAdminDashboard = lazy(() => import(/* webpackChunkName: "admin-dashboard" */ "@/pages/dashboard/admin"));
const LazyTeacherDashboard = lazy(() => import(/* webpackChunkName: "teacher-dashboard" */ "@/pages/dashboard/teacher"));
const LazyStudentDashboard = lazy(() => import(/* webpackChunkName: "student-dashboard" */ "@/pages/dashboard/student"));
const LazyCreateAssignment = lazy(() => import(/* webpackChunkName: "create-assignment" */ "@/pages/assignments/create"));
const LazyReviewAssignment = lazy(() => import(/* webpackChunkName: "review-assignment" */ "@/pages/assignments/review"));
const LazyAssignmentList = lazy(() => import(/* webpackChunkName: "assignment-list" */ "@/pages/assignments/list"));
const LazyAssignmentDetail = lazy(() => import(/* webpackChunkName: "assignment-detail" */ "@/pages/assignments/assignment-detail"));
const LazyUploadAssignment = lazy(() => import(/* webpackChunkName: "upload-assignment" */ "@/pages/assignments/upload"));
const LazySubmissionDetail = lazy(() => import(/* webpackChunkName: "submission-detail" */ "@/pages/submissions/submission-detail"));
const LazyClassList = lazy(() => import(/* webpackChunkName: "class-list" */ "@/pages/classes/list"));
const LazyClassDetail = lazy(() => import(/* webpackChunkName: "class-detail" */ "@/pages/classes/class-detail"));
const LazyBranchList = lazy(() => import(/* webpackChunkName: "branch-list" */ "@/pages/branches/list"));
const LazyBranchDetail = lazy(() => import(/* webpackChunkName: "branch-detail" */ "@/pages/branches/branch-detail"));
const LazyTeacherList = lazy(() => import(/* webpackChunkName: "teacher-list" */ "@/pages/teachers/list"));
const LazyTeacherDetail = lazy(() => import(/* webpackChunkName: "teacher-detail" */ "@/pages/teachers/teacher-detail"));
const LazyStudentList = lazy(() => import(/* webpackChunkName: "student-list" */ "@/pages/students/list"));
const LazyProfile = lazy(() => import(/* webpackChunkName: "profile" */ "@/pages/profile"));


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

      {/* Common Routes - Accessible by all authenticated users */}
      <ProtectedRoute path="/submissions/:id" component={LazyComponent(LazySubmissionDetail)} />
      <ProtectedRoute path="/assignments/:id/upload" component={LazyComponent(LazyUploadAssignment)} allowedRole={["TEACHER", "ADMIN"]} />

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