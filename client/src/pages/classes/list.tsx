import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Class, Branch } from "@shared/schema";
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
import { useLocation } from "wouter";
import { CreateClassDialog } from "./create-dialog";
import { ManageOptionsDialog } from "./manage-options-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

type ClassWithStats = Class & {
  branch?: Branch;
  studentCount: number;
  teacherCount: number;
};

export default function ClassList() {
  const [isCreateClassDialogOpen, setIsCreateClassDialogOpen] = useState(false);
  const [isManageOptionsDialogOpen, setIsManageOptionsDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: classes, isLoading: isClassesLoading } = useQuery<ClassWithStats[]>({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const [classesResponse, branchesResponse] = await Promise.all([
        fetch("/api/classes"),
        fetch("/api/branches"),
      ]);

      if (!classesResponse.ok || !branchesResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const [classes, branches] = await Promise.all([
        classesResponse.json(),
        branchesResponse.json(),
      ]);

      // Return classes with branch info and stats
      return classes.map((cls: Class) => ({
        ...cls,
        branch: branches.find((b: Branch) => b.id === cls.branchId),
        studentCount: 0, // Will be updated by the server
        teacherCount: 0, // Will be updated by the server
      }));
    },
  });

  const handleDeleteClass = async (classId: number) => {
    if (!confirm("Are you sure you want to delete this class?")) return;

    try {
      // First delete related records
      await fetch(`/api/classes/${classId}/teachers`, { method: "DELETE" });
      await fetch(`/api/classes/${classId}/students`, { method: "DELETE" });
      await fetch(`/api/classes/${classId}/assignments`, { method: "DELETE" });

      // Then delete the class itself
      const response = await fetch(`/api/classes/${classId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete class");

      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({
        title: "Success",
        description: "Class deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete class",
        variant: "destructive",
      });
    }
  };

  if (isClassesLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Class Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Total Classes</p>
                  <p className="text-2xl">{classes?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">Classes</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsManageOptionsDialogOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Options
              </Button>
            </div>
            <Button
              onClick={() => {
                setSelectedClass(null);
                setIsCreateClassDialogOpen(true);
              }}
            >
              Add Class
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Class Name</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>English Level</TableHead>
                <TableHead>Age Group</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Teachers</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes?.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell>{cls.id}</TableCell>
                  <TableCell>{cls.name}</TableCell>
                  <TableCell>{cls.branch?.name || "-"}</TableCell>
                  <TableCell>{cls.englishLevel || "-"}</TableCell>
                  <TableCell>{cls.ageGroup || "-"}</TableCell>
                  <TableCell>{cls.studentCount}</TableCell>
                  <TableCell>{cls.teacherCount}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mr-2"
                      onClick={() => setLocation(`/admin/classes/${cls.id}`)}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mr-2"
                      onClick={() => {
                        setSelectedClass(cls);
                        setIsCreateClassDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClass(cls.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <CreateClassDialog
            open={isCreateClassDialogOpen}
            onOpenChange={(open) => {
              setIsCreateClassDialogOpen(open);
              if (!open) setSelectedClass(null);
            }}
            classToEdit={selectedClass}
          />

          <ManageOptionsDialog
            open={isManageOptionsDialogOpen}
            onOpenChange={setIsManageOptionsDialogOpen}
          />
        </div>
      </main>
    </div>
  );
}