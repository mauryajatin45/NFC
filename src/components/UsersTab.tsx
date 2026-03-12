import { useState } from "react";
import { User, Shield, Plus, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { adminCreateUser } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InkLabel } from "./InkScreen";

export function UsersTab() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });

  // Currently mocked user list for display. In the future this should be a GET /admin/users call.
  const [users, setUsers] = useState([
    { id: "1", name: currentUser?.name || "You", email: currentUser?.email || "you@example.com", role: "Admin", status: "Active" },
    { id: "2", name: "Alice Smith", email: "alice@example.com", role: "Manager", status: "Active" }
  ]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.merchant_id) {
      toast({ variant: "destructive", title: "Cannot create user", description: "Missing merchant context." });
      return;
    }

    if (formData.password.length < 8) {
      toast({ variant: "destructive", title: "Weak password", description: "Password must be at least 8 characters long." });
      return;
    }

    setIsSubmitting(true);
    
    // Call the new SDK method pointing to /admin/users
    const { data, error } = await adminCreateUser({
      merchant_id: currentUser.merchant_id,
      name: formData.name,
      email: formData.email,
      password: formData.password
    });

    setIsSubmitting(false);

    if (error || !data) {
      toast({
        variant: "destructive",
        title: "Failed to create user",
        description: error?.message || "An unknown error occurred."
      });
      return;
    }

    // Success! Update local list and close dialog
    toast({
      title: "User Created",
      description: `${data.name} has been added to the team.`
    });

    setUsers(prev => [...prev, {
      id: data.user_id,
      name: data.name,
      email: data.email,
      role: data.role || "Merchant",
      status: "Active"
    }]);
    
    setFormData({ name: "", email: "", password: "" });
    setIsDialogOpen(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <User size={20} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Team Members</span>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ink" size="sm" className="h-8 shadow-sm">
              <Plus size={16} className="mr-1.5" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new login for a team member to access this warehouse.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-5 pt-4">
              <div>
                <InkLabel>Full Name</InkLabel>
                <Input 
                  required
                  placeholder="Jane Doe" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <InkLabel>Email Address</InkLabel>
                <Input 
                  required
                  type="email" 
                  placeholder="jane@company.com" 
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <InkLabel>Temporary Password</InkLabel>
                <Input 
                  required
                  type="text" 
                  placeholder="Min 8 characters" 
                  minLength={8}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="ink" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 size={16} className="mr-2 animate-spin" /> Creating...</> : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border border-border rounded-xl flex flex-col overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">User</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-center">Role</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="hover:bg-secondary/30">
                <TableCell>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="opacity-80">
                    {user.role === 'Admin' && <Shield size={12} className="mr-1" />}
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={user.status === 'Active' ? 'default' : 'secondary'}>
                    {user.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
