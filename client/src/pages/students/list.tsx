import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User, Branch } from "@shared/schema";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function StudentList() {
  const [isCreateStudentDialogOpen, setIsCreateStudentDialogOpen] =
    useState(false);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("id"); // Added state for sorting field
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc"); // Added state for sorting direction
  const [currentPage, setCurrentPage] = useState(1); // Added state for current page
  const itemsPerPage = 20; // Number of items per page
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: students, isLoading: isStudentsLoading } = useQuery<User[]>({
    queryKey: ["/api/students"],
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
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

  const getBranchName = (branchId: number | null | undefined) => {
    if (!branchId) return "-";
    const branch = branches?.find((b) => b.id === branchId);
    return branch?.name || "-";
  };

  const filteredStudents = students?.filter((student) => {
    const matchesName = student.name
      .toLowerCase()
      .includes(nameFilter.toLowerCase());
    const matchesEmail = student.email
      .toLowerCase()
      .includes(emailFilter.toLowerCase());
    const matchesBranch =
      branchFilter === "all" ||
      student.branchId === (branchFilter ? parseInt(branchFilter) : undefined);

    return matchesName && matchesEmail && matchesBranch;
  })
  .sort((a, b) => {
    const multiplier = sortDirection === "asc" ? 1 : -1;

    if (sortField === "id") {
      return (a.id - b.id) * multiplier;
    } else if (sortField === "name") {
      return a.name.localeCompare(b.name) * multiplier;
    } else if (sortField === "email") {
      return a.email.localeCompare(b.email) * multiplier;
    } else if (sortField === "phone_number") {
      const phoneA = a.phone_number || "";
      const phoneB = b.phone_number || "";
      return phoneA.localeCompare(phoneB) * multiplier;
    } else if (sortField === "branch") {
      const branchA = getBranchName(a.branchId) || "";
      const branchB = getBranchName(b.branchId) || "";
      return branchA.localeCompare(branchB) * multiplier;
    }

    return 0;
  });

  const handleSort = (field: string) => {
    setSortField(field);
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  const handleFilterChange = (type: string, value: string) => {
    // Reset to first page when changing filters
    setCurrentPage(1);

    if (type === "name") {
      setNameFilter(value);
    } else if (type === "email") {
      setEmailFilter(value);
    } else if (type === "branch") {
      setBranchFilter(value);
    }
  };

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
                  <p className="text-2xl">{filteredStudents?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Students</h2>
            <Button
              onClick={() => {
                setSelectedStudent(null);
                setIsCreateStudentDialogOpen(true);
              }}
            >
              Add Student
            </Button>
          </div>

          {/* Search Filters */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Branch</label>
              <Select
                value={branchFilter}
                onValueChange={(value) => handleFilterChange("branch", value)} // Use handleFilterChange
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
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Search by name..."
                value={nameFilter}
                onChange={(e) => handleFilterChange("name", e.target.value)} // Use handleFilterChange
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                placeholder="Search by email..."
                value={emailFilter}
                onChange={(e) => handleFilterChange("email", e.target.value)} // Use handleFilterChange
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => handleSort("id")}>ID</TableHead>
                <TableHead onClick={() => handleSort("name")}>Name</TableHead>
                <TableHead onClick={() => handleSort("email")}>Email</TableHead>
                <TableHead onClick={() => handleSort("phone_number")}>
                  Phone Number
                </TableHead>
                <TableHead onClick={() => handleSort("branch")}>Branch</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.id}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.phone_number || "-"}</TableCell>
                    <TableCell>{getBranchName(student.branchId)}</TableCell>
                    <TableCell>
                      {/* <Button
                      variant="outline"
                      size="sm"
                      className="mr-2"
                      onClick={() =>
                        setLocation(`/admin/students/${student.id}`)
                      }
                    >
                      View
                    </Button> */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mr-2"
                        onClick={() => {
                          setSelectedStudent(student);
                          setIsCreateStudentDialogOpen(true);
                        }}
                      >
                        Edit
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

          {filteredStudents.length > itemsPerPage && (
            <div className="mt-4 flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex gap-2">
                {Array.from({
                  length: Math.ceil(filteredStudents.length / itemsPerPage),
                }).map((_, index) => (
                  <Button
                    key={index + 1}
                    variant={currentPage === index + 1 ? "default" : "outline"}
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
                      Math.ceil(filteredStudents.length / itemsPerPage),
                      page + 1
                    )
                  )
                }
                disabled={
                  currentPage >= Math.ceil(filteredStudents.length / itemsPerPage)
                }
              >
                Next
              </Button>
            </div>
          )}
          <CreateStudentDialog
            open={isCreateStudentDialogOpen}
            onOpenChange={setIsCreateStudentDialogOpen}
            student={selectedStudent}
          />
        </div>
      </main>
    </div>
  );
}