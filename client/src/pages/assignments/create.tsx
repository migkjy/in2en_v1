import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAssignmentSchema } from "@shared/schema";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Class } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from 'date-fns';

const createAssignmentSchema = insertAssignmentSchema.omit({ 
  id: true
}).extend({
  dueDate: z.string().optional()
});

type CreateAssignmentData = z.infer<typeof createAssignmentSchema>;

export default function CreateAssignment() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  const { data: classes, isLoading: loadingClasses } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  const filteredClasses = classes?.filter(
    cls => selectedBranch === "all" || cls.branchId === parseInt(selectedBranch)
  );

  const createMutation = useMutation({
    mutationFn: async (data: CreateAssignmentData) => {
      const payload = {
        ...data,
        dueDate: data.dueDate ? format(new Date(data.dueDate), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : null,
        userId: user?.id
      };
      const res = await apiRequest("POST", "/api/assignments", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      toast({
        title: "Success",
        description: "Assignment created successfully",
      });
      navigate(user?.role === "ADMIN" ? "/admin/assignments" : "/teacher/assignments");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<CreateAssignmentData>({
    resolver: zodResolver(createAssignmentSchema),
    defaultValues: {
      title: "",
      description: "",
      classId: undefined,
      dueDate: "",
      userId: user?.id,
      status: "draft"
    }
  });

  const onSubmit = form.handleSubmit((data) => {
    createMutation.mutate(data);
  });

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Create New Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <form 
                onSubmit={onSubmit}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium">Branch</label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="all">All Branches</option>
                    {branches?.map((branch) => (
                      <option key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Class</label>
                  <select
                    {...form.register("classId", { valueAsNumber: true })}
                    className="w-full p-2 border rounded"
                    disabled={loadingClasses}
                  >
                    <option value="">Select a class</option>
                    {filteredClasses?.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} - Level: {cls.englishLevel}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    {...form.register("title")}
                    placeholder="Assignment title"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    {...form.register("description")}
                    placeholder="Assignment description"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Due Date</label>
                  <Input
                    type="datetime-local"
                    {...form.register("dueDate")}
                  />
                </div>

                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(user?.role === "ADMIN" ? "/admin/assignments" : "/teacher/assignments")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                  >
                    Create Assignment
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}