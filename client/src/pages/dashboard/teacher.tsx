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
    (a) => a.teacherId === user?.id && a.status === "pending"
  );

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Teacher Dashboard</h1>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <Link href="/assignments/create">
              <Card className="hover:bg-gray-50 cursor-pointer">
                <CardContent className="p-6 flex flex-col items-center">
                  <Plus className="h-12 w-12 mb-4 text-blue-500" />
                  <h3 className="font-medium text-lg">Create Assignment</h3>
                </CardContent>
              </Card>
            </Link>

            <Link href="/assignments/upload">
              <Card className="hover:bg-gray-50 cursor-pointer">
                <CardContent className="p-6 flex flex-col items-center">
                  <Upload className="h-12 w-12 mb-4 text-green-500" />
                  <h3 className="font-medium text-lg">Upload Homework</h3>
                </CardContent>
              </Card>
            </Link>

            <Link href="/assignments/review">
              <Card className="hover:bg-gray-50 cursor-pointer">
                <CardContent className="p-6 flex flex-col items-center">
                  <ClipboardList className="h-12 w-12 mb-4 text-purple-500" />
                  <h3 className="font-medium text-lg">Review Submissions</h3>
                  {pendingReviews?.length ? (
                    <span className="mt-2 px-2 py-1 bg-red-100 text-red-600 rounded-full text-sm">
                      {pendingReviews.length} pending
                    </span>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* My Classes */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>My Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {classes?.map((cls) => (
                  <div 
                    key={cls.id}
                    className="p-4 border rounded hover:bg-gray-50"
                  >
                    <h3 className="font-medium">{cls.name}</h3>
                    <p className="text-sm text-gray-500">
                      Level: {cls.englishLevel}
                    </p>
                    <p className="text-sm text-gray-500">
                      Age: {cls.ageGroup}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Assignments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignments?.slice(0, 5).map((assignment) => (
                  <div 
                    key={assignment.id}
                    className="p-4 border rounded hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{assignment.title}</h3>
                        <p className="text-sm text-gray-500">
                          Due: {new Date(assignment.dueDate!).toLocaleDateString()}
                        </p>
                      </div>
                      <Link href={`/assignments/review/${assignment.id}`}>
                        <Button variant="outline" size="sm">
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
