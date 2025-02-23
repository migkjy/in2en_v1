import "./submission-detail.css";

import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Submission, User, Assignment } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface SubmissionResponse extends Submission {
  assignment: Assignment;
  student: User;
}

export default function SubmissionDetail() {
  const [, params] = useRoute("/submissions/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  if (!user) {
    navigate("/auth");
    return null;
  }

  const submissionId = params?.id ? parseInt(params.id, 10) : null;

  if (!submissionId || isNaN(submissionId)) {
    navigate("/");
    return null;
  }

  const {
    data: submissionData,
    isLoading,
    error,
  } = useQuery<SubmissionResponse>({
    queryKey: ["/api/submissions", submissionId],
    queryFn: async () => {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to fetch submission" }));
        throw new Error(errorData.message);
      }

      return response.json();
    },
  });

  // Add reprocess mutation
  const reprocessMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/submissions/${submissionId}/reprocess`,
        {},
      );
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/submissions", submissionId],
      });
      toast({
        title: "Success",
        description: "Submission is being reprocessed with AI",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reprocess submission",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar className="w-64" />
        <main className="flex-1 p-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
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

  if (error) {
    return (
      <div className="flex h-screen">
        <Sidebar className="w-64" />
        <main className="flex-1 p-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-red-600">
                  {error instanceof Error
                    ? error.message
                    : "Failed to load submission"}
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (!submissionData) {
    return (
      <div className="flex h-screen">
        <Sidebar className="w-64" />
        <main className="flex-1 p-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-red-600">
                  Could not load submission details
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const { assignment, student, ...submission } = submissionData;
  const isTeacherOrAdmin = user.role === "TEACHER" || user.role === "ADMIN";

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {assignment.title} - {student.name}
              </CardTitle>
              {isTeacherOrAdmin && (
                <Button
                  onClick={() => reprocessMutation.mutate()}
                  disabled={
                    reprocessMutation.isPending ||
                    submission.status === "processing"
                  }
                >
                  {reprocessMutation.isPending ||
                  submission.status === "processing" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Reprocess with AI"
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {submission.imageUrl && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Submitted Work</h3>
                    <img
                      src={submission.imageUrl}
                      alt="Submitted homework"
                      className="w-full max-w-2xl mx-auto rounded-lg shadow-md"
                    />
                  </div>
                )}

                {submission.ocrText && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">OCR Text</h3>
                    <div className="bg-gray-50 p-4 rounded prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {submission.ocrText}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {submission.aiFeedback && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">AI Feedback</h3>
                    <div className="bg-blue-50 p-4 rounded prose prose-sm max-w-none markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {submission.aiFeedback}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {submission.teacherFeedback && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      Teacher Feedback
                    </h3>
                    <div className="bg-green-50 p-4 rounded prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {submission.teacherFeedback}
                      </ReactMarkdown>
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
