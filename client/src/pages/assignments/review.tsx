import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Submission } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";

export default function ReviewAssignment() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedSubmission, setSelectedSubmission] = useState<number>();

  const { data: submissions } = useQuery<Submission[]>({
    queryKey: ["/api/submissions"],
    queryFn: async () => {
      // Get all pending submissions
      const response = await fetch("/api/submissions?status=pending");
      if (!response.ok) {
        throw new Error("Failed to fetch submissions");
      }
      return response.json();
    }
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

  const pendingSubmissions = submissions?.filter(
    (s) => s.status === "pending" || s.status === "ai-reviewed"
  );

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 gap-8">
            {/* Submissions List */}
            <Card>
              <CardHeader>
                <CardTitle>Pending Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingSubmissions?.map((submission) => (
                    <div
                      key={submission.id}
                      className={`p-4 border rounded cursor-pointer ${
                        selectedSubmission === submission.id
                          ? "border-blue-500 bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedSubmission(submission.id)}
                    >
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
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Review Form */}
            {selectedSubmission && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Submission</CardTitle>
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
                        value={
                          submissions?.find(
                            (s) => s.id === selectedSubmission
                          )?.teacherFeedback || ""
                        }
                        onChange={(e) =>
                          updateMutation.mutate({
                            id: selectedSubmission,
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
                          id: selectedSubmission,
                          teacherFeedback: submissions?.find(
                            (s) => s.id === selectedSubmission
                          )?.teacherFeedback || "",
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