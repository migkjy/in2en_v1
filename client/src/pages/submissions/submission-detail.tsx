import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Submission, User, Assignment } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export default function SubmissionDetail() {
  const [, params] = useRoute("/submissions/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const submissionId = params?.id ? parseInt(params.id, 10) : null;

  useEffect(() => {
    // Redirect if no valid ID
    if (!submissionId || isNaN(submissionId)) {
      toast({
        title: "Error",
        description: "Invalid submission ID",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [submissionId, navigate, toast]);

  // Get submission details
  const { data: submission, isLoading: isSubmissionLoading } = useQuery<Submission>({
    queryKey: ["/api/submissions", submissionId],
    queryFn: async () => {
      const response = await fetch(`/api/submissions/${submissionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch submission");
      }
      return response.json();
    },
    enabled: !!submissionId && !isNaN(submissionId),
  });

  // Get assignment details
  const { data: assignment } = useQuery<Assignment>({
    queryKey: ["/api/assignments", submission?.assignmentId],
    queryFn: async () => {
      if (!submission?.assignmentId) throw new Error("Assignment ID is required");
      const response = await fetch(`/api/assignments/${submission.assignmentId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch assignment");
      }
      return response.json();
    },
    enabled: !!submission?.assignmentId,
  });

  // Get student details
  const { data: student } = useQuery<User>({
    queryKey: ["/api/users", submission?.studentId],
    queryFn: async () => {
      if (!submission?.studentId) throw new Error("Student ID is required");
      const response = await fetch(`/api/users/${submission.studentId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch student");
      }
      return response.json();
    },
    enabled: !!submission?.studentId,
  });

  useEffect(() => {
    if (!isSubmissionLoading && (!submission || !assignment || !student)) {
      toast({
        title: "Error",
        description: "Failed to load submission details",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isSubmissionLoading, submission, assignment, student, toast, navigate]);

  if (isSubmissionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!submission || !assignment || !student) {
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
                  <img
                    src={submission.imageUrl}
                    alt="Submitted homework"
                    className="w-full max-w-2xl mx-auto rounded-lg shadow-md"
                  />
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
                      <p className="whitespace-pre-wrap">{submission.teacherFeedback}</p>
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