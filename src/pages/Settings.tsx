import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useInventory } from "@/hooks/useInventory";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  User, Nfc, Key, FileText, Eye, EyeOff, Copy, RefreshCw, 
  Link as LinkIcon, Send, CheckCircle, Plus
} from "lucide-react";
import { UsersTab } from "@/components/UsersTab";

interface Note {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

interface Carrier {
  id: string;
  name: string;
  icon: string;
  status: "connected" | "pending" | "disconnected";
  accountNumber: string;
}

const mockCarriers: Carrier[] = [
  { id: "1", name: "UPS", icon: "📦", status: "connected", accountNumber: "4782" },
  { id: "2", name: "FedEx", icon: "📬", status: "connected", accountNumber: "9123" },
  { id: "3", name: "USPS", icon: "📮", status: "connected", accountNumber: "5567" },
];

const MOCK_NOTES: Note[] = [
  {
    id: "1",
    content: "Customer requested custom branding options for their verification emails. Follow up scheduled for next week.",
    author: "Sarah Chen",
    createdAt: "Feb 3, 2026 at 2:30 PM"
  },
  {
    id: "2",
    content: "Upgraded from Growth to Scale plan. Very satisfied with verification accuracy rates.",
    author: "Mike Johnson",
    createdAt: "Jan 28, 2026 at 9:15 AM"
  },
  {
    id: "3",
    content: "Initial onboarding completed. Key contact is their VP of Operations.",
    author: "Sarah Chen",
    createdAt: "Jan 15, 2026 at 11:00 AM"
  }
];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "account";
  const { user: session } = useAuth(); // Renaming destructure to match existing 'user' state
  const { data: inventory } = useInventory();

  // API Keys state
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const publicKey = "pk_live_3pl_" + "•".repeat(24);
  const secretKey = "sk_live_3pl_" + "•".repeat(24);

