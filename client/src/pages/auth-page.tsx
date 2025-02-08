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
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

const loginSchema = insertUserSchema.pick({ 
  email: true, 
  password: true 
});

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if already logged in
  if (user) {
    const homePath = user.role === "ADMIN" 
      ? "/admin" 
      : user.role === "TEACHER" 
      ? "/teacher" 
      : "/student";

    // Instead of returning null, render nothing but keep the component mounted
    return <div style={{ display: 'none' }}>{navigate(homePath)}</div>;
  }

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const registerForm = useForm<z.infer<typeof insertUserSchema>>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: "STUDENT"
    }
  });

  return (
    <div className="min-h-screen flex">
      {/* Left column - Forms */}
      <div className="w-1/2 p-8 flex items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>English Academy Platform</CardTitle>
            <CardDescription>
              Login or register to access your homework assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form 
                  onSubmit={loginForm.handleSubmit((data) => 
                    loginMutation.mutate(data)
                  )}
                  className="space-y-4 mt-4"
                >
                  <div>
                    <Input
                      placeholder="Email"
                      {...loginForm.register("email")}
                    />
                  </div>
                  <div>
                    <Input
                      type="password"
                      placeholder="Password"
                      {...loginForm.register("password")}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    Login
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form 
                  onSubmit={registerForm.handleSubmit((data) => 
                    registerMutation.mutate(data)
                  )}
                  className="space-y-4 mt-4"
                >
                  <div>
                    <Input
                      placeholder="Name"
                      {...registerForm.register("name")}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Email"
                      {...registerForm.register("email")}
                    />
                  </div>
                  <div>
                    <Input
                      type="password"
                      placeholder="Password"
                      {...registerForm.register("password")}
                    />
                  </div>
                  <select 
                    {...registerForm.register("role")}
                    className="w-full p-2 border rounded"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="TEACHER">Teacher</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    Register
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Right column - Hero section */}
      <div className="w-1/2 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white p-12">
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold mb-6">
            Welcome to English Academy
          </h1>
          <p className="text-xl mb-8">
            A modern platform for English homework management and personalized feedback
          </p>
          <ul className="space-y-4">
            <li className="flex items-center">
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
              </svg>
              Automated text extraction from homework images
            </li>
            <li className="flex items-center">
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
              </svg>
              AI-powered feedback based on student level
            </li>
            <li className="flex items-center">
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
              </svg>
              Interactive teacher reviews and comments
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}