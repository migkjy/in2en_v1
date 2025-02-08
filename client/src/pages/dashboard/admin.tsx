import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "wouter";
import type { Academy, Class } from "@shared/schema";

export default function AdminDashboard() {
  const { data: academies, isLoading: loadingAcademies } = useQuery<Academy[]>({
    queryKey: ["/api/academies"],
  });

  const { data: classes, isLoading: loadingClasses } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

          <div className="grid grid-cols-2 gap-8">
            {/* Academies Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Academies</CardTitle>
                <Link href="/admin/academies/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Academy
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {loadingAcademies ? (
                  <div>Loading academies...</div>
                ) : (
                  <div className="space-y-2">
                    {academies?.map((academy) => (
                      <Link 
                        key={academy.id} 
                        href={`/admin/academies/${academy.id}`}
                      >
                        <div className="p-4 border rounded hover:bg-gray-50 cursor-pointer">
                          <h3 className="font-medium">{academy.name}</h3>
                          {academy.address && (
                            <p className="text-sm text-gray-500">
                              {academy.address}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Classes Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Classes</CardTitle>
                <Link href="/admin/classes/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Class
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {loadingClasses ? (
                  <div>Loading classes...</div>
                ) : (
                  <div className="space-y-2">
                    {classes?.map((cls) => (
                      <Link 
                        key={cls.id} 
                        href={`/admin/classes/${cls.id}`}
                      >
                        <div className="p-4 border rounded hover:bg-gray-50 cursor-pointer">
                          <h3 className="font-medium">{cls.name}</h3>
                          <p className="text-sm text-gray-500">
                            Level: {cls.englishLevel || "Not set"}
                          </p>
                          <p className="text-sm text-gray-500">
                            Age Group: {cls.ageGroup || "Not set"}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
