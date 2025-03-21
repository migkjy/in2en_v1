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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner"; // Added import

// Add interface for class with stats
interface ClassWithStats extends Class {
  studentCount: number;
  teacherCount: number;
}

export default function ClassList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isManageOptionsOpen, setIsManageOptionsOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  const { user } = useAuth();
  const role = user?.role || "TEACHER";
  const basePath = role === "ADMIN" ? "/admin" : "/teacher";

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: classes, isLoading: isClassesLoading } = useQuery<
    ClassWithStats[]
  >({
    queryKey: ["/api/classes", selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBranch !== "all") {
        params.append("branchId", selectedBranch);
      }
      const response = await fetch(`/api/classes?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch classes");
      }
      return response.json();
    },
  });

  const handleDeleteClass = async (classId: number) => {
    if (!confirm("Are you sure you want to delete this class?")) return;

    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete class");

      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: ["/api/classes", selectedBranch],
      });
      queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}`] });

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
    return <LoadingSpinner />; // Changed loading indicator
  }

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto mt-14">
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
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>Classes Management</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  {role === "ADMIN" && (
                    <>
                      <Button
                        onClick={() => setIsManageOptionsOpen(true)}
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Manage Options
                      </Button>
                      <Button 
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="w-full sm:w-auto"
                      >
                        Create New Class
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <label className="text-sm font-medium block mb-2">
                  Filter by Branch
                </label>
                <Select
                  value={selectedBranch}
                  onValueChange={setSelectedBranch}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches?.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>English Level</TableHead>
                    <TableHead>Age Group</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Teachers</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes?.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell>{cls.name}</TableCell>
                      <TableCell>
                        {branches?.find((b) => b.id === cls.branchId)?.name ||
                          "-"}
                      </TableCell>
                      <TableCell>{cls.englishLevel || "-"}</TableCell>
                      <TableCell>{cls.ageGroup || "-"}</TableCell>
                      <TableCell>{cls.studentCount || 0}</TableCell>
                      <TableCell>{cls.teacherCount || 0}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2"
                          onClick={() =>
                            navigate(`${basePath}/classes/${cls.id}`)
                          }
                        >
                          View Details
                        </Button>
                        {role === "ADMIN" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-2"
                              onClick={() => {
                                setSelectedClass(cls);
                                setIsCreateDialogOpen(true);
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
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>

      <CreateClassDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        classToEdit={selectedClass}
      />

      <ManageOptionsDialog
        open={isManageOptionsOpen}
        onOpenChange={setIsManageOptionsOpen}
      />
    </div>
  );
}