"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Wallet } from "lucide-react";

import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";

export default function SettingsPage() {
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Record<string, string>>("/api/admin/settings");
      if (data.upi_id) {
        setUpiId(data.upi_id);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiClient.post("/api/admin/settings", { upi_id: upiId });
      toast.success("Settings saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Global Settings</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Payment Configuration
            </CardTitle>
            <CardDescription>
              Manage the UPI ID used for receiving payments across the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upi_id">Active UPI ID</Label>
              <Input
                id="upi_id"
                placeholder="e.g. 7016272690-2@ybl"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                This UPI ID will be displayed on the manual QR payment page and used for intent links. We recommend using a personal UPI ID to avoid merchant risk policy errors on Android/iOS.
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="mt-4">
              {saving ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
