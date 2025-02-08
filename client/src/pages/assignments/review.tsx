import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Submission, Comment } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";

export default function ReviewAssignment() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedSubmission, setSelectedSubmission] = useState<number>();

  const { data: submissions } = useQuery<Submission[]>({
    queryKey: ["/api/submissions"],
  });

  const { data: comments } = useQuery<Comment[]>({
    queryKey: ["/api/comments", selectedSubmission],
    enabled: !!selectedSubmission,
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

  const commentMutation = useMutation({
    mutationFn: async (data: { submissionId: number; content: string }) => {
      const res = await apiRequest("POST", "/api/comments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/comments", selectedSubmission] 
      });
    },
  });

  const pendingSubmissions = submissions?.filter(
    (s) => s.status === "pending"
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
                        <h3 className="font-medium">
                          Student ID: {submission.studentId}
                        </h3>
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

                    {/* Comments Section */}
                    <div className="mt-8 space-y-4">
                      <h3 className="font-medium">Comments</h3>
                      <div className="space-y-4">
                        {comments?.map((comment) => (
                          <div
                            key={comment.id}
                            className="p-3 bg-gray-50 rounded"
                          >
                            <p className="text-sm font-medium">
                              User {comment.userId}
                            </p>
                            <p className="text-sm text-gray-600">
                              {comment.content}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(comment.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.target as HTMLFormElement;
                          const content = new FormData(form).get("content");
                          if (content) {
                            commentMutation.mutate({
                              submissionId: selectedSubmission,
                              content: content.toString(),
                            });
                            form.reset();
                          }
                        }}
                        className="flex gap-2"
                      >
                        <input
                          name="content"
                          className="flex-1 px-3 py-2 border rounded"
                          placeholder="Add a comment..."
                        />
                        <Button type="submit">Send</Button>
                      </form>
                    </div>
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
