import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Submission, User, Assignment } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function SubmissionDetail() {
  const [, params] = useRoute("/submissions/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const submissionId = params?.id ? parseInt(params.id, 10) : null;

  // Get submission details
  const { data: submission, isLoading: isSubmissionLoading } = useQuery<Submission>({
    queryKey: ["/api/submissions", submissionId],
    queryFn: async () => {
      console.log("Fetching submission:", submissionId);
      if (!submissionId || isNaN(submissionId)) {
        throw new Error("Invalid submission ID");
      }
      const response = await fetch(`/api/submissions/${submissionId}`);
      if (!response.ok) {
        const error = await response.text();
        console.error("Submission fetch error:", error);
        throw new Error("Failed to fetch submission");
      }
      const data = await response.json();
      console.log("Submission data:", data);
      return data;
    },
    enabled: !!submissionId && !isNaN(submissionId),
  });

  // Get assignment details
  const { data: assignment, isLoading: isAssignmentLoading } = useQuery<Assignment>({
    queryKey: ["/api/assignments", submission?.assignmentId],
    queryFn: async () => {
      console.log("Fetching assignment:", submission?.assignmentId);
      if (!submission?.assignmentId) throw new Error("Assignment ID is required");
      const response = await fetch(`/api/assignments/${submission.assignmentId}`);
      if (!response.ok) {
        const error = await response.text();
        console.error("Assignment fetch error:", error);
        throw new Error("Failed to fetch assignment");
      }
      const data = await response.json();
      console.log("Assignment data:", data);
      return data;
    },
    enabled: !!submission?.assignmentId,
  });

  // Get student details
  const { data: student, isLoading: isStudentLoading } = useQuery<User>({
    queryKey: ["/api/users", submission?.studentId],
    queryFn: async () => {
      console.log("Fetching student:", submission?.studentId);
      if (!submission?.studentId) throw new Error("Student ID is required");
      const response = await fetch(`/api/users/${submission.studentId}`);
      if (!response.ok) {
        const error = await response.text();
        console.error("Student fetch error:", error);
        throw new Error("Failed to fetch student");
      }
      const data = await response.json();
      console.log("Student data:", data);
      return data;
    },
    enabled: !!submission?.studentId,
  });

  // Handle authentication
  if (!user) {
    navigate("/auth");
    return null;
  }

  // Handle invalid ID
  if (!submissionId || isNaN(submissionId)) {
    toast({
      title: "Error",
      description: "Invalid submission ID",
      variant: "destructive",
    });
    navigate("/");
    return null;
  }

  // Show loading state
  if (isSubmissionLoading || isAssignmentLoading || isStudentLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar className="w-64" />
        <main className="flex-1 p-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-center items-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading submission details...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Handle errors or missing data
  if (!submission || !assignment || !student) {
    toast({
      title: "Error",
      description: "Failed to load submission details",
      variant: "destructive",
    });
    return null;
  }

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>
                {assignment.title} - {student.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Submission Image */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Submitted Work</h3>
                  {submission.imageUrl && (
                    <img
                      src={submission.imageUrl}
                      alt="Submitted homework"
                      className="w-full max-w-2xl mx-auto rounded-lg shadow-md"
                    />
                  )}
                </div>

                {/* OCR Text */}
                {submission.ocrText && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">OCR Text</h3>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="whitespace-pre-wrap">{submission.ocrText}</p>
                    </div>
                  </div>
                )}

                {/* AI Feedback */}
                {submission.aiFeedback && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">AI Feedback</h3>
                    <div className="bg-blue-50 p-4 rounded">
                      <p className="whitespace-pre-wrap">{submission.aiFeedback}</p>
                    </div>
                  </div>
                )}

                {/* Teacher Feedback */}
                {submission.teacherFeedback && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Teacher Feedback</h3>
                    <div className="bg-green-50 p-4 rounded">
                      <p className="whitespace-pre-wrap">
                        {submission.teacherFeedback}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}