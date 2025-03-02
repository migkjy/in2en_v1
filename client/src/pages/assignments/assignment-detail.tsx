
import { useQuery, useMutation } from "@tanstack/react-query";
import { Assignment, Submission, Class, Branch, User } from "@shared/schema";
import { useRoute, useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import React, { useState, useMemo } from "react";
import {AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction} from "@/components/ui/alert-dialog";

export default function AssignmentDetail() {
  const [, params] = useRoute("/:role/assignments/:id");
  const [, navigate] = useLocation();
  const assignmentId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const [deleteSubmissionId, setDeleteSubmissionId] = useState<number | null>(null);

  // Get assignment details
  const { data: assignment, isLoading: isAssignmentLoading } =
    useQuery<Assignment & { class?: Class; branch?: Branch }>({
      queryKey: ["/api/assignments", assignmentId],
      queryFn: async () => {
        const response = await fetch(`/api/assignments/${assignmentId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch assignment");
        }
        return response.json();
      },
      enabled: !!assignmentId,
    });

  // Get students list - only for teacher/admin
  const { data: students } = useQuery<User[]>({
    queryKey: ["/api/classes", assignment?.classId, "students"],
    queryFn: async () => {
      if (!assignment?.classId) throw new Error("Class ID is required");
      const response = await fetch(
        `/api/classes/${assignment.classId}/students`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch students");
      }
      return response.json();
    },
    enabled: !!assignment?.classId && (user?.role === "TEACHER" || user?.role === "ADMIN"),
  });

  // Get submissions
  const { data: submissions, isLoading: isSubmissionsLoading } = useQuery<Submission[]>({
    queryKey: ["/api/submissions", assignmentId],
    queryFn: async () => {
      if (!assignmentId) throw new Error("Assignment ID is required");
      
      // For students, we get all their submissions
      // No need to filter by assignment ID, as the API will handle this
      const response = await fetch(
        `/api/submissions`,
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch submissions");
      }
      
      const data = await response.json();
      
      // If student, filter submissions for this assignment only
      if (user?.role === "STUDENT") {
        return data.filter((sub: Submission) => sub.assignmentId === Number(assignmentId));
      }
      
      return data;
    },
    enabled: !!assignmentId,
  });

  // Process submissions mutation
  const processSubmissionsMutation = useMutation({
    mutationFn: async () => {
      if (!assignmentId) throw new Error("Assignment ID is required");
      const response = await apiRequest(
        "POST",
        `/api/submissions/${assignmentId}/review`,
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions", assignmentId] });
      toast({
        title: "Success",
        description: "AI review process started successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start AI review process",
        variant: "destructive",
      });
    },
  });

  // Add delete mutation
  const deleteSubmissionMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/submissions/${submissionId}`,
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions", assignmentId] });
      toast({
        title: "Success",
        description: "Submission deleted successfully",
      });
      setDeleteSubmissionId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete submission",
        variant: "destructive",
      });
      setDeleteSubmissionId(null);
    },
  });

  const isTeacherOrAdmin = user?.role === "TEACHER" || user?.role === "ADMIN";
  const basePath = user?.role === "ADMIN" ? "/admin/assignments" : 
                  user?.role === "TEACHER" ? "/teacher/assignments" : 
                  "/student/assignments";

  const backPath = user?.role === "ADMIN" ? "/admin/assignments" : 
                  user?.role === "TEACHER" ? "/teacher/assignments" : 
                  "/student/assignments";

  if (isAssignmentLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!assignment) {
    return <div>Assignment not found</div>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Button
              variant="outline"
              className="mb-4"
              onClick={() => navigate(backPath)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assignments
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>{assignment.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="font-medium mb-1">Description</h3>
                    <p className="text-gray-700">
                      {assignment.description || "No description provided"}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Details</h3>
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="font-medium text-gray-700">Due Date:</span>{" "}
                        {assignment.dueDate
                          ? format(new Date(assignment.dueDate), "PP")
                          : "No due date"}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium text-gray-700">Status:</span>{" "}
                        {assignment.status}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium text-gray-700">Class:</span>{" "}
                        {assignment.class?.name || "Unknown class"}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium text-gray-700">Branch:</span>{" "}
                        {assignment.branch?.name || "Unknown branch"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Only show the Class Students section for teachers and admins */}
                  {isTeacherOrAdmin && (
                    <div>
                      <h3 className="font-medium mb-2">Class Students</h3>
                      {students && students.length > 0 ? (
                        <div className="max-h-40 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Submission Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {students.map((student) => {
                                const studentSubmission = submissions?.find(
                                  (sub) => sub.studentId === student.id
                                );
                                return (
                                  <TableRow key={student.id}>
                                    <TableCell>{student.name}</TableCell>
                                    <TableCell>
                                      {studentSubmission ? (
                                        <span className="text-green-600">
                                          Submitted
                                        </span>
                                      ) : (
                                        <span className="text-red-600">
                                          Not Submitted
                                        </span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-gray-500">No students in this class</p>
                      )}
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">Submissions</h3>
                      <div className="flex gap-2">
                        {isTeacherOrAdmin && (
                          <Button
                            onClick={() =>
                              navigate(`${basePath}/${assignment.id}/upload`)
                            }
                          >
                            Upload Student Work
                          </Button>
                        )}
                        {user?.role === "STUDENT" && (
                          <Button
                            onClick={() =>
                              navigate(`${basePath}/${assignment.id}/upload`)
                            }
                          >
                            Submit My Work
                          </Button>
                        )}
                        {isTeacherOrAdmin && (
                          <Button
                            variant="outline"
                            onClick={() => processSubmissionsMutation.mutate()}
                            disabled={processSubmissionsMutation.isPending}
                          >
                            {processSubmissionsMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              "Process with AI"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {isSubmissionsLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-border" />
                      </div>
                    ) : submissions && submissions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Submitted</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {submissions.map((submission) => (
                            <TableRow key={submission.id}>
                              <TableCell>{submission.studentName || "Unknown"}</TableCell>
                              <TableCell>
                                {submission.createdAt
                                  ? format(
                                      new Date(submission.createdAt),
                                      "PP hh:mm a"
                                    )
                                  : "Unknown"}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    submission.status === "ai-reviewed"
                                      ? "bg-green-100 text-green-800"
                                      : submission.status === "processing"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : submission.status === "failed"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {submission.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    navigate(
                                      `/${user?.role.toLowerCase()}/submissions/${
                                        submission.id
                                      }`
                                    )
                                  }
                                >
                                  View
                                </Button>
                                {isTeacherOrAdmin && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="ml-2 text-red-600 hover:text-red-800"
                                    onClick={() => setDeleteSubmissionId(submission.id)}
                                  >
                                    Delete
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 border rounded-md bg-gray-50">
                        <p className="text-gray-500">No submissions yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <AlertDialog open={deleteSubmissionId !== null} onOpenChange={(open) => !open && setDeleteSubmissionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the submission. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSubmissionId && deleteSubmissionMutation.mutate(deleteSubmissionId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteSubmissionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
