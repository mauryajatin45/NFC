import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BlockStack,
  Card,
  Text,
  TextField,
  Button,
  InlineStack,
  Avatar,
  Badge,
  IndexTable,
  Modal,
  Select,
  Layout,
  Icon,
  Spinner,
  Banner,
} from "@shopify/polaris";
import { PlusIcon, DeleteIcon, SearchIcon, ClipboardIcon } from "@shopify/polaris-icons";
import { Download, ExternalLink } from "lucide-react";
import { fetchUsers, deleteUser, adminCreateUser } from "@/services/api";

interface WarehouseUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string | null;
}

// Map MerchantUser (API) → WarehouseUser (UI)
function mapUser(u: any): WarehouseUser {
  return {
    id: u.user_id || u.id || "",
    name: u.name || "",
    email: u.email || "",
    role: u.role || "operator",
    createdAt: u.created_at || null,
  };
}

const UserManagementSettings = () => {
  const queryClient = useQueryClient();
  const merchantId = localStorage.getItem("merchantId") || "";
  const storeName = localStorage.getItem("storeName") || "Luminary Goods";
  const merchantDisplayId = merchantId ? `MID-${merchantId.slice(0, 6).toUpperCase()}` : "MID-UNKNOWN";

  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole] = useState("operator");
  const [inviteError, setInviteError] = useState<string | null>(null);

  // ── Fetch users ──
  const {
    data: rawUsers,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["warehouse-users", merchantId],
    queryFn: async () => {
      if (!merchantId) throw new Error("Not authenticated — merchant ID missing.");
      const res = await fetchUsers(merchantId);
      if (res.error) throw new Error(res.error.message);
      return (res.data ?? []).map(mapUser);
    },
    staleTime: 0,
    refetchOnMount: "always",
    enabled: !!merchantId,
  });

  const users: WarehouseUser[] = rawUsers ?? [];
  const filtered = users.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  // ── Create / invite user ──
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!inviteName || !inviteEmail || !invitePassword)
        throw new Error("All fields are required.");
      const res = await adminCreateUser({
        merchant_id: merchantId,
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        password: invitePassword,
      } as any);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-users", merchantId] });
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInvitePassword("");
      setInviteError(null);
    },
    onError: (err: Error) => setInviteError(err.message),
  });

  // ── Delete user ──
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await deleteUser(userId);
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-users", merchantId] });
    },
    onError: (err: Error) => alert(`Delete failed: ${err.message}`),
  });

  const handleInvite = useCallback(() => {
    setInviteError(null);
    inviteMutation.mutate();
  }, [inviteName, inviteEmail, invitePassword]);

  const handleRemove = useCallback((id: string, name: string) => {
    if (confirm(`Remove ${name}? They will no longer be able to log in.`)) {
      deleteMutation.mutate(id);
    }
  }, []);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const isSubmitting = inviteMutation.isPending;

  return (
    <Layout>
      <Layout.AnnotatedSection title="Team Members">
        <BlockStack gap="400">
          {/* Error banner */}
          {isError && (
            <Banner tone="critical">
              <p>{(error as Error)?.message || "Failed to load users."}</p>
            </Banner>
          )}

          {/* Actions */}
          <InlineStack align="space-between" blockAlign="center">
            <div style={{ maxWidth: "280px", width: "100%" }}>
              <TextField
                label=""
                labelHidden
                placeholder="Search users..."
                value={search}
                onChange={setSearch}
                prefix={<Icon source={SearchIcon} />}
                autoComplete="off"
              />
            </div>
            <Button icon={PlusIcon} onClick={() => setInviteOpen(true)}>
              Invite User
            </Button>
          </InlineStack>

          {/* Users Table */}
          <Card padding="0">
            {isLoading ? (
              <div style={{ padding: "48px", textAlign: "center" }}>
                <Spinner size="large" />
              </div>
            ) : (
              <IndexTable
                resourceName={{ singular: "user", plural: "users" }}
                itemCount={filtered.length}
                headings={[
                  { title: "User" },
                  { title: "Role" },
                  { title: "Status" },
                  { title: "" },
                ]}
                selectable={false}
                loading={deleteMutation.isPending}
                emptyState={
                  <div style={{ padding: "48px", textAlign: "center" }}>
                    <Text as="p" tone="subdued" variant="bodySm">
                      {search ? "No users match your search." : "No team members yet. Invite one to get started."}
                    </Text>
                  </div>
                }
              >
                {filtered.map((member, index) => (
                  <IndexTable.Row id={member.id} key={member.id} position={index} selected={false}>
                    <IndexTable.Cell>
                      <InlineStack gap="300" blockAlign="center">
                        <Avatar initials={getInitials(member.name)} size="sm" />
                        <BlockStack gap="0">
                          <Text as="span" variant="bodyMd" fontWeight="medium">{member.name}</Text>
                          <Text as="span" variant="bodySm" tone="subdued">{member.email}</Text>
                        </BlockStack>
                      </InlineStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Badge tone="info">{member.role}</Badge>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Badge tone="success">Active</Badge>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Button
                        icon={DeleteIcon}
                        variant="plain"
                        tone="critical"
                        onClick={() => handleRemove(member.id, member.name)}
                        accessibilityLabel={`Remove ${member.name}`}
                        loading={deleteMutation.isPending && deleteMutation.variables === member.id}
                      />
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            )}
          </Card>
        </BlockStack>
      </Layout.AnnotatedSection>

      {/* Warehouse App download section */}
      <Layout.AnnotatedSection
        title="Warehouse App"
        description="Download the INK enrollment app for your packing stations."
      >
        <Card>
          <InlineStack gap="600" wrap={false} blockAlign="start">
            <div style={{ width: "120px", height: "120px", border: "1px solid var(--p-color-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "var(--p-color-bg-surface-secondary)" }}>
              <svg viewBox="0 0 100 100" style={{ width: "100px", height: "100px" }} aria-label="QR code to download Warehouse App">
                <rect x="5" y="5" width="25" height="25" fill="currentColor" />
                <rect x="35" y="5" width="5" height="5" fill="currentColor" />
                <rect x="45" y="5" width="5" height="5" fill="currentColor" />
                <rect x="55" y="5" width="5" height="5" fill="currentColor" />
                <rect x="70" y="5" width="25" height="25" fill="currentColor" />
                <rect x="10" y="10" width="15" height="15" fill="var(--p-color-bg)" />
                <rect x="75" y="10" width="15" height="15" fill="var(--p-color-bg)" />
                <rect x="13" y="13" width="9" height="9" fill="currentColor" />
                <rect x="78" y="13" width="9" height="9" fill="currentColor" />
                <rect x="5" y="70" width="25" height="25" fill="currentColor" />
                <rect x="10" y="75" width="15" height="15" fill="var(--p-color-bg)" />
                <rect x="13" y="78" width="9" height="9" fill="currentColor" />
              </svg>
            </div>
            <BlockStack gap="400">
              <Text as="p" tone="subdued" variant="bodySm">
                Scan to download the INK Warehouse app on your packing station devices.
              </Text>
              <BlockStack gap="200">
                <InlineStack gap="200">
                  <Text as="span" tone="subdued" variant="bodySm">Store Name:</Text>
                  <Text as="span" variant="bodySm" fontWeight="medium">{storeName}</Text>
                </InlineStack>
                <InlineStack gap="200" blockAlign="center">
                  <Text as="span" tone="subdued" variant="bodySm">Merchant ID:</Text>
                  <code style={{ fontSize: "12px", fontFamily: "monospace", background: "var(--p-color-bg-surface-secondary)", padding: "2px 6px" }}>{merchantDisplayId}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(merchantDisplayId)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", display: 'flex', alignItems: 'center' }}
                    aria-label="Copy Merchant ID"
                  >
                    <Icon source={ClipboardIcon} tone="subdued" />
                  </button>
                </InlineStack>
              </BlockStack>
              <InlineStack gap="300">
                <Button onClick={() => window.open("https://apps.apple.com/us/app/ink-warehouse/id6670417764", "_blank")} icon={() => <Download size={16} />}>
                  Download App
                </Button>
                <Button variant="plain" onClick={() => window.open("https://warehouse-bee05.web.app/login", "_blank")} icon={() => <ExternalLink size={16} />}>
                  Open App
                </Button>
              </InlineStack>
            </BlockStack>
          </InlineStack>
        </Card>
      </Layout.AnnotatedSection>

      {/* Invite Modal */}
      <Modal
        open={inviteOpen}
        onClose={() => { setInviteOpen(false); setInviteError(null); }}
        title="Invite a user"
        primaryAction={{
          content: isSubmitting ? "Inviting..." : "Send Invite",
          onAction: handleInvite,
          disabled: !inviteEmail || !inviteName || !invitePassword || isSubmitting,
          loading: isSubmitting,
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => { setInviteOpen(false); setInviteError(null); } }]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            {inviteError && (
              <Banner tone="critical"><p>{inviteError}</p></Banner>
            )}
            <TextField
              label="Full name"
              placeholder="Jane Smith"
              value={inviteName}
              onChange={setInviteName}
              autoComplete="name"
            />
            <TextField
              label="Email address"
              type="email"
              placeholder="name@company.com"
              value={inviteEmail}
              onChange={setInviteEmail}
              autoComplete="email"
            />
            <TextField
              label="Password"
              type="password"
              placeholder="••••••••"
              value={invitePassword}
              onChange={setInvitePassword}
              autoComplete="new-password"
            />
            <Select
              label="Role"
              value={inviteRole}
              onChange={() => {}}
              options={[{ label: "Operator", value: "operator" }]}
              disabled
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Layout>
  );
};

export default UserManagementSettings;
