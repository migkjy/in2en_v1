
import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pencil,
  Upload,
  Loader2,
  AlertTriangle,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import type { Assignment, Class, Branch, User, Submission } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";

function getStatusLabel(status: string) {
  switch (status) {
    case "uploaded":
      return "Uploaded";
    case "processing":
      return "Processing";
    case "ai-reviewed":
      return "AI Reviewed";
    case "teacher-reviewed":
      return "Teacher Reviewed";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "uploaded":
      return "bg-blue-100 text-blue-800";
    case "processing":
      return "bg-yellow-100 text-yellow-800";
    case "ai-reviewed":
      return "bg-purple-100 text-purple-800";
    case "teacher-reviewed":
      return "bg-green-100 text-green-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function AssignmentDetail() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [deleteSubmissionId, setDeleteSubmissionId] = useState<number | null>(
    null,
  );

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
    enabled: !!assignment?.classId && (user?.role === "TEACHER" || user?.role === "ADMIN"),
  });

  // Get submissions - different endpoints for students vs teachers/admins
  const { data: submissions } = useQuery<Submission[]>({
    queryKey: ["/api/submissions", assignmentId],
    queryFn: async () => {
      if (!assignmentId) throw new Error("Assignment ID is required");
      
      // For students, we fetch all their submissions
      if (user?.role === "STUDENT") {
        const response = await fetch(`/api/submissions`);
        if (!response.ok) {
          throw new Error("Failed to fetch submissions");
        }
        const allSubmissions = await response.json();
        // Filter submissions for this specific assignment
        return allSubmissions.filter(
          (submission: Submission) => submission.assignmentId === Number(assignmentId)
        );
      } else {
        // For teachers and admins, fetch by assignment ID
        const response = await fetch(
          `/api/submissions?assignmentId=${assignmentId}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch submissions");
        }
        return response.json();
      }
    },
    enabled: !!assignmentId,
  });

  const aiReviewMutation = useMutation({
    mutationFn: async () => {
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
        description: "AI review process started",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start AI review",
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

  const backPath = basePath;

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

  // Get student's submissions
  const studentSubmissions = submissions?.filter(
    (submission) => submission.studentId === user?.id
  );

  // Different displays based on user role
  const renderContent = () => {
    // For students
    if (user?.role === "STUDENT") {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">My Submissions</h2>
            <Button onClick={() => navigate(`/student/assignments/${assignmentId}/upload`)}>
              Submit Assignment
            </Button>
          </div>

          {studentSubmissions && studentSubmissions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      {formatDate(submission.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(submission.status)}>
                        {getStatusLabel(submission.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/student/submissions/${submission.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="border rounded-md p-8 text-center bg-gray-50">
              <p className="text-gray-500 mb-4">
                You haven't submitted anything for this assignment yet.
              </p>
              <Button onClick={() => navigate(`/student/assignments/${assignmentId}/upload`)}>
                Submit Now
              </Button>
            </div>
          )}
        </div>
      );
    }

    // For teachers and admins
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Student Submissions</h2>
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                navigate(`${basePath}/${assignmentId}/upload`);
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload for Student
            </Button>
            <Button
              onClick={() => {
                aiReviewMutation.mutate();
              }}
              disabled={aiReviewMutation.isPending}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Start AI Review
            </Button>
          </div>
        </div>

        {submissions && submissions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => {
                const student = students?.find(
                  (s) => s.id === submission.studentId,
                );
                return (
                  <TableRow key={submission.id}>
                    <TableCell>{student?.name || "Unknown Student"}</TableCell>
                    <TableCell>
                      {formatDate(submission.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(submission.status)}>
                        {getStatusLabel(submission.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(`${basePath.replace("assignments", "submissions")}/${submission.id}`)
                          }
                        >
                          View
                        </Button>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteSubmissionId(submission.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete submission</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="border rounded-md p-8 text-center bg-gray-50">
            <p className="text-gray-500">No submissions yet</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(backPath)}
              >
                Back
              </Button>
              <h1 className="text-2xl font-bold">{assignment.title}</h1>
              {isTeacherOrAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`${basePath}/${assignmentId}/edit`)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Class</p>
                  <p>{assignment.class?.name || "No class assigned"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Branch</p>
                  <p>{assignment.branch?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Due Date</p>
                  <p>
                    {assignment.dueDate
                      ? new Date(assignment.dueDate).toLocaleDateString()
                      : "No due date"}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-500 mb-2">
                  Description
                </p>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="whitespace-pre-wrap">
                    {assignment.description || "No description provided"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Submissions</CardTitle>
            </CardHeader>
            <CardContent>{renderContent()}</CardContent>
          </Card>
        </div>
      </main>

      <AlertDialog open={deleteSubmissionId !== null} onOpenChange={() => setDeleteSubmissionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this submission. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteSubmissionId) {
                  deleteSubmissionMutation.mutate(deleteSubmissionId);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
