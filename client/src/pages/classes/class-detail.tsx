import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Class, Branch, User } from "@shared/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { useToast } from "@/hooks/use-toast";
import { useRoute, useLocation } from "wouter";
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

interface TeacherWithRoles extends User {
  isLead: boolean;
  hasAccess: boolean;
}

export default function ClassDetail() {
  const [, params] = useRoute("/admin/classes/:id");
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
      if (!response.ok) throw new Error("Failed to fetch class");
      return response.json();
    },
    enabled: !!classId,
  });

  const { data: branchData } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: teachers = [] } = useQuery<User[]>({
    queryKey: ["/api/teachers"],
  });

  const { data: assignedTeachers = [] } = useQuery<TeacherWithRoles[]>({
    queryKey: ["/api/classes", classId, "teachers"],
    enabled: !!classId,
    queryFn: async () => {
      if (!classId) throw new Error("Class ID is required");
      const response = await fetch(`/api/classes/${classId}/teachers`);
      if (!response.ok) throw new Error("Failed to fetch assigned teachers");
      return response.json();
    },
  });

  const { data: students = [] } = useQuery<User[]>({
    queryKey: ["/api/students", classData?.branchId],
    enabled: !!classData?.branchId,
    queryFn: async () => {
      const response = await fetch(`/api/students?branchId=${classData?.branchId}`);
      if (!response.ok) throw new Error("Failed to fetch students");
      return response.json();
    },
  });

  const { data: assignedStudents = [] } = useQuery<User[]>({
    queryKey: ["/api/classes", classId, "students"],
    enabled: !!classId,
    queryFn: async () => {
      if (!classId) throw new Error("Class ID is required");
      const response = await fetch(`/api/classes/${classId}/students`);
      if (!response.ok) throw new Error("Failed to fetch assigned students");
      return response.json();
    },
  });

  if (isClassLoading) {
    return <div>Loading...</div>;
  }

  if (!classData) {
    return <div>Class not found</div>;
  }

  const branch = branchData?.find(b => b.id === classData.branchId);

  const handleAssignTeacher = async (teacherId: number, isLead: boolean, hasAccess: boolean) => {
    try {
      const response = await fetch(`/api/classes/${classId}/teachers/${teacherId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLead, hasAccess }),
      });

      if (!response.ok) throw new Error("Failed to update teacher roles");

      queryClient.invalidateQueries({ queryKey: ["/api/classes", classId, "teachers"] });
      toast({
        title: "Success",
        description: "Teacher roles updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update teacher roles",
        variant: "destructive",
      });
    }
  };

  const handleRemoveTeacher = async (teacherId: number) => {
    if (!confirm("Are you sure you want to remove this teacher from the class?")) return;

    try {
      const response = await fetch(`/api/classes/${classId}/teachers/${teacherId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove teacher");

      queryClient.invalidateQueries({ queryKey: ["/api/classes", classId, "teachers"] });
      toast({
        title: "Success",
        description: "Teacher removed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove teacher",
        variant: "destructive",
      });
    }
  };

  const handleAssignStudent = async (studentId: number) => {
    try {
      const response = await fetch(`/api/classes/${classId}/students/${studentId}`, {
        method: "PUT",
      });

      if (!response.ok) throw new Error("Failed to assign student");

      queryClient.invalidateQueries({ queryKey: ["/api/classes", classId, "students"] });
      toast({
        title: "Success",
        description: "Student assigned successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign student",
        variant: "destructive",
      });
    }
  };

  const handleRemoveStudent = async (studentId: number) => {
    if (!confirm("Are you sure you want to remove this student from the class?")) return;

    try {
      const response = await fetch(`/api/classes/${classId}/students/${studentId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove student");

      queryClient.invalidateQueries({ queryKey: ["/api/classes", classId, "students"] });
      toast({
        title: "Success",
        description: "Student removed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove student",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Added Back Button */}
          <Button
            variant="outline"
            className="mb-4"
            onClick={() => {
              const { data: user } = queryClient.getQueryData(["/api/user"]) || {};
              const route = user?.role === "ADMIN" ? "/admin/classes" : "/teacher/classes";
              navigate(route);
            }}
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
              <Button onClick={() => setIsAssignTeacherDialogOpen(true)}>
                Assign Teacher
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[100px] text-center">Lead</TableHead>
                    <TableHead className="w-[100px] text-center">Access</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
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
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveTeacher(teacher.id)}
                          >
                            Remove
                          </Button>
                        </TableCell>
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
              <Button onClick={() => setIsAssignStudentDialogOpen(true)}>
                Assign Students
              </Button>
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
                        <button
                          onClick={() => handleRemoveStudent(student.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No students assigned</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assign Teacher Dialog */}
          <Dialog
            open={isAssignTeacherDialogOpen}
            onOpenChange={setIsAssignTeacherDialogOpen}
          >
            <DialogContent className="sm:max-w-[625px] max-h-[80vh]">
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
                    {teachers.map((teacher) => {
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
          {/* Assign Student Dialog */}
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
                    {students.map((student) => {
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
                                  handleAssignStudent(student.id);
                                } else {
                                  handleRemoveStudent(student.id);
                                }
                              }}
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
        </div>
      </main>
    </div>
  );
}