import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { User, Class, Branch } from "@shared/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GrantAuthorityDialog } from "./grant-authority-dialog";

export default function TeacherDetail() {
  const { id } = useParams<{ id: string }>();
  const [isGrantAuthorityDialogOpen, setIsGrantAuthorityDialogOpen] =
    useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: teacher, isLoading: isTeacherLoading } = useQuery<User>({
    queryKey: ["/api/teachers", id],
    queryFn: async () => {
      const response = await fetch(`/api/teachers/${id}`);
      if (!response.ok) throw new Error("Failed to fetch teacher");
      return response.json();
    },
  });

  const { data: assignedBranches } = useQuery<Branch[]>({
    queryKey: ["/api/teachers", id, "branches"],
    queryFn: async () => {
      const response = await fetch(`/api/teachers/${id}/branches`);
      if (!response.ok) throw new Error("Failed to fetch assigned branches");
      return response.json();
    },
  });

  const { data: assignedClasses } = useQuery<Class[]>({
    queryKey: ["/api/teachers", id, "classes"],
    queryFn: async () => {
      const response = await fetch(`/api/teachers/${id}/classes`);
      if (!response.ok) throw new Error("Failed to fetch assigned classes");
      return response.json();
    },
  });

  if (isTeacherLoading) {
    return <div>Loading...</div>;
  }

  if (!teacher) {
    return <div>Teacher not found</div>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Teacher Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-2xl">{teacher.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p>{teacher.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Assigned Authority</CardTitle>
              <Button onClick={() => setIsGrantAuthorityDialogOpen(true)}>
                Grant Authority
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* <div>
                  <h3 className="text-lg font-semibold mb-2">Full Branch Access</h3>
                  {assignedBranches?.length ? (
                    <ul className="list-disc pl-5">
                      {assignedBranches.map((branch) => (
                        <li key={branch.id}>{branch.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">No branches assigned</p>
                  )}
                </div> */}

                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Individual Classes
                  </h3>
                  {assignedClasses?.length ? (
                    <ul className="list-disc pl-5">
                      {assignedClasses.map((cls) => (
                        <li key={cls.id}>{cls.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">
                      No individual classes assigned
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <GrantAuthorityDialog
            open={isGrantAuthorityDialogOpen}
            onOpenChange={setIsGrantAuthorityDialogOpen}
            teacherId={Number(id)}
            currentBranches={assignedBranches || []}
            currentClasses={assignedClasses || []}
          />
        </div>
      </main>
    </div>
  );
}
