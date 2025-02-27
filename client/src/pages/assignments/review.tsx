import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Submission } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

// List component for /assignments/review
const ReviewList = () => {
  const [, navigate] = useLocation();
  const { data: submissions } = useQuery<Submission[]>({
    queryKey: ["/api/submissions", "pending"],
    queryFn: async () => {
      const response = await fetch(`/api/submissions?status=pending`);
      if (!response.ok) throw new Error("Failed to fetch submissions");
      return response.json();
    },
    enabled: false
  });

  // Redirect to appropriate dashboard immediately
  const { user } = useAuth();
  if (!user) {
    navigate("/");
    return null;
  }

  const dashboardPath = user.role === "ADMIN" ? "/admin/assignments" : "/teacher/assignments";
  navigate(dashboardPath);
  return null;
};

// Detail component for /assignments/review/:id
const ReviewDetail = ({ id }: { id: string }) => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Validate user and ID
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    navigate("/");
    return null;
  }

  const submissionId = parseInt(id, 10);
  if (isNaN(submissionId)) {
    const dashboardPath = user.role === "ADMIN" ? "/admin/assignments" : "/teacher/assignments";
    navigate(dashboardPath);
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
    enabled: !isNaN(submissionId),
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

  if (error || !submission) {
    const dashboardPath = user.role === "ADMIN" ? "/admin/assignments" : "/teacher/assignments";
    navigate(dashboardPath);
    return null;
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
            {/* Submission Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Submission Details</CardTitle>
              </CardHeader>
              <CardContent>
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
                      <p className="font-medium">AI Assessment:</p>
                      <p className="text-gray-600">{submission.overallAssessment}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Teacher Feedback Card */}
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
          </div>
        </div>
      </main>
    </div>
  );
};

// Main component that handles routing
const ReviewAssignment = () => {
  const [, params] = useRoute("/:role/assignments/review/:id");
  const [isEditMode] = useRoute("/:role/assignments/review/:id/edit");

  // If we have an ID parameter from either route pattern, show the detail view
  if (params?.id) {
    return <ReviewDetail id={params.id} />;
  }

  // Otherwise show the list view which will handle the redirect
  return <ReviewList />;
};

export default ReviewAssignment;