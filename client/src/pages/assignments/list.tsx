import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import type { Assignment, Branch, Class, Submission } from "@shared/schema";
import { format } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { EditAssignmentDialog } from "./edit-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "completed", label: "Completed" },
];

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return "-";
  return format(new Date(dateString), "MM/dd/yyyy");
};

export default function AssignmentList() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const basePath = user?.role.toLowerCase() || "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(
    null,
  );
  const [deleteAssignment, setDeleteAssignment] = useState<Assignment | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [selectedFilter, setSelectedFilter] = useState<string>("published"); //Added for student filter

  // Get teacher's accessible classes first if user is a teacher
  const { data: teacherClasses } = useQuery<Class[]>({
    queryKey: ["/api/teachers", user?.id, "classes"],
    enabled: user?.role === "TEACHER",
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: user?.role === "ADMIN" || user?.role === "TEACHER",
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
    enabled: Boolean(selectedBranch),
  });

  // Reset selectedClass when branch changes
  useEffect(() => {
    setSelectedClass("all");
  }, [selectedBranch]);

  const { data: assignments, isLoading: loadingAssignments } = useQuery<
    Assignment[]
  >({
    queryKey: [
      "/api/assignments",
      selectedBranch,
      selectedClass,
      selectedStatus,
    ],
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
      if (user?.role === "TEACHER") {
        params.append("teacherId", user.id.toString());
      }

      const response = await fetch(`/api/assignments?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch assignments");
      return response.json();
    },
    enabled: Boolean(selectedBranch),
  });

  // Get accessible classes for each assignment
  const assignmentClasses = useQuery<Record<number, Class>>({
    queryKey: ["/api/assignments/classes", assignments?.map((a) => a.classId)],
    queryFn: async () => {
      if (!assignments) return {};

      const uniqueClassIds = Array.from(
        new Set(assignments.map((a) => a.classId).filter(Boolean)),
      );
      const classData: Record<number, Class> = {};

      for (const classId of uniqueClassIds) {
        const response = await fetch(`/api/classes/${classId}`);
        if (response.ok) {
          const classInfo = await response.json();
          classData[classId] = classInfo;
        }
      }

      return classData;
    },
    enabled: !!assignments && assignments.length > 0,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PUT", `/api/assignments/${id}`, {
        status,
      });
      if (!response.ok) {
        throw new Error("Failed to update assignment status");
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

      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      toast({
        title: "Success",
        description: "Assignment deleted successfully",
      });
      setDeleteAssignment(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive",
      });
    }
  };

  // Query to get all student submissions
  const { data: studentSubmissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["/api/submissions", user?.id],
    queryFn: async () => {
      if (user?.role !== "STUDENT") return [];
      try {
        const response = await fetch(`/api/submissions?studentId=${user.id}`);
        if (!response.ok) {
          console.error("Error fetching submissions:", await response.text());
          return [];
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching student submissions:", error);
        return [];
      }
    },
    enabled: user?.role === "STUDENT",
  });

  const filteredAssignments = useMemo(() => {
    if (!assignments) return [];

    // For students, we need to show assignments based on their submissions and selected filter
    if (user?.role === "STUDENT" && studentSubmissions) {
      const submissionAssignmentIds = studentSubmissions.map(
        (sub) => sub.assignmentId,
      );
      let relevantAssignments = assignments.filter((assignment) =>
        submissionAssignmentIds.includes(assignment.id),
      );

      //Filter by selected status for students
      relevantAssignments = relevantAssignments.filter((assignment) => {
        if (selectedFilter === "published" && assignment.status === "published")
          return true;
        if (selectedFilter === "completed" && assignment.status === "completed")
          return true;
        return selectedFilter === "all"; //Show all if "all" is selected.
      });

      return relevantAssignments.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      });
    }

    // For teachers and admins, show all assignments
    return [...assignments].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
    });
  }, [assignments, studentSubmissions, user, selectedFilter]);

  // Get submission counts for each assignment
  const { data: submissionCounts } = useQuery({
    queryKey: [
      "/api/assignments/submission-counts",
      assignments?.map((a) => a.id),
    ],
    queryFn: async () => {
      if (!assignments) return {};
      const results = await Promise.all(
        assignments.map(async (assignment) => {
          const response = await fetch(
            `/api/submissions?assignmentId=${assignment.id}`,
          );
          if (response.ok) {
            const submissions = await response.json();
            return { assignmentId: assignment.id, count: submissions.length };
          } else {
            return { assignmentId: assignment.id, count: 0 };
          }
        }),
      );
      return Object.fromEntries(
        results.map((item) => [item.assignmentId, item.count]),
      );
    },
    enabled: !!assignments && assignments.length > 0,
  });

  const canCreateAssignment =
    user?.role === "ADMIN" || user?.role === "TEACHER";

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-4 overflow-auto pt-20 mt-14">
        <div className="max-w-6xl mx-auto w-full">
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <CardTitle>Assignments Management</CardTitle>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  {user?.role === "STUDENT" && (
                    <Select
                      value={selectedFilter}
                      onValueChange={setSelectedFilter}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {canCreateAssignment && (
                  <Button
                    className="w-full md:w-auto"
                    onClick={handleCreateAssignment}
                  >
                    Create New Assignment
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {user?.role !== "STUDENT" && (
                  <>
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
                            <SelectItem
                              key={branch.id}
                              value={branch.id.toString()}
                            >
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
                  </>
                )}
                {/* Status Filter - Only for Admin and Teacher */}
                {user?.role !== "STUDENT" && (
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
                )}
              </div>

              <div className="md:hidden">
                {!loadingAssignments && filteredAssignments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No assignments found
                  </div>
                ) : (
                  filteredAssignments
                    .slice(
                      (currentPage - 1) * itemsPerPage,
                      currentPage * itemsPerPage,
                    )
                    .map((assignment) => {
                      const assignmentClass =
                        assignmentClasses.data?.[assignment.classId!];
                      const branch = branches?.find(
                        (b) => b.id === assignmentClass?.branchId,
                      );

                      return (
                        <div
                          key={assignment.id}
                          className="border rounded-lg p-4 space-y-3 mb-4"
                        >
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium">{assignment.title}</h3>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  navigate(
                                    `/${basePath}/assignments/${assignment.id}`,
                                  )
                                }
                              >
                                View
                              </Button>
                            </div>
                          </div>
                          {user?.role !== "STUDENT" && (
                            <div className="text-sm text-gray-600">
                              <div>Branch: {branch?.name || "-"}</div>
                              <div>Class: {assignmentClass?.name || "-"}</div>
                            </div>
                          )}
                          <div className="text-sm text-gray-600">
                            <div>Due: {formatDate(assignment.dueDate)}</div>
                            <div className="flex items-center gap-2">
                              Status:
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className={`px-2 py-1 rounded-full text-xs font-medium h-auto
                                      ${assignment.status === "draft" ? "bg-gray-100 text-gray-800 hover:bg-gray-200" : ""}
                                      ${assignment.status === "published" ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
                                      ${assignment.status === "completed" ? "bg-blue-100 text-blue-800 hover:bg-blue-200" : ""}
                                    `}
                                  >
                                    {assignment.status?.toUpperCase()}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  {["draft", "published", "completed"].map(
                                    (status) => (
                                      <DropdownMenuItem
                                        key={status}
                                        onClick={() => {
                                          if (assignment.id) {
                                            updateStatusMutation.mutate({
                                              id: assignment.id,
                                              status,
                                            });
                                          }
                                        }}
                                        disabled={status === assignment.status}
                                      >
                                        {status.toUpperCase()}
                                      </DropdownMenuItem>
                                    ),
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div>
                              Submissions:{" "}
                              {submissionCounts?.[assignment.id] || 0}
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Title</TableHead>
                      {user?.role !== "STUDENT" && (
                        <>
                          <TableHead>Branch</TableHead>
                          <TableHead>Class</TableHead>
                        </>
                      )}
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submissions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!loadingAssignments && filteredAssignments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-gray-500"
                        >
                          No assignments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAssignments
                        .slice(
                          (currentPage - 1) * itemsPerPage,
                          currentPage * itemsPerPage,
                        )
                        .map((assignment) => {
                          const assignmentClass =
                            assignmentClasses.data?.[assignment.classId!];
                          const branch = branches?.find(
                            (b) => b.id === assignmentClass?.branchId,
                          );

                          return (
                            <TableRow key={assignment.id}>
                              <TableCell>{assignment.title}</TableCell>
                              {user?.role !== "STUDENT" && (
                                <>
                                  <TableCell>{branch?.name || "-"}</TableCell>
                                  <TableCell>
                                    {assignmentClass?.name || "-"} -{" "}
                                    {assignmentClass?.englishLevel || ""}
                                  </TableCell>
                                </>
                              )}
                              <TableCell>
                                {formatDate(assignment.dueDate)}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      className={`px-2 py-1 rounded-full text-xs font-medium h-auto
                                        ${assignment.status === "draft" ? "bg-gray-100 text-gray-800 hover:bg-gray-200" : ""}
                                        ${assignment.status === "published" ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
                                        ${assignment.status === "completed" ? "bg-blue-100 text-blue-800 hover:bg-blue-200" : ""}
                                      `}
                                    >
                                      {assignment.status?.toUpperCase()}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    {["draft", "published", "completed"].map(
                                      (status) => (
                                        <DropdownMenuItem
                                          key={status}
                                          onClick={() => {
                                            if (assignment.id) {
                                              updateStatusMutation.mutate({
                                                id: assignment.id,
                                                status,
                                              });
                                            }
                                          }}
                                          disabled={
                                            status === assignment.status
                                          }
                                        >
                                          {status.toUpperCase()}
                                        </DropdownMenuItem>
                                      ),
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                              <TableCell>
                                {submissionCounts &&
                                submissionCounts[assignment.id] !==
                                  undefined ? (
                                  <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md font-medium">
                                    {submissionCounts[assignment.id]}
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-gray-50 text-gray-400 rounded-md">
                                    0
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    navigate(
                                      `/${basePath}/assignments/${assignment.id}`,
                                    )
                                  }
                                >
                                  View
                                </Button>
                                {user?.role !== "STUDENT" && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        setEditingAssignment(assignment)
                                      }
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() =>
                                        setDeleteAssignment(assignment)
                                      }
                                    >
                                      Delete
                                    </Button>
                                  </>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                    )}
                  </TableBody>
                </Table>
              </div>

              {filteredAssignments &&
                filteredAssignments.length > itemsPerPage && (
                  <div className="mt-4 flex justify-between items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex gap-2">
                      {Array.from({
                        length: Math.ceil(
                          filteredAssignments.length / itemsPerPage,
                        ),
                      }).map((_, index) => (
                        <Button
                          key={index + 1}
                          variant={
                            currentPage === index + 1 ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setCurrentPage(index + 1)}
                        >
                          {index + 1}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.min(
                            Math.ceil(
                              filteredAssignments.length / itemsPerPage,
                            ),
                            page + 1,
                          ),
                        )
                      }
                      disabled={
                        currentPage >=
                        Math.ceil(filteredAssignments.length / itemsPerPage)
                      }
                    >
                      Next
                    </Button>
                  </div>
                )}
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

      <AlertDialog
        open={!!deleteAssignment}
        onOpenChange={(open) => !open && setDeleteAssignment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this assignment? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAssignment}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
