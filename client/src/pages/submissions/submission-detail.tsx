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
import { Loader2, ArrowLeft, Edit2 as Edit, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MDEditor from '@uiw/react-md-editor';
import { useState } from "react";

interface SubmissionResponse extends Submission {
  assignment: Assignment;
  student: User;
}

// Markdown Editor Component
const RichTextEditor = ({ content, onChange }: { content: string; onChange: (text: string) => void }) => {
  return (
    <MDEditor
      value={content}
      onChange={(val) => onChange(val || '')}
      preview="live"
      height={400}
    />
  );
};

const fixMarkdownFormatting = (text: string) => {
  if (!text) return "";
  return text.replace(/(\w+|\S)(\*\*)/g, '$1 $2').replace(/(\*\*)(\w+|\S)/g, '$1 $2');
};

export default function SubmissionDetail() {
  const [, params] = useRoute("/submissions/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditingCorrections, setIsEditingCorrections] = useState(false);
  const [isEditingAssessment, setIsEditingAssessment] = useState(false);
  const [editedCorrections, setEditedCorrections] = useState("");
  const [editedAssessment, setEditedAssessment] = useState("");

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

  const updateSubmissionMutation = useMutation({
    mutationFn: async (data: {
      correctedText?: string;
      overallAssessment?: string;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/submissions/${submissionId}`,
        data
      );
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions", submissionId] });
      toast({
        title: "Success",
        description: "Changes saved successfully",
      });
      setIsEditingCorrections(false);
      setIsEditingAssessment(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save changes",
        variant: "destructive",
      });
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
                  {error instanceof Error ? error.message : "Failed to load submission"}
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
                <p className="text-center text-red-600">Could not load submission details</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const { assignment, student } = submissionData;
  const isTeacherOrAdmin = user.role === "TEACHER" || user.role === "ADMIN";
  const basePath = user.role === "ADMIN" ? "/admin/assignments" : "/teacher/assignments";

  const handleStartEdit = (type: 'corrections' | 'assessment') => {
    if (type === 'corrections') {
      setEditedCorrections(submissionData.correctedText || '');
      setIsEditingCorrections(true);
    } else {
      setEditedAssessment(submissionData.overallAssessment || '');
      setIsEditingAssessment(true);
    }
  };

  const handleSave = (type: 'corrections' | 'assessment') => {
    if (type === 'corrections') {
      updateSubmissionMutation.mutate({ correctedText: editedCorrections });
    } else {
      updateSubmissionMutation.mutate({ overallAssessment: editedAssessment });
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="outline"
            className="mb-4"
            onClick={() => navigate(`${basePath}/${assignment.id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assignment Detail
          </Button>

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
                    submissionData.status === "processing"
                  }
                >
                  {reprocessMutation.isPending ||
                  submissionData.status === "processing" ? (
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
                {submissionData.imageUrl && (
                  <div>
                    <h3 className="section-title mb-2">Submitted Work</h3>
                    <img
                      src={submissionData.imageUrl}
                      alt="Submitted homework"
                      className="w-full max-w-2xl mx-auto rounded-lg shadow-md"
                    />
                  </div>
                )}

                {/* OCR Text section commented out (주석 처리됨)
                {submissionData.ocrText && (
                  <div>
                    <h3 className="section-title mb-2">OCR Text</h3>
                    <div className="bg-gray-50 p-4 rounded prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {submissionData.ocrText}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
                */}

                {(submissionData.correctedText || submissionData.overallAssessment || isTeacherOrAdmin) && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="section-title">AI Corrections</h3>
                        {isTeacherOrAdmin && (
                          <div className="flex gap-2">
                            {isEditingCorrections ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSave('corrections')}
                                  disabled={updateSubmissionMutation.isPending}
                                >
                                  <Save className="w-4 h-4 mr-2" />
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setIsEditingCorrections(false)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartEdit('corrections')}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="bg-blue-50 p-4 rounded prose prose-sm max-w-none">
                        {isEditingCorrections ? (
                          <RichTextEditor
                            content={editedCorrections}
                            onChange={setEditedCorrections}
                          />
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {submissionData.correctedText || "No corrections yet"}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="section-title">AI Assessment</h3>
                        {isTeacherOrAdmin && (
                          <div className="flex gap-2">
                            {isEditingAssessment ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSave('assessment')}
                                  disabled={updateSubmissionMutation.isPending}
                                >
                                  <Save className="w-4 h-4 mr-2" />
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setIsEditingAssessment(false)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartEdit('assessment')}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="bg-green-50 p-4 rounded prose prose-sm max-w-none">
                        {isEditingAssessment ? (
                          <RichTextEditor
                            content={editedAssessment}
                            onChange={setEditedAssessment}
                          />
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {fixMarkdownFormatting(submissionData.overallAssessment) || "No assessment yet"}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {submissionData.teacherFeedback && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Teacher Feedback</h3>
                    <div className="bg-purple-50 p-4 rounded prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {submissionData.teacherFeedback}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Comments Section */}
                <div className="mt-8">
                  <h3 className="section-title mb-4">Discussion</h3>
                  <CommentsSection submissionId={submissionId} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

// Comments Section Component
const CommentsSection = ({ submissionId }: { submissionId: number }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [images, setImages] = useState<{ preview: string; file: File }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Query to get comments
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["/api/comments", submissionId],
    queryFn: async () => {
      const response = await fetch(`/api/comments/${submissionId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }
      return response.json();
    },
  });

  // Mutation to add a comment
  const addCommentMutation = useMutation({
    mutationFn: async (data: { content: string; images?: File[] }) => {
      const formData = new FormData();
      formData.append("submissionId", submissionId.toString());
      formData.append("content", data.content);
      
      if (data.images && data.images.length > 0) {
        data.images.forEach((image, index) => {
          formData.append(`images`, image);
        });
      }
      
      const response = await fetch('/api/comments', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error("Failed to add comment");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setCommentText("");
      setImages([]);
      refetchComments();
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (droppedFiles.length > 0) {
      const newImages = droppedFiles.map(file => ({
        preview: URL.createObjectURL(file),
        file
      }));
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files).filter(file => 
        file.type.startsWith('image/')
      );
      
      const newImages = selectedFiles.map(file => ({
        preview: URL.createObjectURL(file),
        file
      }));
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const updated = [...prev];
      // Revoke object URL to avoid memory leaks
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && images.length === 0) {
      toast({
        title: "Error",
        description: "Please enter a comment or attach an image",
        variant: "destructive",
      });
      return;
    }
    
    addCommentMutation.mutate({ 
      content: commentText,
      images: images.map(img => img.file)
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {comments.length > 0 ? (
          comments.map((comment: any) => (
            <div key={comment.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <div className="font-medium">{comment.userName}</div>
                  <div className="text-gray-500 text-sm ml-2">
                    {formatDate(comment.createdAt)}
                  </div>
                </div>
                <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {comment.userRole}
                </div>
              </div>
              
              <div className="mt-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {comment.content}
                </ReactMarkdown>
              </div>
              
              {comment.imageUrls && comment.imageUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {comment.imageUrls.map((url: string, i: number) => (
                    <a 
                      key={i} 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block"
                    >
                      <img 
                        src={url} 
                        alt={`Comment attachment ${i+1}`} 
                        className="h-24 w-auto rounded border object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-4">No comments yet. Start the conversation!</p>
        )}
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="text-sm font-medium mb-3">Add Your Comment</h4>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="w-full p-2 border rounded-md min-h-[100px]"
            placeholder="Write your comment here..."
          />

          {/* Image upload area */}
          <div 
            className="border-2 border-dashed rounded-lg p-4 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleImageDrop}
          >
            <p className="text-sm text-gray-600 mb-2">
              Drag and drop images here, or{" "}
              <button 
                type="button"
                className="text-blue-500"
                onClick={() => fileInputRef.current?.click()}
              >
                browse
              </button>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>

          {/* Image previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={image.preview}
                    alt={`Preview ${index}`}
                    className="h-24 w-full object-cover rounded border"
                  />
                  <button
                    type="button"
                    className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full text-xs"
                    onClick={() => removeImage(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={addCommentMutation.isPending || (!commentText.trim() && images.length === 0)}
            >
              {addCommentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post Comment"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};