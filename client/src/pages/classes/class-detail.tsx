import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Class, Branch, User } from "@shared/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { useToast } from "@/hooks/use-toast";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, ArrowLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface TeacherWithRoles extends User {
  isLead: boolean;
  hasAccess: boolean;
}

export default function ClassDetail() {
  const { user } = useAuth();
  const role = user?.role || "TEACHER";
  const basePath = role === "ADMIN" ? "/admin" : "/teacher";
  const canManageStudents = role === "ADMIN" || role === "TEACHER";

  // Match both admin and teacher routes
  const [, adminParams] = useRoute("/admin/classes/:id");
  const [, teacherParams] = useRoute("/teacher/classes/:id");
  const params = adminParams || teacherParams;

  const [, navigate] = useLocation();
  const classId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAssignTeacherDialogOpen, setIsAssignTeacherDialogOpen] = useState(false);
  const [isAssignStudentDialogOpen, setIsAssignStudentDialogOpen] = useState(false);

  const { data: classData, isLoading: isClassLoading } = useQuery<Class>({
    queryKey: ["/api/classes", classId],
    queryFn: async () => {
      if (!classId) throw new Error("Class ID is required");
      const response = await fetch(`/api/classes/${classId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch class");
      }
      return response.json();
    },
    enabled: !!classId,
    retry: 1,
  });

  const { data: branchData } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: teachers = [] } = useQuery<User[]>({
    queryKey: ["/api/teachers"],
    enabled: role === "ADMIN", // Only fetch teachers list for admin
  });

  const { data: assignedTeachers = [] } = useQuery<TeacherWithRoles[]>({
    queryKey: ["/api/classes", classId, "teachers"],
    enabled: !!classId,
    queryFn: async () => {
      if (!classId) throw new Error("Class ID is required");
      const response = await fetch(`/api/classes/${classId}/teachers`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch assigned teachers");
      }
      return response.json();
    },
  });

  const { data: students = [] } = useQuery<User[]>({
    queryKey: ["/api/students", classData?.branchId],
    enabled: !!classData?.branchId && canManageStudents, // Allow both ADMIN and TEACHER to fetch students
  });

  const { data: assignedStudents = [] } = useQuery<User[]>({
    queryKey: ["/api/classes", classId, "students"],
    enabled: !!classId,
    queryFn: async () => {
      if (!classId) throw new Error("Class ID is required");
      const response = await fetch(`/api/classes/${classId}/students`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch assigned students");
      }
      return response.json();
    },
  });

  const assignStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      // Prevent duplicate assignments
      const isAlreadyAssigned = assignedStudents.some(student => student.id === studentId);
      if (isAlreadyAssigned) {
        throw new Error("Student is already assigned to this class");
      }

      const response = await fetch(`/api/classes/${classId}/students/${studentId}`, {
        method: "PUT",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to assign student");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes", classId, "students"] });
    },
    onError: (error: Error) => {
      // Only show error toast for non-duplicate assignments
      if (!error.message.includes("already assigned")) {
        toast({
          title: "Error",
          description: error.message || "Failed to assign student",
          variant: "destructive",
        });
      }
    },
  });

  const removeStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      const response = await fetch(`/api/classes/${classId}/students/${studentId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to remove student");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes", classId, "students"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove student",
        variant: "destructive",
      });
    },
  });


  if (isClassLoading) {
    return <div>Loading...</div>;
  }

  if (!classData) {
    return <div>Class not found</div>;
  }

  const branch = branchData?.find(b => b.id === classData.branchId);

  // Only admin can assign/remove teachers and modify roles
  const handleAssignTeacher = async (teacherId: number, isLead: boolean, hasAccess: boolean) => {
    if (role !== "ADMIN") return;

    try {
      const response = await fetch(`/api/classes/${classId}/teachers/${teacherId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLead, hasAccess }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update teacher roles");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/classes", classId, "teachers"] });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update teacher roles",
        variant: "destructive",
      });
    }
  };

  const handleRemoveTeacher = async (teacherId: number) => {
    if (role !== "ADMIN") return;

    if (!confirm("Are you sure you want to remove this teacher from the class?")) return;

    try {
      const response = await fetch(`/api/classes/${classId}/teachers/${teacherId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to remove teacher");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/classes", classId, "teachers"] });
      toast({
        title: "Success",
        description: "Teacher removed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove teacher",
        variant: "destructive",
      });
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
            onClick={() => navigate(`${basePath}/classes`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Classes List
          </Button>

          {/* Class Info Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{classData.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium">Branch</p>
                  <p className="text-lg">{branch?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">English Level</p>
                  <p className="text-lg">{classData.englishLevel || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Age Group</p>
                  <p className="text-lg">{classData.ageGroup || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teachers Section */}
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Teachers</CardTitle>
              {role === "ADMIN" && (
                <Button onClick={() => setIsAssignTeacherDialogOpen(true)}>
                  Assign Teacher
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[100px] text-center">Lead</TableHead>
                    <TableHead className="w-[100px] text-center">Access</TableHead>
                    {role === "ADMIN" && <TableHead className="w-[100px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedTeachers
                    .filter(teacher => teacher.hasAccess)
                    .map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell>{teacher.name}</TableCell>
                        <TableCell>{teacher.email}</TableCell>
                        <TableCell className="text-center">
                          {teacher.isLead ? <Check className="mx-auto" /> : <X className="mx-auto text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="text-center">
                          {teacher.hasAccess ? <Check className="mx-auto" /> : <X className="mx-auto text-muted-foreground" />}
                        </TableCell>
                        {role === "ADMIN" && (
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveTeacher(teacher.id)}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Students Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Students</CardTitle>
              {canManageStudents && (
                <Button onClick={() => setIsAssignStudentDialogOpen(true)}>
                  Assign Students
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignedStudents.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {assignedStudents.map((student) => (
                      <div
                        key={student.id}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-secondary rounded-full"
                      >
                        <span>{student.name}</span>
                        {canManageStudents && (
                          <button
                            onClick={() => removeStudentMutation.mutate(student.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No students assigned</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assign Teacher Dialog - Only for Admin */}
          {role === "ADMIN" && (
            <Dialog
              open={isAssignTeacherDialogOpen}
              onOpenChange={setIsAssignTeacherDialogOpen}
            >
              <DialogContent
                className="sm:max-w-[625px] max-h-[80vh]"
                onPointerDownOutside={(e) => e.preventDefault()} // Prevent closing on outside click
                onInteractOutside={(e) => e.preventDefault()} // Prevent closing on outside interaction
              >
                <DialogHeader>
                  <DialogTitle>Assign Teachers to {classData.name}</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    Select teachers to assign to this class. Teachers can be given lead and access permissions.
                  </p>
                </DialogHeader>
                <div className="mt-4 overflow-y-auto" style={{ maxHeight: "calc(80vh - 200px)" }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-[80px] text-center">Lead</TableHead>
                        <TableHead className="w-[80px] text-center">Access</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teachers?.map((teacher) => {
                        const assignedTeacher = assignedTeachers.find(
                          (at) => at.id === teacher.id
                        );
                        return (
                          <TableRow key={teacher.id}>
                            <TableCell>{teacher.name}</TableCell>
                            <TableCell>{teacher.email}</TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={assignedTeacher?.isLead}
                                onCheckedChange={(checked) => {
                                  handleAssignTeacher(
                                    teacher.id,
                                    checked as boolean,
                                    assignedTeacher?.hasAccess || false
                                  );
                                }}
                                onClick={(e) => e.stopPropagation()} // Stop event propagation
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={assignedTeacher?.hasAccess}
                                onCheckedChange={(checked) => {
                                  handleAssignTeacher(
                                    teacher.id,
                                    assignedTeacher?.isLead || false,
                                    checked as boolean
                                  );
                                }}
                                onClick={(e) => e.stopPropagation()} // Stop event propagation
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Assign Student Dialog - For both Admin and Teacher */}
          {canManageStudents && (
            <Dialog
              open={isAssignStudentDialogOpen}
              onOpenChange={setIsAssignStudentDialogOpen}
            >
              <DialogContent className="sm:max-w-[625px] max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Assign Students to {classData.name}</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    Select students to assign to this class.
                  </p>
                </DialogHeader>
                <div className="mt-4 overflow-y-auto" style={{ maxHeight: "calc(80vh - 200px)" }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="w-[80px] text-center">Assign</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...students]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((student) => {
                          const isAssigned = assignedStudents.find(
                            (as) => as.id === student.id
                          );
                          return (
                            <TableRow key={student.id}>
                              <TableCell>{student.name}</TableCell>
                              <TableCell>{student.email}</TableCell>
                              <TableCell>{student.phone_number || "-"}</TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={!!isAssigned}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      assignStudentMutation.mutate(student.id);
                                    } else {
                                      removeStudentMutation.mutate(student.id);
                                    }
                                  }}
                                  disabled={
                                    assignStudentMutation.isPending ||
                                    removeStudentMutation.isPending
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </main>
    </div>
  );
}