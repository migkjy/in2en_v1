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

interface UploadFile extends File {
  preview: string;
  studentId?: number;
}

export default function UploadAssignment() {
  const [, params] = useRoute("/assignments/:id/upload");
  const assignmentId = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [files, setFiles] = useState<UploadFile[]>([]);

  // Get assignment details
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

  // Get students list for this assignment's class
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
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
        if (file.studentId) {
          formData.append("studentIds", file.studentId.toString());
        }
      });
      formData.append("assignmentId", assignmentId!);

      const res = await apiRequest("POST", "/api/submissions/upload", formData);
      return res.json();
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
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).map((file) => ({
      ...file,
      preview: URL.createObjectURL(file),
    }));
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
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
                          ).map((file) => ({
                            ...file,
                            preview: URL.createObjectURL(file),
                          }));
                          setFiles((prev) => [...prev, ...selectedFiles]);
                        }}
                      />
                    </label>
                  </p>
                </div>

                {files.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div
                        key={index}
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
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <select
                          className="mt-2 w-full p-1 text-sm border rounded"
                          value={file.studentId}
                          onChange={(e) => {
                            const newFiles = [...files];
                            newFiles[index] = {
                              ...file,
                              studentId: Number(e.target.value),
                            };
                            setFiles(newFiles);
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