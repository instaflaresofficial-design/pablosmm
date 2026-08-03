"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Server, Trash2, Edit3, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/admin/ui/dialog";

interface SmmProvider {
  id: number;
  key: string;
  name: string;
  api_url: string;
  api_key: string;
  currency: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<SmmProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<SmmProvider | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<SmmProvider[]>("/admin/providers");
      setProviders(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load providers");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (provider?: SmmProvider) => {
    if (provider) {
      setEditingProvider(provider);
      setKey(provider.key);
      setName(provider.name);
      setApiUrl(provider.api_url);
      setApiKey(provider.api_key);
      setCurrency(provider.currency || "USD");
      setIsActive(provider.is_active);
    } else {
      setEditingProvider(null);
      setKey("");
      setName("");
      setApiUrl("");
      setApiKey("");
      setCurrency("USD");
      setIsActive(true);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!key || !name || !apiUrl || !apiKey) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);
      await apiClient.post("/admin/providers", {
        key: key.trim().toLowerCase(),
        name: name.trim(),
        api_url: apiUrl.trim(),
        api_key: apiKey.trim(),
        currency: currency.trim().toUpperCase(),
        is_active: isActive,
      });

      toast.success(editingProvider ? "Provider updated" : "Provider added");
      setDialogOpen(false);
      fetchProviders();
    } catch (error: any) {
      toast.error(error.message || "Failed to save provider");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, providerName: string) => {
    if (!confirm(`Are you sure you want to delete SMM provider "${providerName}"?`)) return;

    try {
      await apiClient.delete(`/admin/providers/${id}`);
      toast.success("Provider deleted");
      fetchProviders();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete provider");
    }
  };

  const handleToggleActive = async (provider: SmmProvider) => {
    try {
      await apiClient.post("/admin/providers", {
        key: provider.key,
        name: provider.name,
        api_url: provider.api_url,
        api_key: provider.api_key,
        currency: provider.currency,
        is_active: !provider.is_active,
      });
      toast.success(`Provider "${provider.name}" ${!provider.is_active ? "activated" : "deactivated"}`);
      fetchProviders();
    } catch (error: any) {
      toast.error(error.message || "Failed to toggle provider status");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">SMM Providers</h2>
          <p className="text-sm text-muted-foreground">
            Manage your connected SMM panel provider APIs for service aggregation and order fulfillment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchProviders} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Provider
          </Button>
        </div>
      </div>

      {/* Provider Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{providers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connected</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {providers.filter((p) => p.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive / Disabled</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {providers.filter((p) => !p.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Providers Table / Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Configured API Integrations</CardTitle>
          <CardDescription>
            All services from active providers are dynamically synchronized and curated in the Admin Services panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
              <Server className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-lg">No Providers Configured</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-1 mb-4">
                You currently have no database-configured providers. The backend is using the default fallback environment settings. Add your first provider below.
              </p>
              <Button onClick={() => handleOpenDialog()}>Add SMM Provider</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {providers.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-xl bg-card hover:bg-accent/40 transition-colors gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{p.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-muted text-muted-foreground">
                        key: {p.key}
                      </span>
                      {p.is_active ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-mono text-muted-foreground truncate max-w-md">
                      API URL: {p.api_url}
                    </p>
                    <div className="text-xs text-muted-foreground flex gap-3 pt-1">
                      <span>Currency: <strong>{p.currency}</strong></span>
                      <span>API Key: <strong className="font-mono">{p.api_key}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant={p.is_active ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleToggleActive(p)}
                    >
                      {p.is_active ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(p)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(p.id, p.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingProvider ? "Edit SMM Provider" : "Add SMM Provider"}</DialogTitle>
            <DialogDescription>
              Enter the SMM Panel API v2 credentials and endpoint information.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="key">Provider Unique Key (Slug)</Label>
              <Input
                id="key"
                placeholder="e.g. topsmm, securesmm, smmpanel2"
                value={key}
                disabled={!!editingProvider}
                onChange={(e) => setKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A short identifier used to prefix service IDs (e.g. topsmm:123).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                placeholder="e.g. TOPSMM Panel, Prime SMM"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiUrl">API URL</Label>
              <Input
                id="apiUrl"
                placeholder="https://topsmm.su/api/v2"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your provider API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Base Currency</Label>
              <Input
                id="currency"
                placeholder="USD or INR"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingProvider ? "Update Provider" : "Add Provider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
