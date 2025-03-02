import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  email: z.string().email("유효한 이메일을 입력해주세요"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  name: z.string().optional(),
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]).optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function AuthPage() {
  const { user, login, register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
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

  // Redirect if user is already logged in
  if (user) {
    const homePath = 
      user.role === "ADMIN" ? "/admin" :
      user.role === "TEACHER" ? "/teacher" : "/student";
    setLocation(homePath);
    return null;
  }

  const onSubmit = async (data: FormData) => {
    try {
      if (isRegistering) {
        await register({
          email: data.email,
          password: data.password,
          name: data.name || "",
          role: data.role || "STUDENT",
        });
      } else {
        await login(data.email, data.password);
      }
    } catch (error) {
      // Error handling is done in the auth context
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="w-1/2 p-8 flex items-center justify-center">
        <Card className="w-[400px]">
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

                {isRegistering && (
                  <select
                    {...form.register("role")}
                    className="w-full p-2 border rounded"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="TEACHER">Teacher</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting
                    ? isRegistering
                      ? "Registering..."
                      : "Logging in..."
                    : isRegistering
                    ? "Register"
                    : "Login"}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="w-1/2 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white p-12">
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold mb-6">Welcome to In2English</h1>
          <p className="text-xl mb-8">
            A modern platform for English homework management and personalized
            feedback
          </p>
          <ul className="space-y-4">
            <li className="flex items-center">
              <svg
                className="w-6 h-6 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
              </svg>
              Automated text extraction from homework images
            </li>
            <li className="flex items-center">
              <svg
                className="w-6 h-6 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
              </svg>
              AI-powered feedback based on student level
            </li>
            <li className="flex items-center">
              <svg
                className="w-6 h-6 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
              </svg>
              Interactive teacher reviews and comments
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}