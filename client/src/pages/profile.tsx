import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Lock, User, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // Get user details
  const { data: userDetails, isLoading, error } = useQuery({
    queryKey: ["/api/users", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User ID is required");
      const response = await fetch(`/api/users/${user.id}`);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to fetch user details");
      }
      return response.json();
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
      const response = await fetch(`/api/users/${user?.id}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("프로필 업데이트에 실패했습니다.");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "프로필이 업데이트되었습니다.",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "오류",
        description: "프로필 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch(`/api/users/${user?.id}/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("비밀번호 변경에 실패했습니다.");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "비밀번호가 변경되었습니다.",
      });
      setFormData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    },
    onError: () => {
      toast({
        title: "오류",
        description: "비밀번호 변경에 실패했습니다.",
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
        title: "오류",
        description: "새 비밀번호가 일치하지 않습니다.",
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
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !userDetails) {
    return (
      <div className="flex h-screen">
        <Sidebar className="w-64" />
        <main className="flex-1 p-8">
          <div className="text-center text-red-500">
            프로필 정보를 불러오는데 실패했습니다.
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
          <h1 className="text-2xl font-bold mb-6">마이페이지</h1>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  프로필 정보
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>ID</Label>
                  <Input value={userDetails.email || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={userDetails.email || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>이름</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>전화번호</Label>
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
                      수정하기
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        취소
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? "저장 중..." : "저장하기"}
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
                  비밀번호 변경
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label>현재 비밀번호</Label>
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
                  <Label>새 비밀번호</Label>
                  <Input
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, newPassword: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>새 비밀번호 확인</Label>
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
                    {changePasswordMutation.isPending ? "변경 중..." : "비밀번호 변경"}
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