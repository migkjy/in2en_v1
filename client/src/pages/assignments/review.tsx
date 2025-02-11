import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Submission } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { FC } from "react";

const RedirectToDashboard: FC = () => {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const dashboardPath = user?.role === "ADMIN" 
    ? "/admin/assignments"
    : user?.role === "TEACHER" 
    ? "/teacher/assignments" 
    : "/student";

  navigate(dashboardPath);
  return <></>;
};

const ReviewAssignment: FC = () => {
  const [match, params] = useRoute("/assignments/review/:id?");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // If no user, redirect to appropriate dashboard
  if (!user) {
    return <RedirectToDashboard />;
  }

  // If no ID parameter is provided, show all submissions
  if (!params?.id) {
    const { data: submissions } = useQuery<Submission[]>({
      queryKey: ["/api/submissions", "pending"],
      queryFn: async () => {
        const response = await fetch(`/api/submissions?status=pending`);
        if (!response.ok) throw new Error("Failed to fetch submissions");
        return response.json();
      }
    });

    return (
      <div className="flex h-screen">
        <Sidebar className="w-64" />
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Pending Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {submissions?.map((submission) => (
                    <div key={submission.id} className="p-4 border rounded">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">
                            Assignment ID: {submission.assignmentId}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Status: {submission.status}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/assignments/review/${submission.id}`)}
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (!params?.id) {
    return (
      <div className="flex h-screen">
        <Sidebar className="w-64" />
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Pending Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {submissions?.map((submission) => (
                    <div key={submission.id} className="p-4 border rounded">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">
                            Assignment ID: {submission.assignmentId}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Status: {submission.status}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/assignments/review/${submission.id}`)}
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const submissionId = parseInt(params.id, 10);
  if (isNaN(submissionId)) {
    return <RedirectToDashboard />;
  }

  // If ID is not a valid number, redirect to assignments page
  if (isNaN(submissionId)) {
    return <RedirectToDashboard />;
  }

  const { data: submission, isLoading, error } = useQuery<Submission>({
    queryKey: ["/api/submissions", submissionId],
    queryFn: async () => {
      const response = await fetch(`/api/submissions/${submissionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch submission");
      }
      return response.json();
    },
    retry: false,
    enabled: !!submissionId && !isNaN(submissionId),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      teacherFeedback: string;
      status: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/submissions/${data.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({
        title: "Success",
        description: "Feedback updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (error) {
    return (
      <div className="flex h-screen">
        <Sidebar className="w-64" />
        <main className="flex-1 p-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-red-600">
                  {error instanceof Error ? error.message : "An error occurred"}
                </p>
                <Button
                  className="mt-4 mx-auto block"
                  onClick={() => navigate("/assignments")}
                >
                  Go Back to Assignments
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar className="w-64" />
        <main className="flex-1 p-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <p className="text-center">Loading...</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 gap-8">
            {/* Submission Details */}
            <Card>
              <CardHeader>
                <CardTitle>Submission Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {submission && (
                    <div className="space-y-4">
                      <img
                        src={submission.imageUrl}
                        alt="homework"
                        className="w-full h-40 object-cover rounded mb-4"
                      />
                      <div className="space-y-2">
                        <div className="text-sm">
                          <p className="font-medium">OCR Text:</p>
                          <p className="text-gray-600">{submission.ocrText}</p>
                        </div>
                        <div className="text-sm">
                          <p className="font-medium">AI Feedback:</p>
                          <p className="text-gray-600">{submission.aiFeedback}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Review Form */}
            {submission && (
              <Card>
                <CardHeader>
                  <CardTitle>Teacher Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Teacher Feedback
                      </label>
                      <Textarea
                        rows={6}
                        placeholder="Enter your feedback..."
                        value={submission.teacherFeedback || ""}
                        onChange={(e) =>
                          updateMutation.mutate({
                            id: submission.id,
                            teacherFeedback: e.target.value,
                            status: "pending",
                          })
                        }
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={() =>
                        updateMutation.mutate({
                          id: submission.id,
                          teacherFeedback: submission.teacherFeedback || "",
                          status: "completed",
                        })
                      }
                    >
                      Complete Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReviewAssignment;