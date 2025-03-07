import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { EnglishLevel, AgeGroup } from "@shared/schema";

interface ManageOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageOptionsDialog({ open, onOpenChange }: ManageOptionsDialogProps) {
  const [newEnglishLevel, setNewEnglishLevel] = useState("");
  const [newAgeGroup, setNewAgeGroup] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: englishLevels = [] } = useQuery<EnglishLevel[]>({
    queryKey: ["/api/english-levels"],
  });

  const { data: ageGroups = [] } = useQuery<AgeGroup[]>({
    queryKey: ["/api/age-groups"],
  });

  const addEnglishLevel = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch("/api/english-levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Failed to add English level");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/english-levels"] });
      setNewEnglishLevel("");
      toast({ title: "Success", description: "English level added successfully" });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to add English level", 
        variant: "destructive" 
      });
    },
  });

  const addAgeGroup = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch("/api/age-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Failed to add age group");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/age-groups"] });
      setNewAgeGroup("");
      toast({ title: "Success", description: "Age group added successfully" });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to add age group", 
        variant: "destructive" 
      });
    },
  });

  const handleAddEnglishLevel = () => {
    if (!newEnglishLevel.trim()) {
      toast({
        title: "Error",
        description: "English level name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    addEnglishLevel.mutate(newEnglishLevel);
  };

  const handleAddAgeGroup = () => {
    if (!newAgeGroup.trim()) {
      toast({
        title: "Error",
        description: "Age group name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    addAgeGroup.mutate(newAgeGroup);
  };

  const deleteEnglishLevel = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/english-levels/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete English level");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/english-levels"] });
      toast({ title: "Success", description: "English level deleted successfully" });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to delete English level", 
        variant: "destructive" 
      });
    },
  });

  const deleteAgeGroup = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/age-groups/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete age group");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/age-groups"] });
      toast({ title: "Success", description: "Age group deleted successfully" });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to delete age group", 
        variant: "destructive" 
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Manage Class Options</DialogTitle>
          <DialogDescription>
            Add or remove English levels and age groups for classes
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="english-levels">
          <TabsList>
            <TabsTrigger value="english-levels">English Levels</TabsTrigger>
            <TabsTrigger value="age-groups">Age Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="english-levels" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New English Level"
                value={newEnglishLevel}
                onChange={(e) => setNewEnglishLevel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddEnglishLevel();
                  }
                }}
              />
              <Button 
                onClick={handleAddEnglishLevel}
                disabled={addEnglishLevel.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {englishLevels.map((level) => (
                  <TableRow key={level.id}>
                    <TableCell>{level.name}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteEnglishLevel.mutate(level.id)}
                        disabled={deleteEnglishLevel.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="age-groups" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New Age Group"
                value={newAgeGroup}
                onChange={(e) => setNewAgeGroup(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddAgeGroup();
                  }
                }}
              />
              <Button 
                onClick={handleAddAgeGroup}
                disabled={addAgeGroup.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ageGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>{group.name}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAgeGroup.mutate(group.id)}
                        disabled={deleteAgeGroup.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}