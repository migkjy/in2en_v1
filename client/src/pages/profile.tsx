import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Lock, User } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // Get user details
  const { data: userDetails, isLoading } = useQuery({
    queryKey: [`/api/users/${user?.id}`],
    queryFn: async () => {
      if (!user?.id) throw new Error("User ID is required");
      try {
        const response = await fetch(`/api/users/${user.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch user details");
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching user details:", error);
        // If user details fetch fails, use the current user data as fallback
        return user;
      }
    },
    enabled: !!user?.id,
  });

  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Update form data when userDetails changes
  useEffect(() => {
    if (userDetails) {
      setFormData(prev => ({
        ...prev,
        name: userDetails.name || user?.name || "",
        phone_number: userDetails.phone_number || "",
      }));
    } else if (user) {
      // Fallback to current user data if userDetails is not available
      setFormData(prev => ({
        ...prev,
        name: user.name || "",
        phone_number: user.phone_number || "",
      }));
    }
  }, [userDetails, user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; phone_number: string }) => {
      const response = await fetch(`/api/users/${user?.id}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to update profile");
      }

      return response.json();
    },
    onSuccess: (updatedUser) => {
      // Update the form data with the new values
      setFormData(prev => ({
        ...prev,
        name: updatedUser.name || "",
        phone_number: updatedUser.phone_number || "",
      }));

      // Update the React Query cache with the new user data
      queryClient.setQueryData([`/api/users/${user?.id}`], updatedUser);
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch(`/api/users/${user?.id}/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to change password");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setFormData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      await updateProfileMutation.mutate({
        name: formData.name,
        phone_number: formData.phone_number,
      });
    }
  };

  const validatePassword = (password: string): { isValid: boolean; message: string } => {
    if (!password) {
      return { isValid: false, message: "Password is required" };
    }
    if (password.length < 6) {
      return { isValid: false, message: "Password must be at least 6 characters" };
    }
    return { isValid: true, message: "" };
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate the new password
    const validation = validatePassword(formData.newPassword);
    if (!validation.isValid) {
      toast({
        title: "Error",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.currentPassword) {
      toast({
        title: "Error",
        description: "Current password is required",
        variant: "destructive",
      });
      return;
    }
    
    await changePasswordMutation.mutate({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar className="w-64" />
        <main className="flex-1 p-8">
          <div>Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">My Profile</h1>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Profile Information
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={userDetails?.email || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({ ...formData, phone_number: e.target.value })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  {!isEditing ? (
                    <Button type="button" onClick={() => setIsEditing(true)}>
                      Edit
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                      >
                        Save
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center">
                  <Lock className="w-5 h-5 mr-2" />
                  Change Password
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currentPassword: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, newPassword: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md border my-2">
                  <p className="font-medium mb-1">Password Requirements:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Password must be at least 6 characters long</li>
                    <li>Current password is required</li>
                    <li>New password and confirmation must match</li>
                  </ul>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                  >
                    Change Password
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