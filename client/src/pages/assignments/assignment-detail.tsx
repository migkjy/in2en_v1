import { useQuery } from "@tanstack/react-query";
import { Assignment, Submission, Class, Branch, User } from "@shared/schema";
import { useRoute } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

export default function AssignmentDetail() {
  const [, params] = useRoute("/assignments/:id");
  const assignmentId = params?.id;
  const { user } = useAuth();

  const { data: assignment, isLoading: isAssignmentLoading } = useQuery<Assignment>({
    queryKey: ["/api/assignments", assignmentId],
    enabled: !!assignmentId,
  });

  const { data: submissions, isLoading: isSubmissionsLoading } = useQuery<Submission[]>({
    queryKey: ["/api/submissions", assignmentId],
    enabled: !!assignmentId,
  });

  const { data: assignmentClass, isLoading: isClassLoading } = useQuery<Class>({
    queryKey: ["/api/classes", assignment?.classId],
    enabled: !!assignment?.classId,
  });

  const { data: branch, isLoading: isBranchLoading } = useQuery<Branch>({
    queryKey: ["/api/branches", assignmentClass?.branchId],
    enabled: !!assignmentClass?.branchId,
  });

  const { data: students } = useQuery<User[]>({
    queryKey: ["/api/classes", assignment?.classId, "students"],
    enabled: !!assignment?.classId,
  });

  if (isAssignmentLoading || isClassLoading || isBranchLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!assignment) {
    return <div>Assignment not found</div>;
  }

  const isTeacherOrAdmin = user?.role === "TEACHER" || user?.role === "ADMIN";

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>{assignment.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Assignment Info */}
                <div className="flex justify-between text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Branch:</span>{" "}
                    {branch?.name}
                  </div>
                  <div>
                    <span className="font-medium">Class:</span>{" "}
                    {assignmentClass?.name} -{" "}
                    {assignmentClass?.englishLevel}
                  </div>
                  <div>
                    <span className="font-medium">Due:</span>{" "}
                    {assignment.dueDate
                      ? format(new Date(assignment.dueDate), "MM/dd/yy")
                      : "No due date"}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Description</h3>
                  <p className="text-gray-600">{assignment.description}</p>
                </div>

                {/* Students List */}
                <div>
                  <h3 className="text-sm font-medium mb-4">Students</h3>
                  <div className="flex flex-wrap gap-2">
                    {students?.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                      >
                        {student.name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submissions Table */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Submissions</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions?.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell>
                            {students?.find(s => s.id === submission.studentId)?.name}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-sm ${
                                submission.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {submission.status === "completed"
                                ? "Done"
                                : "Unreviewed"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-2"
                              onClick={() =>
                                window.location.href = `/submissions/${submission.id}`
                              }
                            >
                              View
                            </Button>
                            {isTeacherOrAdmin && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mr-2"
                                  onClick={() =>
                                    window.location.href = `/submissions/${submission.id}/edit`
                                  }
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    // Handle delete
                                  }}
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

                  {/* Bulk Upload Button for Teachers/Admins */}
                  {isTeacherOrAdmin && (
                    <div className="mt-6">
                      <Button
                        onClick={() =>
                          window.location.href = `/assignments/${assignmentId}/upload`
                        }
                      >
                        Bulk Upload
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}