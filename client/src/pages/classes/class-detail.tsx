import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Class, Branch } from "@shared/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { useToast } from "@/hooks/use-toast";
import { useRoute } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ClassDetail() {
  const [, params] = useRoute("/admin/classes/:id");
  const classId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: classData, isLoading: isClassLoading } = useQuery<Class>({
    queryKey: ["/api/classes", classId],
    enabled: !!classId,
  });

  const { data: branchData } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ["/api/classes", classId, "teachers"],
    enabled: !!classId,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["/api/classes", classId, "students"],
    enabled: !!classId,
  });

  if (isClassLoading) {
    return <div>Loading...</div>;
  }

  if (!classData) {
    return <div>Class not found</div>;
  }

  const branch = branchData?.find(b => b.id === classData.branchId);

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{classData.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium">Branch</p>
                  <p className="text-lg">{branch?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">English Level</p>
                  <p className="text-lg">{classData.englishLevel || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Age Group</p>
                  <p className="text-lg">{classData.ageGroup || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teachers Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Teachers</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell>{teacher.name}</TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Students Section */}
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}