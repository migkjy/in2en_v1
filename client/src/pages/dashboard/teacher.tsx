import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Plus, Upload, ClipboardList } from "lucide-react";
import type { Class, Assignment } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function TeacherDashboard() {
  const { user } = useAuth();

  const { data: classes } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  const { data: assignments } = useQuery<Assignment[]>({
    queryKey: ["/api/assignments"],
  });

  const pendingReviews = assignments?.filter(
    (a) => a.userId === user?.id && a.status === "pending"
  );

  return (
    <div className="flex h-screen bg-gray-50/50">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Teacher Dashboard</h1>
            <p className="mt-2 text-gray-500">Manage assignments and review student submissions.</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/assignments/create">
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group">
                <CardContent className="p-6 flex flex-col items-center">
                  <div className="p-3 rounded-full bg-blue-50 group-hover:bg-blue-100 transition-colors mb-4">
                    <Plus className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="font-medium text-lg text-gray-900">Create Assignment</h3>
                  <p className="mt-2 text-sm text-gray-500 text-center">
                    Create new assignments for your classes
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/assignments/upload">
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group">
                <CardContent className="p-6 flex flex-col items-center">
                  <div className="p-3 rounded-full bg-green-50 group-hover:bg-green-100 transition-colors mb-4">
                    <Upload className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="font-medium text-lg text-gray-900">Upload Homework</h3>
                  <p className="mt-2 text-sm text-gray-500 text-center">
                    Upload student homework submissions
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/assignments/review">
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group">
                <CardContent className="p-6 flex flex-col items-center">
                  <div className="p-3 rounded-full bg-purple-50 group-hover:bg-purple-100 transition-colors mb-4">
                    <ClipboardList className="h-6 w-6 text-purple-500" />
                  </div>
                  <h3 className="font-medium text-lg text-gray-900">Review Submissions</h3>
                  {pendingReviews?.length ? (
                    <span className="mt-2 px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-100 text-red-600">
                      {pendingReviews.length} pending
                    </span>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500 text-center">
                      Review and grade student work
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* My Classes */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">My Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {classes?.map((cls) => (
                  <div 
                    key={cls.id}
                    className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-colors group"
                  >
                    <h3 className="font-medium text-gray-900 group-hover:text-primary">{cls.name}</h3>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-500">
                        Level: {cls.englishLevel || "Not set"}
                      </p>
                      <p className="text-sm text-gray-500">
                        Age: {cls.ageGroup || "Not set"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Assignments */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Recent Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assignments?.slice(0, 5).map((assignment) => (
                  <div 
                    key={assignment.id}
                    className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{assignment.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Due: {assignment.dueDate
                            ? new Date(assignment.dueDate).toLocaleDateString()
                            : "No due date"}
                        </p>
                      </div>
                      <Link href={`/assignments/review/${assignment.id}`}>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="shadow-sm hover:shadow-md transition-shadow"
                        >
                          Review
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