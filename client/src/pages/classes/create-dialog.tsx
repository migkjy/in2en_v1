import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClassSchema, type Class, type Branch } from "@shared/schema";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { z } from "zod";

type CreateClassDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId?: number;
  classToEdit?: Class | null;
};

export function CreateClassDialog({ open, onOpenChange, branchId, classToEdit }: CreateClassDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const response = await fetch("/api/branches");
      if (!response.ok) throw new Error("Failed to fetch branches");
      return response.json();
    },
  });

  const form = useForm<z.infer<typeof insertClassSchema>>({
    resolver: zodResolver(insertClassSchema),
    defaultValues: {
      name: "",
      branchId: branchId || undefined,
      englishLevel: "",
      ageGroup: "",
    },
  });

  useEffect(() => {
    if (classToEdit) {
      form.reset({
        name: classToEdit.name,
        branchId: classToEdit.branchId || branchId,
        englishLevel: classToEdit.englishLevel || "",
        ageGroup: classToEdit.ageGroup || "",
      });
    } else {
      form.reset({
        name: "",
        branchId: branchId || undefined,
        englishLevel: "",
        ageGroup: "",
      });
    }
  }, [classToEdit, branchId, form]);

  const createClass = useMutation({
    mutationFn: async (data: z.infer<typeof insertClassSchema>) => {
      const url = classToEdit 
        ? `/api/classes/${classToEdit.id}` 
        : "/api/classes";

      const response = await fetch(url, {
        method: classToEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(classToEdit ? "Failed to update class" : "Failed to create class");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      if (branchId) {
        queryClient.invalidateQueries({ queryKey: ["/api/branches", branchId] });
      }
      toast({
        title: "Success",
        description: classToEdit ? "Class updated successfully" : "Class created successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: classToEdit ? "Failed to update class" : "Failed to create class",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{classToEdit ? "Edit Class" : "Create New Class"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createClass.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value?.toString()}
                    disabled={!!branchId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="englishLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>English Level</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ageGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age Group</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select age group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Elementary">Elementary</SelectItem>
                      <SelectItem value="Middle">Middle School</SelectItem>
                      <SelectItem value="High">High School</SelectItem>
                      <SelectItem value="Adult">Adult</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createClass.isPending}>
                {createClass.isPending 
                  ? (classToEdit ? "Updating..." : "Creating...") 
                  : (classToEdit ? "Update Class" : "Create Class")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}