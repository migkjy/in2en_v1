import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { Assignment, Submission } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function StudentDashboard() {
  const { user } = useAuth();

  const { data: submissions } = useQuery<Submission[]>({
    queryKey: ["/api/submissions", user?.id],
  });

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto mt-14">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Student Dashboard</h1>

          {/* Recent Feedback */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Recent Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submissions?.filter(s => s.status === "completed")
                  .slice(0, 3)
                  .map((submission) => (
                    <div 
                      key={submission.id}
                      className="p-4 border rounded"
                    >
                      <h3 className="font-medium mb-2">
                        Assignment: {submission.assignmentId}
                      </h3>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <p className="font-medium">Teacher Feedback:</p>
                        <p className="text-gray-600">
                          {submission.teacherFeedback}
                        </p>
                      </div>
                      <div className="mt-3">
                        <Link href={`/submissions/${submission.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Assignments */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submissions?.filter(s => s.status === "pending")
                  .map((submission) => (
                    <div 
                      key={submission.id}
                      className="p-4 border rounded"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">
                            Assignment: {submission.assignmentId}
                          </h3>
                          <p className="text-sm text-yellow-600">
                            Status: Under Review
                          </p>
                        </div>
                        <Link href={`/submissions/${submission.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
