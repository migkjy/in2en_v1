import { Link } from "wouter";
import { Plus, Users, Book } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TeacherDashboard() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-2">Teacher Dashboard</h1>
      <p className="text-muted-foreground mb-8">Manage assignments and review student submissions.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/teacher/assignments/create">
          <Card className="h-full hover:bg-secondary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex flex-col items-center justify-between h-[200px]">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-center mb-2">Create Assignment</h2>
              <p className="text-sm text-muted-foreground text-center">
                Create a new assignment for your classes
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/teacher/classes">
          <Card className="h-full hover:bg-secondary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex flex-col items-center justify-between h-[200px]">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-center mb-2">My Classes</h2>
              <p className="text-sm text-muted-foreground text-center">
                View and manage your class list
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/teacher/assignments">
          <Card className="h-full hover:bg-secondary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex flex-col items-center justify-between h-[200px]">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Book className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-center mb-2">My Assignments</h2>
              <p className="text-sm text-muted-foreground text-center">
                View and manage homework assignments
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
