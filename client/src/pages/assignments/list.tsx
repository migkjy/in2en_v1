import { useQuery } from "@tanstack/react-query";
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
import { useLocation } from "wouter";
import type { Assignment, Branch, Class } from "@shared/schema";
import { format } from "date-fns";
import { useState } from "react";

export default function AssignmentList() {
  const [, navigate] = useLocation();
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");

  const { data: assignments } = useQuery<Assignment[]>({
    queryKey: ["/api/assignments", selectedBranch, selectedClass],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBranch) params.append("branchId", selectedBranch);
      if (selectedClass) params.append("classId", selectedClass);

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
      if (selectedBranch) params.append("branchId", selectedBranch);

      const response = await fetch(`/api/classes?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch classes");
      return response.json();
    },
  });

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Assignments Management</CardTitle>
              <Button onClick={() => navigate("/admin/assignments/create")}>
                Create New Assignment
              </Button>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-2 gap-4 mb-6">
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
              </div>

              {/* Assignments Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments?.map((assignment) => {
                    const assignmentClass = classes?.find(
                      (c) => c.id === assignment.classId
                    );
                    const branch = branches?.find(
                      (b) => b.id === assignmentClass?.branchId
                    );

                    return (
                      <TableRow
                        key={assignment.id}
                        className="cursor-pointer"
                        onClick={() =>
                          navigate(`/admin/assignments/${assignment.id}`)
                        }
                      >
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
                        <TableCell>{assignment.status}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}