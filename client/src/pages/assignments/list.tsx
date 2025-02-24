import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import type { Assignment, Branch, Class } from "@shared/schema";
import { format } from "date-fns";
import { useState } from "react";
import { EditAssignmentDialog } from "./edit-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "completed", label: "Completed" },
];

export default function AssignmentList() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [deleteAssignment, setDeleteAssignment] = useState<Assignment | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest(
        "PUT",
        `/api/assignments/${id}`,
        { status }
      );
      if (!response.ok) {
        let error = "Failed to update assignment status";
        try {
          const errorText = await response.text();
          const jsonError = await response.json();
          if(jsonError && jsonError.message) error = jsonError.message;
          else if(errorText) error = errorText;
        } catch(e) {}
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      toast({
        title: "Success",
        description: "Assignment status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update assignment status",
        variant: "destructive",
      });
    },
  });

  const { data: assignments } = useQuery<Assignment[]>({
    queryKey: ["/api/assignments", selectedBranch, selectedClass, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBranch !== "all") {
        params.append("branchId", selectedBranch);
      }
      if (selectedClass !== "all") {
        params.append("classId", selectedClass);
      }
      if (selectedStatus !== "all") {
        params.append("status", selectedStatus);
      }

      const response = await fetch(`/api/assignments?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch assignments");
      return response.json();
    },
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: classes } = useQuery<Class[]>({
    queryKey: ["/api/classes", selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBranch !== "all") {
        params.append("branchId", selectedBranch);
      }

      const response = await fetch(`/api/classes?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch classes");
      return response.json();
    },
  });

  const handleCreateAssignment = () => {
    const basePath = user?.role === "ADMIN" ? "/admin" : "/teacher";
    navigate(`${basePath}/assignments/create`);
  };

  const handleDeleteAssignment = async () => {
    if (!deleteAssignment) return;

    try {
      const response = await fetch(`/api/assignments/${deleteAssignment.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete assignment");

      await queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      toast({ title: "Success", description: "Assignment deleted successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive",
      });
    } finally {
      setDeleteAssignment(null);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Assignments Management</CardTitle>
              <Button onClick={handleCreateAssignment}>
                Create New Assignment
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Branch</label>
                  <Select
                    value={selectedBranch}
                    onValueChange={setSelectedBranch}
                  >
                    <SelectTrigger>
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Class</label>
                  <Select
                    value={selectedClass}
                    onValueChange={setSelectedClass}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes?.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id.toString()}>
                          {cls.name} - {cls.englishLevel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={selectedStatus}
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments?.sort((a, b) => {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                  })
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((assignment) => {
                    const assignmentClass = classes?.find(
                      (c) => c.id === assignment.classId
                    );
                    const branch = branches?.find(
                      (b) => b.id === assignmentClass?.branchId
                    );

                    return (
                      <TableRow key={assignment.id}>
                        <TableCell>{assignment.title}</TableCell>
                        <TableCell>{branch?.name || "-"}</TableCell>
                        <TableCell>
                          {assignmentClass?.name || "-"} -{" "}
                          {assignmentClass?.englishLevel || ""}
                        </TableCell>
                        <TableCell>
                          {assignment.dueDate
                            ? format(new Date(assignment.dueDate), "MM/dd/yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className={`px-2 py-1 rounded-full text-xs font-medium h-auto
                                  ${assignment.status === 'draft' ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' : ''}
                                  ${assignment.status === 'published' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                                  ${assignment.status === 'completed' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : ''}
                                `}
                              >
                                {assignment.status?.toUpperCase()}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {["draft", "published", "completed"].map((status) => (
                                <DropdownMenuItem
                                  key={status}
                                  onClick={() => {
                                    if (assignment.id) {
                                      updateStatusMutation.mutate({
                                        id: assignment.id,
                                        status
                                      });
                                    }
                                  }}
                                  disabled={status === assignment.status}
                                >
                                  {status.toUpperCase()}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="space-x-2 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/assignments/${assignment.id}`)}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingAssignment(assignment)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteAssignment(assignment)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>

      {editingAssignment && (
        <EditAssignmentDialog
          assignment={editingAssignment}
          open={!!editingAssignment}
          onOpenChange={(open) => !open && setEditingAssignment(null)}
        />
      )}

      <AlertDialog open={!!deleteAssignment} onOpenChange={(open) => !open && setDeleteAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this assignment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAssignment}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}