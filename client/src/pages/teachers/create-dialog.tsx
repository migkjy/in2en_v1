import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { z } from "zod";

type CreateTeacherDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherToEdit?: User | null;
};

export function CreateTeacherDialog({ 
  open, 
  onOpenChange, 
  teacherToEdit 
}: CreateTeacherDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof insertUserSchema>>({
    resolver: zodResolver(
      insertUserSchema.extend({
        password: teacherToEdit 
          ? insertUserSchema.shape.password.optional()
          : insertUserSchema.shape.password
      })
    ),
    defaultValues: {
      name: "",
      email: "",
      role: "TEACHER",
    },
  });

  useEffect(() => {
    if (teacherToEdit) {
      form.reset({
        name: teacherToEdit.name,
        email: teacherToEdit.email,
        role: "TEACHER",
      });
    } else {
      form.reset({
        name: "",
        email: "",
        role: "TEACHER",
      });
    }
  }, [teacherToEdit, form]);

  const createTeacher = useMutation({
    mutationFn: async (data: z.infer<typeof insertUserSchema>) => {
      const url = teacherToEdit 
        ? `/api/teachers/${teacherToEdit.id}` 
        : "/api/teachers";

      const response = await fetch(url, {
        method: teacherToEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, role: "TEACHER" }),
      });

      if (!response.ok) {
        throw new Error(teacherToEdit ? "Failed to update teacher" : "Failed to create teacher");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      // toast removed
      form.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: teacherToEdit ? "Failed to update teacher" : "Failed to create teacher",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{teacherToEdit ? "Edit Teacher" : "Create New Teacher"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createTeacher.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!teacherToEdit && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temporary Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTeacher.isPending}>
                {createTeacher.isPending 
                  ? (teacherToEdit ? "Updating..." : "Creating...") 
                  : (teacherToEdit ? "Update Teacher" : "Create Teacher")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}