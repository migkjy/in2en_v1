import { useQuery } from "@tanstack/react-query";
import { Assignment } from "@shared/schema";
import { useRoute } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export default function AssignmentDetail() {
  const [, params] = useRoute("/admin/assignments/:id");
  const assignmentId = params?.id;

  const { data: assignment, isLoading } = useQuery<Assignment>({
    queryKey: ["/api/assignments", assignmentId],
    queryFn: async () => {
      if (!assignmentId) throw new Error("Assignment ID is required");
      const response = await fetch(`/api/assignments/${assignmentId}`);
      if (!response.ok) throw new Error("Failed to fetch assignment");
      return response.json();
    },
    enabled: !!assignmentId,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!assignment) {
    return <div>Assignment not found</div>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>{assignment.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Description</h3>
                  <p className="mt-1">{assignment.description}</p>
                </div>
                {assignment.dueDate && (
                  <div>
                    <h3 className="text-sm font-medium">Due Date</h3>
                    <p className="mt-1">{format(new Date(assignment.dueDate), 'PPP')}</p>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium">Status</h3>
                  <p className="mt-1 capitalize">{assignment.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
