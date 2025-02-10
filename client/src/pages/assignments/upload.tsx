import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";
import { useState } from "react";
import type { Assignment } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface UploadFile extends File {
  preview: string;
  studentId?: number;
  id: string;
}

export default function UploadAssignment() {
  const [, params] = useRoute("/assignments/:id/upload");
  const assignmentId = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const { user } = useAuth();

  const { data: assignment } = useQuery<Assignment>({
    queryKey: ["/api/assignments", assignmentId],
    queryFn: async () => {
      const response = await fetch(`/api/assignments/${assignmentId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch assignment");
      }
      return response.json();
    },
    enabled: !!assignmentId,
  });

  const { data: students } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/classes", assignment?.classId, "students"],
    queryFn: async () => {
      const response = await fetch(`/api/classes/${assignment?.classId}/students`);
      if (!response.ok) {
        throw new Error("Failed to fetch students");
      }
      return response.json();
    },
    enabled: !!assignment?.classId,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!assignmentId) throw new Error("Assignment ID is required");
      if (files.length === 0) throw new Error("No files selected");
      if (files.some(f => !f.studentId)) throw new Error("Please assign all files to students");

      // Upload each file individually
      const results = await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("assignmentId", assignmentId);
          formData.append("studentId", file.studentId!.toString());

          console.log('Uploading file:', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            studentId: file.studentId
          });

          const res = await apiRequest("POST", "/api/submissions/upload", formData, {
            credentials: 'include',
            headers: {
              // Remove Content-Type header to let the browser set it with the boundary
              'Accept': 'application/json',
            },
          });

          if (!res.ok) {
            const text = await res.text();
            console.error("Upload failed with response:", text);
            throw new Error(text || res.statusText || `Error: ${res.status}`);
          }

          return res.json();
        })
      );

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({
        title: "Success",
        description: "Homework files uploaded successfully",
      });
      navigate(`/assignments/${assignmentId}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
    },
  });

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).map((file) => {
      const id = generateUUID();
      return {
        ...file,
        preview: URL.createObjectURL(file),
        id,
      } as UploadFile;
    });
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>
                Upload Homework - {assignment?.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="border-2 border-dashed rounded-lg p-8 text-center"
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600">
                    Drag and drop homework images here, or{" "}
                    <label className="text-blue-500 cursor-pointer">
                      browse
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          const selectedFiles = Array.from(
                            e.target.files || []
                          ).map((file) => {
                            const id = generateUUID();
                            return {
                              ...file,
                              preview: URL.createObjectURL(file),
                              id,
                            } as UploadFile;
                          });
                          setFiles((prev) => [...prev, ...selectedFiles]);
                        }}
                      />
                    </label>
                  </p>
                </div>

                {files.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="relative border rounded-lg p-2"
                      >
                        <img
                          src={file.preview}
                          alt="preview"
                          className="w-full h-40 object-cover rounded"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-1 right-1"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <select
                          className="mt-2 w-full p-1 text-sm border rounded"
                          value={file.studentId}
                          onChange={(e) => {
                            setFiles((prev) =>
                              prev.map((f) =>
                                f.id === file.id
                                  ? { ...f, studentId: Number(e.target.value) }
                                  : f
                              )
                            );
                          }}
                        >
                          <option value="">Assign to student</option>
                          {students?.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/assignments/${assignmentId}`)}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={
                      uploadMutation.isPending ||
                      files.length === 0 ||
                      files.some(f => !f.studentId)
                    }
                    onClick={() => uploadMutation.mutate()}
                  >
                    Upload Files
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}