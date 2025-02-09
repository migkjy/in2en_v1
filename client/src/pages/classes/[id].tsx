import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Class, Branch, User } from "@shared/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { useToast } from "@/hooks/use-toast";
import { useRoute } from "wouter";
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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export default function ClassDetail() {
  const [, params] = useRoute("/admin/classes/:id");
  const classId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAssignTeacherDialogOpen, setIsAssignTeacherDialogOpen] = useState(false);
  const [isAssignStudentDialogOpen, setIsAssignStudentDialogOpen] = useState(false);

  // 클래스 정보 조회
  const { data: classData, isLoading: isClassLoading } = useQuery<Class & { branch?: Branch }>({
    queryKey: ["/api/classes", classId],
    queryFn: async () => {
      if (!classId) throw new Error("Class ID is required");
      const [classResponse, branchResponse] = await Promise.all([
        fetch(`/api/classes/${classId}`),
        fetch("/api/branches"),
      ]);

      if (!classResponse.ok || !branchResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const classData = await classResponse.json();
      const branches = await branchResponse.json();

      return {
        ...classData,
        branch: branches.find((b: Branch) => b.id === classData.branchId),
      };
    },
    enabled: !!classId,
  });

  // 선생님 목록 조회
  const { data: teachers } = useQuery<User[]>({
    queryKey: ["/api/teachers"],
  });

  // 학생 목록 조회
  const { data: students } = useQuery<User[]>({
    queryKey: ["/api/students"],
  });

  // 클래스에 할당된 선생님 목록
  const { data: assignedTeachers } = useQuery<Array<User & { isLead: boolean; hasAccess: boolean }>>({
    queryKey: ["/api/classes", classId, "teachers"],
    enabled: !!classId,
  });

  // 클래스에 할당된 학생 목록
  const { data: assignedStudents } = useQuery<User[]>({
    queryKey: ["/api/classes", classId, "students"],
    enabled: !!classId,
  });

  if (isClassLoading) {
    return <div>Loading...</div>;
  }

  if (!classData) {
    return <div>Class not found</div>;
  }

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
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{classData.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium">Branch</p>
                  <p className="text-lg">{classData.branch?.name || "-"}</p>
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
                    <TableHead>Roles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedTeachers?.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell>{teacher.name}</TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {teacher.isLead && (
                            <Badge variant="default">Lead</Badge>
                          )}
                          {teacher.hasAccess && (
                            <Badge variant="secondary">Access</Badge>
                          )}
                        </div>
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
                Assign Student
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedStudents?.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveStudent(student.id)}
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

          {/* Assign Teacher Dialog */}
          <Dialog
            open={isAssignTeacherDialogOpen}
            onOpenChange={setIsAssignTeacherDialogOpen}
          >
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>Assign Teachers to {classData.name}</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead>Access</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers?.map((teacher) => {
                      const isAssigned = assignedTeachers?.find(
                        (at) => at.id === teacher.id
                      );
                      return (
                        <TableRow key={teacher.id}>
                          <TableCell>{teacher.name}</TableCell>
                          <TableCell>
                            <Checkbox
                              checked={isAssigned?.isLead}
                              onCheckedChange={() => {
                                // TODO: Implement role toggle
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={isAssigned?.hasAccess}
                              onCheckedChange={() => {
                                // TODO: Implement role toggle
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
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>Assign Students to {classData.name}</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Assign</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students?.map((student) => {
                      const isAssigned = assignedStudents?.find(
                        (as) => as.id === student.id
                      );
                      return (
                        <TableRow key={student.id}>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>
                            <Checkbox
                              checked={!!isAssigned}
                              onCheckedChange={() => {
                                // TODO: Implement student assignment toggle
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
