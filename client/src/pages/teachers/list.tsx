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
import { CreateTeacherDialog } from "./create-dialog";
import { useLocation } from "wouter";
import LoadingSpinner from "@/components/LoadingSpinner"; // Assumed component

export default function TeacherList() {
  const [isCreateTeacherDialogOpen, setIsCreateTeacherDialogOpen] =
    useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: teachers, isLoading: isTeachersLoading } = useQuery<User[]>({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const response = await fetch("/api/teachers");
      if (!response.ok) {
        throw new Error("Failed to fetch teachers");
      }
      return response.json();
    },
  });

  const handleDeleteTeacher = async (teacherId: number) => {
    if (!confirm("Are you sure you want to delete this teacher?")) return;

    try {
      const response = await fetch(`/api/teachers/${teacherId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete teacher");

      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      toast({
        title: "Success",
        description: "Teacher deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete teacher",
        variant: "destructive",
      });
    }
  };

  if (isTeachersLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto mt-14">
        <div className="max-w-6xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Teacher Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Total Teachers</p>
                  <p className="text-2xl">{teachers?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Teachers</h2>
            <Button
              onClick={() => {
                setSelectedTeacher(null);
                setIsCreateTeacherDialogOpen(true);
              }}
            >
              Add Teacher
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
              {teachers?.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell>{teacher.id}</TableCell>
                  <TableCell>{teacher.name}</TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mr-2"
                      onClick={() => {
                        setSelectedTeacher(teacher);
                        setIsCreateTeacherDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteTeacher(teacher.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <CreateTeacherDialog
            open={isCreateTeacherDialogOpen}
            onOpenChange={setIsCreateTeacherDialogOpen}
            teacherToEdit={selectedTeacher}
          />
        </div>
      </main>
    </div>
  );
}