  // Notes state
  const [notes, setNotes] = useState<Note[]>(MOCK_NOTES);
  const [newNote, setNewNote] = useState("");

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    // Could add toast notification here
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    const note: Note = {
      id: Date.now().toString(),
      content: newNote,
      author: session?.merchant?.name || "You",
      createdAt: new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      })
    };
    
    setNotes([note, ...notes]);
    setNewNote("");
  };

  const utilizationPercent = inventory 
    ? Math.round((inventory.enrolled / inventory.total) * 100) 
    : 0;

  return (
    <AppLayout>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <PageHeader title="Settings" />

        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full justify-start gap-1 bg-transparent border-b border-border rounded-none h-auto p-0 mb-6 overflow-x-auto">
            <TabsTrigger 
              value="account" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
            >
              Account
            </TabsTrigger>
            <TabsTrigger 
              value="tags" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
            >
              Tag Inventory
            </TabsTrigger>
            <TabsTrigger 
              value="api" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
            >
              API Keys
            </TabsTrigger>
            <TabsTrigger 
              value="carriers" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
            >
              Carriers
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
            >
              Users
            </TabsTrigger>
            <TabsTrigger 
              value="notes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
            >
              Notes
            </TabsTrigger>
          </TabsList>

          {/* Account Tab */}
          <TabsContent value="account" className="mt-0">
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-6">
                <User size={20} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Account Details</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Name</label>
                  <p className="font-medium mt-1">{session?.merchant?.name || "—"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Email</label>
                  <p className="font-medium mt-1">{session?.merchant?.email || "—"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Merchant ID</label>
                  <p className="font-mono text-sm mt-1">{session?.merchant?.id || "—"}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tag Inventory Tab */}
          <TabsContent value="tags" className="mt-0 space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <Nfc size={20} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Current Inventory</span>
              </div>
              <p className="font-heading text-4xl font-normal">{inventory?.available.toLocaleString() || "—"}</p>
              <p className="text-sm text-muted-foreground mt-1">stickers remaining</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Used This Period</span>
              <p className="font-heading text-4xl font-normal mt-2">{inventory?.enrolled.toLocaleString() || "—"}</p>
              <p className="text-sm text-muted-foreground mt-1">of {inventory?.total.toLocaleString() || 0} allocated</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Utilization</span>
              <p className="font-heading text-4xl font-normal mt-2">{utilizationPercent}%</p>
              <Progress value={utilizationPercent} className="h-2 mt-3" />
            </div>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api" className="mt-0 space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <Key size={20} className="text-muted-foreground" />
                <div>
                  <p className="font-medium">API Keys</p>
                  <p className="text-xs text-muted-foreground">Manage API credentials for {session?.merchant?.name || "your warehouse"}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Public Key */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Public API Key</label>
                    <span className="text-xs text-muted-foreground">Last rotated: Jan 20, 2026</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2.5 font-mono text-sm">
                      <span className="flex-1 truncate">
                        {showPublicKey ? "pk_live_3pl_abc123xyz789..." : publicKey}
                      </span>
                      <button 
                        onClick={() => setShowPublicKey(!showPublicKey)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPublicKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <button 
                      onClick={() => handleCopyKey("pk_live_3pl_abc123xyz789")}
                      className="w-10 h-10 flex items-center justify-center border border-border rounded-lg hover:bg-secondary transition-colors"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                {/* Secret Key */}
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Secret Key</label>
                  <div className="flex gap-2 mt-1.5">
                    <div className="flex-1 flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2.5 font-mono text-sm">
                      <span className="flex-1 truncate">
                        {showSecretKey ? "sk_live_3pl_secret123..." : secretKey}
                      </span>
                      <button 
                        onClick={() => setShowSecretKey(!showSecretKey)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <button 
                      onClick={() => handleCopyKey("sk_live_3pl_secret123")}
                      className="w-10 h-10 flex items-center justify-center border border-border rounded-lg hover:bg-secondary transition-colors"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Never share your secret key publicly.</p>
                </div>

                <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-secondary transition-colors text-sm">
                  <RefreshCw size={14} />
                  Regenerate Keys
                </button>
                <p className="text-xs text-muted-foreground">
                  Regenerating will invalidate current keys across all warehouses
                </p>
              </div>
            </div>

            {/* Webhook URL */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <LinkIcon size={20} className="text-muted-foreground" />
                <div>
                  <p className="font-medium">Webhook URL</p>
                  <p className="text-xs text-muted-foreground">Endpoint for receiving real-time verification and fulfillment events</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Your Webhook Endpoint</label>
                <Input 
                  className="mt-1.5 font-mono text-sm" 
                  placeholder="https://your-server.com/webhooks/ink"
                  defaultValue=""
                />
              </div>
            </div>
          </TabsContent>

          {/* Carriers Tab */}
          <TabsContent value="carriers" className="mt-0">
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Connected Carriers</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mockCarriers.filter(c => c.status === "connected").length} carriers connected
                  </p>
                </div>
                <Button size="sm" className="gap-2">
                  <Plus size={14} />
                  Add Carrier
                </Button>
              </div>

              {/* Carriers Table */}
              <div className="border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                        Carrier
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">
                        Account
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockCarriers.map((carrier) => (
                      <TableRow key={carrier.id} className="hover:bg-secondary/30">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{carrier.icon}</span>
                            <span>{carrier.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className="bg-success/10 text-success border-success/30 gap-1"
                          >
                            <CheckCircle size={12} />
                            Connected
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          ••••••{carrier.accountNumber}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-0">
            <UsersTab />
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="mt-0">
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <FileText size={20} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Internal Notes</span>
              </div>

              {/* Add Note */}
              <div className="mb-6">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this account..."
                  className="min-h-[80px] mb-2"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Press ⌘+Enter to save</span>
                  <Button 
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    className="gap-2"
                    size="sm"
                  >
                    <Send size={14} />
                    Add Note
                  </Button>
                </div>
              </div>

              {/* Notes List */}
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="border-l-2 border-border pl-4 py-1">
                    <p className="text-sm leading-relaxed">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {note.author} · {note.createdAt}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}