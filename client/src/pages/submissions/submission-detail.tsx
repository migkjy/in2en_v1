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
          <div className="max-w-5xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center min-h-[200px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-lg">Loading submission details...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (error || !submissionData) {
    return (
      <div className="flex h-screen">
        <Sidebar className="w-64" />
        <main className="flex-1 p-8">
          <div className="max-w-5xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-red-600 text-lg">
                  {error instanceof Error
                    ? error.message
                    : "Could not load submission details"}
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
      <main className="flex-1 p-8 overflow-auto bg-gray-50">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header Card */}
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-2xl font-bold">
                  {assignment.title}
                </CardTitle>
                <p className="text-muted-foreground mt-1">
                  Submitted by: {student.name}
                </p>
              </div>
              {isTeacherOrAdmin && (
                <Button
                  onClick={() => reprocessMutation.mutate()}
                  disabled={
                    reprocessMutation.isPending ||
                    submission.status === "processing"
                  }
                  className="ml-4"
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
          </Card>

          {/* Content Cards */}
          <div className="grid gap-6">
            {submission.imageUrl && (
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-primary">
                    Submitted Work
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg overflow-hidden shadow-lg">
                    <img
                      src={submission.imageUrl}
                      alt="Submitted homework"
                      className="w-full object-contain max-h-[600px]"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {submission.aiFeedback && (
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-primary">
                    AI Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white p-6 rounded-lg prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {submission.aiFeedback}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {submission.teacherFeedback && (
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-primary">
                    Teacher Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white p-6 rounded-lg prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {submission.teacherFeedback}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}