import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const createStudentSchema = insertUserSchema.extend({
  phoneNumber: z.string().optional(),
  birthDate: z.string().optional(),
  branch_id: z.number().optional(),
}).omit({ role: true });

type CreateStudentForm = z.infer<typeof createStudentSchema>;

type CreateStudentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: any;
};

export function CreateStudentDialog({ open, onOpenChange, student }: CreateStudentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: branches } = useQuery({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const response = await fetch("/api/branches");
      if (!response.ok) {
        throw new Error("Failed to fetch branches");
      }
      return response.json();
    },
  });

  const form = useForm<CreateStudentForm>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      birthDate: "",
      password: "",
      branch_id: undefined,
    },
  });

  // Reset form when student prop changes
  useEffect(() => {
    if (student) {
      console.log("Setting form values:", {
        name: student.name,
        email: student.email,
        phoneNumber: student.phone_number || "",
        birthDate: student.birth_date || "",
        branch_id: student.branch_id,
      });

      form.reset({
        name: student.name || "",
        email: student.email || "",
        phoneNumber: student.phone_number || "",
        birthDate: student.birth_date || "",
        password: "", // Always empty for security
        branch_id: student.branch_id ? Number(student.branch_id) : undefined,
      });
    } else {
      form.reset({
        name: "",
        email: "",
        phoneNumber: "",
        birthDate: "",
        password: "",
        branch_id: undefined,
      });
    }
  }, [student, form]);

  const updateStudent = useMutation({
    mutationFn: async (data: CreateStudentForm) => {
      setIsLoading(true);
      try {
        // Format the data before sending
        const requestData = {
          ...data,
          phone_number: data.phoneNumber,
          birth_date: data.birthDate,
          role: "STUDENT",
        };

        // Remove empty fields
        if (!requestData.password?.trim()) {
          delete requestData.password;
        }

        console.log("Sending update request:", requestData);

        const response = await fetch(`/api/students/${student?.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to update student");
        }

        return response.json();
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "Success",
        description: "Student updated successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update student",
        variant: "destructive",
      });
    },
  });

  const createStudent = useMutation({
    mutationFn: async (data: CreateStudentForm) => {
      setIsLoading(true);
      try {
        // Format the data before sending
        const requestData = {
          ...data,
          phone_number: data.phoneNumber,
          birth_date: data.birthDate,
          role: "STUDENT",
        };

        const response = await fetch("/api/students", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to create student");
        }

        return response.json();
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "Success",
        description: "Student created successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create student",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateStudentForm) => {
    console.log("Form submitted with data:", data);
    if (student) {
      updateStudent.mutate(data);
    } else {
      createStudent.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{student ? "Edit Student" : "Add New Student"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isLoading} />
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
                    <Input type="email" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{student ? "New Password (Optional)" : "Password"}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      {...field}
                      disabled={isLoading}
                      placeholder={student ? "Leave blank to keep current password" : "Enter password"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="branch_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch (Optional)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                    value={field.value?.toString() || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branches?.map((branch: any) => (
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
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (student ? "Updating..." : "Creating...") : (student ? "Update Student" : "Create Student")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}