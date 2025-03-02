import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Lock, User } from "lucide-react";
import { useLocation } from "wouter";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [, navigate] = useLocation();

  // Redirect if not authenticated
  if (!user) {
    navigate("/auth");
    return null;
  }

  // Get user details based on role
  const { data: userDetails, isLoading, error } = useQuery({
    queryKey: [`/api/teachers/${user.id}`],
    queryFn: async () => {
      try {
        console.log('Fetching profile for user:', user.id, 'role:', user.role);
        const response = await fetch(`/api/teachers/${user.id}`, {
          credentials: 'include' // Ensure cookies are sent
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Profile fetch error:', response.status, errorText);
          throw new Error(`Failed to fetch profile: ${errorText}`);
        }
        const data = await response.json();
        console.log('Profile data received:', data);
        return data;
      } catch (err) {
        console.error('Profile fetch error:', err);
        throw err;
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
        name: userDetails.name || "",
        phone_number: userDetails.phone_number || "",
      }));
    }
  }, [userDetails]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; phone_number: string }) => {
      const response = await fetch(`/api/teachers/${user.id}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to update profile");
      }

      return response.json();
    },
    onSuccess: () => {
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
      const response = await fetch(`/api/teachers/${user.id}/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Ensure cookies are sent
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
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
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2">Loading profile...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen">
        <Sidebar className="w-64" />
        <main className="flex-1 p-8">
          <div className="flex items-center justify-center h-full">
            <p className="text-red-500">
              {error instanceof Error ? error.message : "Failed to load profile information"}
            </p>
          </div>
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
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Current and new password fields for password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (user) {
      // Fetch the detailed profile
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/teachers/${user.id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.statusText}`);
      }
      
      const data = await response.json();
      setName(data.name || "");
      setPhoneNumber(data.phone_number || "");
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/teachers/${user.id}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone_number: phoneNumber,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update profile");
      }
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditMode(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/teachers/${user.id}/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to change password");
      }
      
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      
      // Reset password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
    } catch (error) {
      console.error("Error changing password:", error);
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">My Profile</h1>
          
          {/* Profile Information Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div>Loading profile...</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      {isEditMode ? (
                        <Input 
                          value={name} 
                          onChange={(e) => setName(e.target.value)} 
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1">{name}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <p className="mt-1">{user?.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone Number</label>
                      {isEditMode ? (
                        <Input 
                          value={phoneNumber} 
                          onChange={(e) => setPhoneNumber(e.target.value)} 
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1">{phoneNumber || "Not provided"}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">Role</label>
                      <p className="mt-1 capitalize">{user?.role.toLowerCase()}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    {isEditMode ? (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsEditMode(false)} 
                          className="mr-2"
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleSaveProfile}
                          disabled={isLoading}
                        >
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      <Button 
                        onClick={() => setIsEditMode(true)}
                        disabled={isLoading}
                      >
                        Edit Profile
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Change Password Card */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Current Password</label>
                  <Input 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">New Password</label>
                  <Input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <Input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1"
                  />
                  {passwordError && (
                    <p className="text-sm text-red-500 mt-1">{passwordError}</p>
                  )}
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleChangePassword}
                    disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
                  >
                    Change Password
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
