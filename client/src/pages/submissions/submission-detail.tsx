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
                
                <CommentsSection submissionId={submissionId} />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

// Comment component types
interface Comment {
  id: number;
  submissionId: number;
  userId: number;
  content: string;
  imageUrl?: string;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    role: string;
  };
}

interface CommentFormProps {
  submissionId: number;
  onCommentAdded: () => void;
  replyToId?: number;
  onCancelReply?: () => void;
}

// Comment form component with image upload
const CommentForm = ({ submissionId, onCommentAdded, replyToId, onCancelReply }: CommentFormProps) => {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const selectedFile = files[0];
    // Check file size (limit to 1MB)
    if (selectedFile.size > 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be less than 1MB in size",
        variant: "destructive",
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
    setImage(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleImageChange(e.dataTransfer.files);
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !image) {
      toast({
        title: "Error",
        description: "Please enter a comment or attach an image",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Prepare data
      let imageUrl = null;
      
      // If there's an image, upload it first
      if (image) {
        const formData = new FormData();
        formData.append("file", image);
        
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image");
        }
        
        const uploadResult = await uploadResponse.json();
        imageUrl = uploadResult.url;
      }
      
      // Create the comment
      const commentData = {
        submissionId,
        content: content.trim(),
        imageUrl,
        parentId: replyToId || null,
      };
      
      const response = await apiRequest("POST", "/api/comments", commentData);
      
      if (!response.ok) {
        throw new Error("Failed to post comment");
      }
      
      // Reset form
      setContent("");
      setImage(null);
      setImagePreview(null);
      if (onCancelReply) onCancelReply();
      onCommentAdded();
      
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to post comment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 border rounded-lg">
      <div className="space-y-4">
        {replyToId && (
          <div className="flex justify-between bg-slate-100 p-2 rounded">
            <span className="text-sm text-slate-500">Replying to comment</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancelReply}
              className="h-6 p-0 text-slate-500"
            >
              Cancel
            </Button>
          </div>
        )}
        
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your comment here..."
          className="w-full p-3 border rounded-md"
          rows={4}
        />
        
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-md p-4 text-center ${
            imagePreview ? "border-green-400" : "border-gray-300"
          }`}
        >
          {imagePreview ? (
            <div className="relative">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-h-40 mx-auto rounded" 
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-0 right-0 rounded-full w-6 h-6 p-0"
                onClick={removeImage}
              >
                ×
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-2">
                Drag and drop an image here, or{" "}
                <label className="text-blue-500 cursor-pointer">
                  browse
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e.target.files)}
                  />
                </label>
              </p>
              <p className="text-xs text-gray-400">Max file size: 1MB</p>
            </>
          )}
        </div>
        
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Post Comment
          </Button>
        </div>
      </div>
    </form>
  );
};

// Comment component
const CommentItem = ({ 
  comment, 
  onReply, 
  isTeacherOrAdmin 
}: { 
  comment: Comment; 
  onReply: (commentId: number) => void;
  isTeacherOrAdmin: boolean;
}) => {
  return (
    <div className="border-b pb-4 mb-4 last:border-0">
      <div className="flex justify-between">
        <div className="flex items-center mb-2">
          <div className="font-medium">{comment.user?.name || "Unknown"}</div>
          <div className="text-xs px-2 py-0.5 bg-gray-100 rounded ml-2">
            {comment.user?.role || ""}
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {new Date(comment.createdAt).toLocaleString()}
        </div>
      </div>
      
      <div className="mt-2 text-sm whitespace-pre-wrap">{comment.content}</div>
      
      {comment.imageUrl && (
        <div className="mt-3">
          <a href={comment.imageUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={comment.imageUrl}
              alt="Comment attachment"
              className="max-h-32 rounded border"
            />
          </a>
        </div>
      )}
      
      {(isTeacherOrAdmin || !comment.user?.role?.includes("STUDENT")) && (
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => onReply(comment.id)}
          >
            Reply
          </Button>
        </div>
      )}
    </div>
  );
};

// Comments section component
const CommentsSection = ({ submissionId }: { submissionId: number }) => {
  const { user } = useAuth();
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [showAllComments, setShowAllComments] = useState(false);
  const isTeacherOrAdmin = user?.role === "TEACHER" || user?.role === "ADMIN";
  const commentsRef = useRef<HTMLDivElement>(null);
  
  // Fetch comments
  const {
    data: comments = [],
    isLoading,
    refetch,
  } = useQuery<Comment[]>({
    queryKey: [`/api/comments/${submissionId}`],
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
  
  const handleCommentAdded = useCallback(() => {
    refetch();
    // Scroll to bottom of comments after a short delay
    setTimeout(() => {
      if (commentsRef.current) {
        commentsRef.current.scrollTop = commentsRef.current.scrollHeight;
      }
    }, 300);
  }, [refetch]);
  
  const displayedComments = showAllComments ? comments : comments.slice(-3);
  const hasMoreComments = comments.length > 3;

  return (
    <div className="mt-6 border rounded-lg p-4 bg-white">
      <h3 className="section-title mb-4">Comments</h3>
      
      {isLoading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          {comments.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No comments yet</p>
          ) : (
            <>
              {hasMoreComments && !showAllComments && (
                <Button
                  variant="ghost"
                  className="w-full text-sm mb-2"
                  onClick={() => setShowAllComments(true)}
                >
                  Show all {comments.length} comments
                </Button>
              )}
              
              <div 
                ref={commentsRef}
                className="space-y-4 max-h-96 overflow-y-auto pr-2"
              >
                {displayedComments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    onReply={setReplyToId}
                    isTeacherOrAdmin={isTeacherOrAdmin}
                  />
                ))}
              </div>
            </>
          )}
          
          {replyToId ? (
            <CommentForm
              submissionId={submissionId}
              onCommentAdded={handleCommentAdded}
              replyToId={replyToId}
              onCancelReply={() => setReplyToId(null)}
            />
          ) : (
            <CommentForm
              submissionId={submissionId}
              onCommentAdded={handleCommentAdded}
            />
          )}
        </>
      )}
    </div>
  );
};