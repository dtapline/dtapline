import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProjectSettingsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Project Settings</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Project name" defaultValue="cloudmatrix" />
          <Input placeholder="Git repository URL" defaultValue="https://github.com/user/cloudmatrix" />
          <Button>Save</Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="environments">
        <TabsList>
          <TabsTrigger value="environments">Environments</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        <TabsContent value="environments">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Environments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Input placeholder="Environment name" defaultValue="development" />
                <Input placeholder="Target URL or cluster" defaultValue="dev.cloudmatrix.io" />
                <Button>Add Environment</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Detected Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>apps/frontend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input defaultValue="Frontend App" />
                    <Input defaultValue="apps/frontend" />
                  </CardContent>
                </Card>
                <Button>Add Service</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
