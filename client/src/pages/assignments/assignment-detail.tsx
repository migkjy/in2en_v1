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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export default function AssignmentDetail() {
  const [, params] = useRoute("/:role/assignments/:id");
  const [, navigate] = useLocation();
  const assignmentId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const [deleteSubmissionId, setDeleteSubmissionId] = useState<number | null>(
    null,
  );

  // Get assignment details
  const { data: assignment, isLoading: isAssignmentLoading } = useQuery<
    Assignment & { class?: Class; branch?: Branch }
  >({
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

  // Get students list
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
    enabled: !!assignment?.classId,
  });

  // Get submissions
  const { data: submissions } = useQuery<Submission[]>({
    queryKey: ["/api/submissions", assignmentId],
    queryFn: async () => {
      if (!assignmentId) throw new Error("Assignment ID is required");
      const response = await fetch(
        `/api/submissions?assignmentId=${assignmentId}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch submissions");
      }
      return response.json();
    },
    enabled: !!assignmentId,
  });

  // Sort submissions by student name
  const sortedSubmissions = useMemo(() => {
    if (!submissions || !students) return [];

    return [...submissions].sort((a, b) => {
      const studentA = students.find((s) => s.id === a.studentId)?.name || "";
      const studentB = students.find((s) => s.id === b.studentId)?.name || "";
      return studentA.localeCompare(studentB);
    });
  }, [submissions, students]);

  // Add mutation for AI review
  const aiReviewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/submissions/${assignmentId}/review`,
        {},
      );
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onMutate: () => {
      toast({
        title: "Starting AI Review",
        description: "AI review process has begun. Please wait...",
      });
      const previousSubmissions = queryClient.getQueryData([
        "/api/submissions",
        assignmentId,
      ]);
      queryClient.setQueryData(["/api/submissions", assignmentId], (old: any) =>
        old?.map((s: any) => ({
          ...s,
          status:
            s.status === "uploaded" || !s.ocrText ? "processing" : s.status,
        })),
      );
      return { previousSubmissions };
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/submissions", assignmentId],
      });
    },
    onError: (error, _, context) => {
      if (context?.previousSubmissions) {
        queryClient.setQueryData(
          ["/api/submissions", assignmentId],
          context.previousSubmissions,
        );
      }
      toast({
        title: "Error",
        description: error.message || "Failed to process AI review",
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
      queryClient.invalidateQueries({
        queryKey: ["/api/submissions", assignmentId],
      });
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
  const basePath =
    user?.role === "ADMIN" ? "/admin/assignments" : "/teacher/assignments";

  const backPath =
    user?.role === "ADMIN" ? "/admin/assignments" : "/teacher/assignments";

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

  const getStatusBadgeStyle = (status: string | null) => {
    if (!status) return "bg-gray-100 text-gray-800";
    switch (status) {
      case "ai-reviewed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusText = (status: string | null) => {
    return status ? status.toUpperCase() : "PENDING";
  };

  const handleViewSubmission = (submissionId: number) => {
    navigate(`/submissions/${submissionId}`);
  };

  return (
    <>
      <div className="flex h-screen">
        <Sidebar className="w-64" />
        <main className="flex-1 p-8 overflow-auto mt-14">
          <div className="max-w-6xl mx-auto">
            {/* Added Back Button */}
            <Button
              variant="outline"
              className="mb-4"
              onClick={() => navigate(backPath)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assignments List
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>{assignment.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Assignment Info */}
                  <div className="md:flex md:justify-between text-sm text-gray-600 space-y-2 md:space-y-0">
                    <div>
                      <span className="font-medium">Branch:</span>{" "}
                      {assignment.branch?.name || "-"}
                    </div>
                    <div>
                      <span className="font-medium">Class:</span>{" "}
                      {assignment.class?.name || "-"} -{" "}
                      {assignment.class?.englishLevel || "-"}
                    </div>
                    <div>
                      <span className="font-medium">Due:</span>{" "}
                      {assignment.dueDate
                        ? format(new Date(assignment.dueDate), "MM/dd/yy")
                        : "No due date"}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-2">Description</h3>
                    <p className="text-gray-600">{assignment.description}</p>
                  </div>

                  {/* Students List */}
                  {user?.role !== "STUDENT" && (
                    <div>
                      <h3 className="text-sm font-medium mb-4">
                        Class Students
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {students?.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                          >
                            {student.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons for Teachers/Admins */}
                  {isTeacherOrAdmin && (
                    <div className="flex gap-4">
                      <Button
                        onClick={() =>
                          navigate(`/assignments/${assignmentId}/upload`)
                        }
                      >
                        Bulk Upload
                      </Button>
                      <Button
                        onClick={() => {
                          const uploadedSubmissions =
                            submissions?.filter(
                              (s) => s.status === "uploaded",
                            ) || [];
                          if (uploadedSubmissions.length === 0) {
                            toast({
                              title: "No submissions to review",
                              description:
                                "There are no uploaded assignments to review",
                              variant: "destructive",
                            });
                            return;
                          }
                          aiReviewMutation.mutate();
                        }}
                        disabled={aiReviewMutation.isPending}
                      >
                        {aiReviewMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "AI Feedback"
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Submissions Table */}
                  <div className="mt-8">
                    <h2 className="text-lg font-semibold">Submissions</h2>
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Student Name
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Status
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {submissions && submissions.length > 0 ? (
                            submissions
                              .filter((submission) => {
                                // For students, only show their own submissions
                                if (user?.role === "STUDENT") {
                                  return submission.studentId === user.id;
                                }
                                return true;
                              })
                              .sort((a, b) => {
                                const studentA =
                                  students?.find((s) => s.id === a.studentId)
                                    ?.name || "";
                                const studentB =
                                  students?.find((s) => s.id === b.studentId)
                                    ?.name || "";
                                return studentA.localeCompare(studentB);
                              })
                              .map((submission) => {
                                const studentName = students?.find(
                                  (s) => s.id === submission.studentId,
                                )?.name;
                                return (
                                  <tr key={submission.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      {studentName ||
                                        (user?.role === "STUDENT"
                                          ? user.name
                                          : "Unknown")}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span
                                        className={`px-2 py-1 text-xs rounded-full ${
                                          submission.status === "pending"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : submission.status === "reviewed"
                                              ? "bg-green-100 text-green-800"
                                              : submission.status === "uploaded"
                                                ? "bg-blue-100 text-blue-800"
                                                : submission.status ===
                                                    "ai-reviewed"
                                                  ? "bg-purple-100 text-purple-800"
                                                  : submission.status ===
                                                      "processing"
                                                    ? "bg-gray-100 text-gray-800"
                                                    : submission.status ===
                                                        "failed"
                                                      ? "bg-red-100 text-red-800"
                                                      : "bg-gray-100 text-gray-800"
                                        }`}
                                      >
                                        {submission.status === "pending"
                                          ? "Pending"
                                          : submission.status === "reviewed"
                                            ? "Reviewed"
                                            : submission.status === "uploaded"
                                              ? "Uploaded"
                                              : submission.status ===
                                                  "ai-reviewed"
                                                ? "AI Reviewed"
                                                : submission.status ===
                                                    "processing"
                                                  ? "Processing"
                                                  : submission.status ===
                                                      "failed"
                                                    ? "Failed"
                                                    : submission.status}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleViewSubmission(submission.id)
                                        }
                                      >
                                        View
                                      </Button>
                                      {isTeacherOrAdmin && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setDeleteSubmissionId(submission.id)
                                          }
                                          className="ml-2 text-red-600 hover:text-red-800"
                                        >
                                          Delete
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                          ) : (
                            <tr>
                              <td
                                colSpan={3}
                                className="px-6 py-4 text-center text-sm text-gray-500"
                              >
                                No submissions yet
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Submit work button for students - hidden for now */}
                    {/* {user?.role === "STUDENT" && (
                      <div className="mt-6">
                        <Button
                          onClick={() =>
                            navigate(`/student/submissions/create/${assignmentId}`)
                          }
                        >
                          Submit My Work
                        </Button>
                      </div>
                    )} */}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteSubmissionId}
        onOpenChange={(open) => !open && setDeleteSubmissionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this submission? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteSubmissionId &&
                deleteSubmissionMutation.mutate(deleteSubmissionId)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
