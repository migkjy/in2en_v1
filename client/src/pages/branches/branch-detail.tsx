import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Branch, Class } from "@shared/schema";
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
import { useLocation, useRoute } from "wouter";
import { CreateClassDialog } from "../classes/create-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BranchDetail() {
  const [, params] = useRoute("/admin/branches/:id");
  const [isCreateClassDialogOpen, setIsCreateClassDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const branchId = params?.id;

  const { data: branch, isLoading: isBranchLoading } = useQuery<Branch>({
    queryKey: ["/api/branches", branchId],
    queryFn: async () => {
      if (!branchId) throw new Error("Branch ID is required");
      const response = await fetch(`/api/branches/${branchId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch branch");
      }
      return response.json();
    },
    enabled: !!branchId,
    retry: 1,
  });

  const { data: classes, isLoading: isClassesLoading } = useQuery<Class[]>({
    queryKey: ["/api/classes", { branchId }],
    queryFn: async () => {
      if (!branchId) throw new Error("Branch ID is required");
      const response = await fetch(`/api/classes?branchId=${branchId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch classes");
      }
      return response.json();
    },
    enabled: !!branchId,
  });

  if (isBranchLoading || isClassesLoading) {
    return <div>Loading...</div>;
  }

  if (!branch) {
    return <div>Branch not found</div>;
  }

  const handleDeleteClass = async (classId: number) => {
    if (!confirm("Are you sure you want to delete this class?")) return;

    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete class");

      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({
        title: "Success",
        description: "Class deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete class",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Branch: {branch.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Total Classes</p>
                  <p className="text-2xl">{classes?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-lg">{branch.address || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Classes</h2>
            <Button onClick={() => setIsCreateClassDialogOpen(true)}>
              Add Class
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Class Name</TableHead>
                <TableHead>English Level</TableHead>
                <TableHead>Age Group</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes?.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell>{cls.id}</TableCell>
                  <TableCell>{cls.name}</TableCell>
                  <TableCell>{cls.englishLevel || "-"}</TableCell>
                  <TableCell>{cls.ageGroup || "-"}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mr-2"
                      onClick={() => setLocation(`/admin/classes/${cls.id}`)}
                    >
                      Detail
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClass(cls.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <CreateClassDialog
            open={isCreateClassDialogOpen}
            onOpenChange={setIsCreateClassDialogOpen}
            branchId={Number(branchId)}
          />
        </div>
      </main>
    </div>
  );
}