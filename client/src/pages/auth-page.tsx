import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";

const formSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
  role: z.enum(["STUDENT", "TEACHER"]).optional(),
});

export default function AuthPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const { login, register } = useAuth();
  const isMobile = useIsMobile();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: "STUDENT" as const,
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (isRegistering) {
      await register({
        email: data.email,
        name: data.name!,
        role: data.role!,
        password: data.password,
      });
    } else {
      await login({
        email: data.email,
        password: data.password,
      });
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${!isMobile && "md:flex-row"}`}>
      <div className={`${isMobile ? "p-4" : "w-1/2 p-8"} flex items-center justify-center order-2 md:order-1`}>
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

                {isRegistering && (
                  <div>
                    <Select
                      onValueChange={(value) =>
                        form.setValue("role", value as "STUDENT" | "TEACHER")
                      }
                      defaultValue="STUDENT"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STUDENT">Student</SelectItem>
                        <SelectItem value="TEACHER">Teacher</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button type="submit" className="w-full">
                  {isRegistering ? "Register" : "Login"}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className={`${isMobile ? "p-8" : "w-1/2"} bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white order-1 md:order-2`}>
        <div className="max-w-lg p-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6">Welcome to In2English</h1>
          <p className="text-lg md:text-xl mb-6 md:mb-8">
            A modern platform for English homework management and personalized feedback
          </p>
          <ul className="space-y-4">
            <li className="flex items-center">
              <svg className="w-5 h-5 md:w-6 md:h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
              </svg>
              <span className="text-sm md:text-base">Automated text extraction from homework images</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 md:w-6 md:h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
              </svg>
              <span className="text-sm md:text-base">AI-powered feedback based on student level</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 md:w-6 md:h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
              </svg>
              <span className="text-sm md:text-base">Interactive teacher reviews and comments</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}