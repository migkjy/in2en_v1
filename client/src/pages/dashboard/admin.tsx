import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "wouter";
import type { Branch, Class } from "@shared/schema";

export default function AdminDashboard() {
  const { data: branches, isLoading: loadingBranches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: classes, isLoading: loadingClasses } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  return (
    <div className="flex h-screen bg-gray-50/50">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto pt-14 md:pt-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Admin Dashboard</h1>
            <p className="mt-2 text-gray-500">Manage In2English branches, classes, and more.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Branches Section */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-semibold">Branches</CardTitle>
                {/*Removed Add Branch Button*/}
              </CardHeader>
              <CardContent>
                {loadingBranches ? (
                  <div className="flex items-center justify-center h-48 text-gray-400">
                    Loading branches...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {branches?.map((branch) => (
                      <div key={branch.id} className="p-4 rounded-lg border border-gray-100">
                        <h3 className="font-medium text-gray-900">
                          {branch.name}
                        </h3>
                        {branch.address && (
                          <p className="mt-1 text-sm text-gray-500">
                            {branch.address}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Classes Section */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-semibold">Classes</CardTitle>
                {/*Removed Add Class Button*/}
              </CardHeader>
              <CardContent>
                {loadingClasses ? (
                  <div className="flex items-center justify-center h-48 text-gray-400">
                    Loading classes...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {classes?.map((cls) => (
                      <Link key={cls.id} href={`/admin/classes/${cls.id}`}>
                        <div className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-colors cursor-pointer group">
                          <h3 className="font-medium text-gray-900 group-hover:text-primary">
                            {cls.name}
                          </h3>
                          <div className="mt-2 flex gap-3">
                            <p className="text-sm text-gray-500">
                              Level: {cls.englishLevel || "Not set"}
                            </p>
                            <p className="text-sm text-gray-500">
                              Age Group: {cls.ageGroup || "Not set"}
                            </p>
                          </div>
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