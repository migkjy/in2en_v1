import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string(),
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]),
});

type FormData = z.infer<typeof formSchema>;

export default function AdminAuthPage() {
  const { user, registerMutation } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: "STUDENT",
    },
  });

  const onSubmit = async (data: FormData) => {
    registerMutation.mutate({
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role,
    });
  };

  return (
    <div className="min-h-screen flex">
      <div className="w-full flex items-center justify-center p-4">
        <Card className="w-full max-w-[400px]">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>Create New User</CardTitle>
              <Button variant="outline" onClick={() => window.history.back()}>
                Back
              </Button>
            </div>
            <CardDescription>
              Create a new user account with specified role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Input
                  placeholder="Name"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Input
                  type="password"
                  placeholder="Password"
                  {...form.register("password")}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <Select onValueChange={(value) => form.setValue("role", value as "ADMIN" | "TEACHER" | "STUDENT")} defaultValue={form.getValues("role")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="TEACHER">Teacher</SelectItem>
                    <SelectItem value="STUDENT">Student</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.role && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.role.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
