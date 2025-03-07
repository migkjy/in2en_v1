import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBranchSchema, type Branch } from "@shared/schema";
import { useEffect } from "react";
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

type CreateBranchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: Branch | null;
};

export function CreateBranchDialog({ open, onOpenChange, branch }: CreateBranchDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof insertBranchSchema>>({
    resolver: zodResolver(insertBranchSchema),
    defaultValues: {
      name: branch?.name || "",
      address: branch?.address || "",
    },
  });

  useEffect(() => {
    if (branch) {
      form.reset({
        name: branch.name,
        address: branch.address || "",
      });
    } else {
      form.reset({
        name: "",
        address: "",
      });
    }
  }, [branch, form]);

  const createBranch = useMutation({
    mutationFn: async (data: z.infer<typeof insertBranchSchema>) => {
      const response = await fetch(branch ? `/api/branches/${branch.id}` : "/api/branches", {
        method: branch ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(branch ? "Failed to update branch" : "Failed to create branch");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({
        title: "Success",
        description: branch ? "Branch updated successfully" : "Branch created successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: branch ? "Failed to update branch" : "Failed to create branch",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{branch ? "Edit Branch" : "Create New Branch"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createBranch.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBranch.isPending}>
                {createBranch.isPending 
                  ? (branch ? "Updating..." : "Creating...") 
                  : (branch ? "Update Branch" : "Create Branch")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}