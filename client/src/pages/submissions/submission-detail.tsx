import "./submission-detail.css";

import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Submission, User, Assignment, Comment } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  Loader2,
  ArrowLeft,
  Edit2 as Edit,
  Save,
  Send,
  Upload,
  X,
  Image as ImageIcon,
  User as UserIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MDEditor from "@uiw/react-md-editor";
import React, { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

interface SubmissionResponse extends Submission {
  assignment: Assignment;
  student: User;
}

// Markdown Editor Component
const RichTextEditor = ({
  content,
  onChange,
}: {
  content: string;
  onChange: (text: string) => void;
}) => {
  return (
    <MDEditor
      value={content}
      onChange={(val) => onChange(val || "")}
      preview="live"
      height={400}
    />
  );
};

const fixMarkdownFormatting = (text: string) => {
  if (!text) return "";
  return text
    .replace(/(\w+|\S)(\*\*)/g, "$1 $2")
    .replace(/(\*\*)(\w+|\S)/g, "$1 $2");
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
        data,
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
        <main className="flex-1 p-8 mt-14">
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

  const { assignment, student } = submissionData;
  const isTeacherOrAdmin = user.role === "TEACHER" || user.role === "ADMIN";
  const basePath =
    user.role === "ADMIN" ? "/admin/assignments" : "/teacher/assignments";

  const handleStartEdit = (type: "corrections" | "assessment") => {
    if (type === "corrections") {
      setEditedCorrections(submissionData.correctedText || "");
      setIsEditingCorrections(true);
    } else {
      setEditedAssessment(submissionData.overallAssessment || "");
      setIsEditingAssessment(true);
    }
  };

  const handleSave = (type: "corrections" | "assessment") => {
    if (type === "corrections") {
      updateSubmissionMutation.mutate({ correctedText: editedCorrections });
    } else {
      updateSubmissionMutation.mutate({ overallAssessment: editedAssessment });
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto mt-14">
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
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>
                {assignment?.title} - {student?.name || 'Unknown Student'}
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
                    <div className="relative group cursor-pointer w-full max-w-2xl mx-auto">
                      <img
                        src={submissionData.imageUrl}
                        alt="Submitted homework"
                        className="w-full rounded-lg shadow-md group-hover:shadow-lg transition-shadow"
                      />
                      <div
                        className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 flex items-center justify-center rounded-lg transition-opacity"
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = submissionData.imageUrl!;
                          link.download = `submission-${submissionData.id}.jpg`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                      >
                        <span className="bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to download
                        </span>
                      </div>
                    </div>
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

                {(submissionData.correctedText ||
                  submissionData.overallAssessment ||
                  isTeacherOrAdmin) && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="section-title">Corrections</h3>
                        {isTeacherOrAdmin && (
                          <div className="flex gap-2">
                            {isEditingCorrections ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSave("corrections")}
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
                                onClick={() => handleStartEdit("corrections")}
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
                            {submissionData.correctedText ||
                              "No corrections yet"}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="section-title">Assessment</h3>
                        {isTeacherOrAdmin && (
                          <div className="flex gap-2">
                            {isEditingAssessment ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSave("assessment")}
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
                                onClick={() => handleStartEdit("assessment")}
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
                            {fixMarkdownFormatting(
                              submissionData.overallAssessment,
                            ) || "No assessment yet"}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {submissionData.teacherFeedback && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      Teacher Feedback
                    </h3>
                    <div className="bg-purple-50 p-4 rounded prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {submissionData.teacherFeedback}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Comments Section */}
                <CommentsSection submissionId={submissionData.id} />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

// Comment Type interface
interface CommentWithUser extends Comment {
  user: {
    id: number;
    name: string;
    role: string;
  };
}

// Image Preview Type
interface ImagePreview {
  id: string;
  file: File;
  preview: string;
}

const CommentsSection = ({ submissionId }: { submissionId: number }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [images, setImages] = useState<ImagePreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Fetch comments
  const {
    data: comments = [],
    isLoading,
    refetch,
  } = useQuery<CommentWithUser[]>({
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


  // Post comment mutation
  const postCommentMutation = useMutation({
    mutationFn: async () => {
      if (!commentText.trim() && images.length === 0) {
        throw new Error("Please provide a comment or an image");
      }

      // First upload all images if any
      const imageUrls: string[] = [];

      if (images.length > 0) {
        for (const image of images) {
          const formData = new FormData();
          formData.append("file", image.file);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error("Failed to upload image");
          }

          const result = await response.json();
          imageUrls.push(result.url);
        }
      }

      // Create content with text and image URLs
      const content = {
        text: commentText.trim(),
        imageUrls: imageUrls,
      };

      // Post the comment
      const response = await apiRequest("POST", "/api/comments", {
        submissionId,
        content: JSON.stringify(content),
      });

      if (!response.ok) {
        throw new Error("Failed to post comment");
      }

      return response.json();
    },
    onSuccess: () => {
      setCommentText("");
      setImages([]);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to post comment",
        variant: "destructive",
      });
    },
  });

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (imageFiles.length === 0) {
      toast({
        title: "Invalid Files",
        description: "Only image files are allowed",
        variant: "destructive",
      });
      return;
    }

    // Process and compress each image before adding to state
    imageFiles.forEach((file) => {
      compressImage(file)
        .then((compressedFile) => {
          const newImage = {
            id: Math.random().toString(36).substring(2),
            file: compressedFile,
            preview: URL.createObjectURL(compressedFile),
          };
          setImages((prev) => [...prev, newImage]);
        })
        .catch((err) => {
          console.error("Error compressing image:", err);
          toast({
            title: "Error",
            description: "Failed to process image",
            variant: "destructive",
          });
        });
    });
  };

  // Function to compress images before upload
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for resizing
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          // Calculate new dimensions (max 800px width or height)
          let width = img.width;
          let height = img.height;
          const maxSize = 800;

          if (width > height && width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }

          // Resize image
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to blob with reduced quality
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to compress image"));
                return;
              }

              // Create new file from blob
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            "image/jpeg",
            0.7,
          ); // 70% quality JPEG
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const updated = prev.filter((img) => img.id !== id);
      // Revoke object URLs to avoid memory leaks
      const removed = prev.find((img) => img.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    postCommentMutation.mutate();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const renderCommentContent = (content: string) => {
    try {
      const parsedContent = JSON.parse(content);
      return (
        <div>
          {parsedContent.text && (
            <p className="text-gray-800 whitespace-pre-wrap mb-2">
              {parsedContent.text}
            </p>
          )}
          {parsedContent.imageUrls && parsedContent.imageUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {parsedContent.imageUrls.map((url: string, index: number) => (
                <div
                  key={index}
                  className="relative group cursor-pointer"
                  onClick={() => {
                    // Handle image download
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `comment-image-${index + 1}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <img
                    src={url}
                    alt={`Image ${index + 1}`}
                    className="max-h-40 rounded shadow-sm group-hover:shadow-md transition-shadow"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                    <span className="text-transparent group-hover:text-white text-xs font-medium transition-colors">
                      Click to download
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    } catch (e) {
      // Fallback for old comments
      return <p className="text-gray-800 whitespace-pre-wrap">{content}</p>;
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium mb-4">Comments</h3>

      <div className="space-y-4 max-h-96 overflow-y-auto mb-4 p-2">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No comments yet</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 p-3 rounded-lg bg-gray-50"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback
                  className={
                    comment.user.role === "TEACHER" ||
                    comment.user.role === "ADMIN"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                  }
                >
                  {getInitials(comment.user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">
                    {comment.user.name}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full 
                    ${comment.user.role === 'TEACHER' || comment.user.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'}"
                  >
                    {comment.user.role === "ADMIN"
                      ? "TEACHER"
                      : comment.user.role}
                  </span>
                  <span className="text-xs text-gray-500">
                    {format(
                      new Date(comment.createdAt),
                      "MMM d, yyyy • h:mm a",
                    )}
                  </span>
                </div>
                {renderCommentContent(comment.content)}
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
        <div
          className={`p-4 border-2 border-dashed rounded-lg mb-3 ${images.length > 0 ? "border-gray-300 bg-gray-50" : "border-gray-200"}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {images.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.preview}
                    alt="Preview"
                    className="h-24 w-full object-cover rounded"
                  />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm opacity-80 group-hover:opacity-100"
                    onClick={() => removeImage(img.id)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div
                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      const link = document.createElement("a");
                      link.href = img.preview;
                      link.download =
                        img.file.name || `preview-image-${img.id}.jpg`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    <span className="text-transparent group-hover:text-white text-xs font-medium transition-colors">
                      Click to download
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <ImageIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Drag and drop images here, or
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                browse files
              </button>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
          />
        </div>

        <div className="flex gap-2">
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 min-h-20"
          />
          <Button
            type="submit"
            className="self-end"
            disabled={
              postCommentMutation.isPending ||
              (commentText.trim() === "" && images.length === 0)
            }
          >
            {postCommentMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Post
          </Button>
        </div>
      </form>
    </div>
  );
};