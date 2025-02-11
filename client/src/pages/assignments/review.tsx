import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Submission } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function ReviewAssignment() {
  const [match, params] = useRoute("/assignments/review/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // If route doesn't match or no user, redirect to appropriate dashboard
  if (!match || !user) {
    const dashboardPath = user?.role === "ADMIN" 
      ? "/admin/dashboard"
      : user?.role === "TEACHER" 
      ? "/teacher/dashboard" 
      : "/student/dashboard";

    navigate(dashboardPath);
    return null;
  }

  // If no ID parameter is provided, redirect to assignments page
  if (!params?.id) {
    navigate("/assignments");
    return null;
  }

  const submissionId = parseInt(params.id, 10);

  // If ID is not a valid number, redirect to assignments page
  if (isNaN(submissionId)) {
    navigate("/assignments");
    return null;
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
}