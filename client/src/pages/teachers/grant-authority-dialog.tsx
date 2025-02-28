import { useEffect, useState } from "react";
import { Class, Branch } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

type GrantAuthorityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: number;
  currentClasses: Class[];
  currentBranches: Branch[];
};

export function GrantAuthorityDialog({
  open,
  onOpenChange,
  teacherId,
  currentClasses,
  currentBranches,
}: GrantAuthorityDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  useEffect(() => {
    if (open && currentClasses) {
      setSelectedClasses(currentClasses.map((c) => c.id));
      setSelectedBranch("all");
    }
  }, [open, currentClasses]);

  const { data: classes } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    enabled: open,
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: open,
  });

  const updateAuthority = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/teachers/${teacherId}/authority`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classIds: selectedClasses,
          branchIds: [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to update authority");
      }

      return true;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      queryClient.invalidateQueries({ queryKey: [`/api/teachers/${teacherId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/teachers", teacherId, "classes"] });

      toast({
        title: "Success",
        description: "교사 권한이 성공적으로 업데이트되었습니다.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "교사 권한 업데이트에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
      console.error("Authority update error:", error);
    },
  });

  const getBranchName = (branchId: number | null) => {
    if (!branchId || !branches) return "지점 없음";
    const branch = branches.find((b) => b.id === branchId);
    return branch ? branch.name : "알 수 없는 지점";
  };

  const filteredClasses = classes?.filter((cls) =>
    selectedBranch === "all" || cls.branchId?.toString() === selectedBranch
  ).sort((a, b) => {
    const branchA = getBranchName(a.branchId);
    const branchB = getBranchName(b.branchId);
    if (branchA < branchB) return -1;
    if (branchA > branchB) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>권한 부여</DialogTitle>
          <DialogDescription>
            이 교사에게 부여할 클래스를 선택하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Label htmlFor="branch-filter">지점 필터:</Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="지점 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 지점</SelectItem>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">개별 클래스</h3>
            <ScrollArea className="h-[200px] border rounded-md p-4">
              <div className="space-y-2">
                {filteredClasses?.map((cls) => (
                  <div key={cls.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`class-${cls.id}`}
                      checked={selectedClasses.includes(cls.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedClasses([...selectedClasses, cls.id]);
                        } else {
                          setSelectedClasses(
                            selectedClasses.filter((id) => id !== cls.id)
                          );
                        }
                      }}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`class-${cls.id}`}
                        className="flex items-center"
                      >
                        <span className="text-sm text-muted-foreground mr-2">
                          [{getBranchName(cls.branchId)}]
                        </span>
                        <span>{cls.name}</span>
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              onClick={() => updateAuthority.mutate()}
              disabled={updateAuthority.isPending}
            >
              {updateAuthority.isPending ? "업데이트 중..." : "변경사항 저장"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}