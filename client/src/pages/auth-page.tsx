
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]).optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: "STUDENT",
    },
  });

  if (user) {
    const homePath = 
      user.role === "ADMIN" ? "/admin" :
      user.role === "TEACHER" ? "/teacher" : "/student";
    return <h1>Redirecting...</h1>;
  }

  const onSubmit = async (data: FormData) => {
    if (isRegistering) {
      registerMutation.mutate({
        email: data.email,
        password: data.password,
        name: data.name || "",
        role: data.role || "STUDENT",
      });
    } else {
      loginMutation.mutate({
        email: data.email,
        password: data.password,
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Top section - hidden on mobile */}
      <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-500 to-purple-600 items-center justify-center text-white">
        <div className="max-w-lg p-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6">Welcome to In2English</h1>
          <p className="text-lg md:text-xl mb-6 md:mb-8">
            Experience enhanced English learning with AI-powered feedback and structured assignments.
          </p>
          <ul className="space-y-4">
            <li className="flex items-center">
              <span className="mr-2">•</span>
              Automated text extraction
            </li>
            <li className="flex items-center">
              <span className="mr-2">•</span>
              Instant AI feedback
            </li>
            <li className="flex items-center">
              <span className="mr-2">•</span>
              Progress tracking
            </li>
          </ul>
        </div>
      </div>

      {/* Login card - centered on mobile */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4">
        <Card className="w-full max-w-[400px]">
          <CardHeader>
            <CardTitle>In2English Platform</CardTitle>
            <CardDescription>
              Login or register to access your homework assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" onValueChange={(value) => setIsRegistering(value === "register")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                {isRegistering && (
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
                )}

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
                  <Select
                    value={form.watch("role")}
                    onValueChange={(value) => form.setValue("role", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role..." />
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
                  disabled={loginMutation.isPending || registerMutation.isPending}
                >
                  {isRegistering ? "Register" : "Login"}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
