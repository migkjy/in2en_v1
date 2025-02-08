import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { useToast } from "@/hooks/use-toast";
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
import { useLocation } from "wouter";
import { CreateStudentDialog } from "./create-dialog";

export default function StudentList() {
  const [isCreateStudentDialogOpen, setIsCreateStudentDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: students, isLoading: isStudentsLoading } = useQuery<User[]>({
    queryKey: ["/api/students"],
    queryFn: async () => {
      const response = await fetch("/api/students");
      if (!response.ok) {
        throw new Error("Failed to fetch students");
      }
      return response.json();
    },
  });

  const handleDeleteStudent = async (studentId: number) => {
    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete student");

      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive",
      });
    }
  };

  if (isStudentsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Student Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Total Students</p>
                  <p className="text-2xl">{students?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Students</h2>
            <Button
              onClick={() => {
                setIsCreateStudentDialogOpen(true);
              }}
            >
              Add Student
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students?.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.id}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mr-2"
                      onClick={() => setLocation(`/admin/students/${student.id}`)}
                    >
                      View
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteStudent(student.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <CreateStudentDialog
            open={isCreateStudentDialogOpen}
            onOpenChange={setIsCreateStudentDialogOpen}
          />
        </div>
      </main>
    </div>
  );
}