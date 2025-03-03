import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Clock, File, MoreHorizontal, ArrowLeft, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useMemo } from "react";
import {AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction} from "@/components/ui/alert-dialog";

export default function AssignmentDetail() {
  const { user } = useAuth();
  const basePath = user?.role.toLowerCase();
  const [, params] = useRoute("/assignments/:id") || useRoute(`/${basePath}/assignments/:id`);
  const assignmentId = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<number | null>(null);

  const { data: assignment } = useQuery({
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

  const { data: submissions } = useQuery({
    queryKey: ["/api/submissions", assignmentId],
    queryFn: async () => {
      const response = await fetch(`/api/submissions?assignmentId=${assignmentId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch submissions");
      }
      return response.json();
    },
    enabled: !!assignmentId,
  });

  const deleteSubmissionMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to delete submission");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Submission deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions", assignmentId] });
      setSubmissionToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const reviewSubmissionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/submissions/${assignmentId}/review`, {
        method: "POST",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to process submissions");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "AI review process started",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions", assignmentId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const reprocessSubmissionMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      const response = await fetch(`/api/submissions/${submissionId}/reprocess`, {
        method: "POST",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to reprocess submission");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Submission is being reprocessed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions", assignmentId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Determine if we should hide student names (only for student role)
  const shouldHideStudentNames = user?.role === "STUDENT";

  const formattedDate = useMemo(() => {
    if (!assignment?.dueDate) return "";
    try {
      return format(new Date(assignment.dueDate), "MMMM d, yyyy");
    } catch (e) {
      console.error("Date formatting error:", e);
      return "Invalid date";
    }
  }, [assignment?.dueDate]);

  const handleDeleteSubmission = (submissionId: number) => {
    setSubmissionToDelete(submissionId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteSubmission = () => {
    if (submissionToDelete) {
      deleteSubmissionMutation.mutate(submissionToDelete);
    }
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(`/${basePath}/assignments`)}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">{assignment?.title}</h1>
          </div>

          {assignment && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assignment Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium">Description</h3>
                      <p>{assignment.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-medium">Class</h3>
                        <p>{assignment.class?.name || "No class assigned"}</p>
                      </div>
                      <div>
                        <h3 className="font-medium">Branch</h3>
                        <p>{assignment.branch?.name || "No branch"}</p>
                      </div>
                      <div>
                        <h3 className="font-medium">Due Date</h3>
                        <p className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" /> {formattedDate}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Submissions</CardTitle>
                  <div className="flex gap-2">
                    {user?.role !== "STUDENT" && (
                      <Button 
                        onClick={() => reviewSubmissionsMutation.mutate()}
                        disabled={reviewSubmissionsMutation.isPending}
                      >
                        Process with AI
                      </Button>
                    )}

                    {user?.role === "STUDENT" && (
                      <Button 
                        onClick={() => navigate(`/${basePath}/assignments/${assignmentId}/upload`)}
                      >
                        Upload Homework
                      </Button>
                    )}

                    {user?.role !== "STUDENT" && (
                      <Button 
                        onClick={() => navigate(`/${basePath}/assignments/${assignmentId}/upload`)}
                      >
                        Upload for Student
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {submissions && submissions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {!shouldHideStudentNames && (
                            <TableHead>Student</TableHead>
                          )}
                          <TableHead>Uploaded</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissions.map((submission) => (
                          <TableRow key={submission.id}>
                            {!shouldHideStudentNames && (
                              <TableCell>
                                {submission.student?.name || "Unknown"}
                              </TableCell>
                            )}
                            <TableCell>
                              {submission.createdAt
                                ? format(new Date(submission.createdAt), "MMM d, yyyy h:mm a")
                                : "Unknown date"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  submission.status === "graded"
                                    ? "default"
                                    : submission.status === "ai-reviewed"
                                    ? "outline"
                                    : submission.status === "processing"
                                    ? "secondary"
                                    : submission.status === "failed"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {submission.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/${basePath}/submissions/${submission.id}`)}
                                >
                                  <File className="h-4 w-4 mr-1" /> View
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {user?.role !== "STUDENT" && (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() => reprocessSubmissionMutation.mutate(submission.id)}
                                          disabled={reprocessSubmissionMutation.isPending}
                                        >
                                          Reprocess with AI
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleDeleteSubmission(submission.id)}
                                          className="text-red-500"
                                        >
                                          Delete
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No submissions found for this assignment.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen}
      >
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
              onClick={confirmDeleteSubmission}
              className="bg-red-500 hover:bg-red-600"
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}