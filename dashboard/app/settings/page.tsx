"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, Alert, Spinner, Button } from "@/components/ui";
import { Key, Plus, Trash2, Copy, Check, Shield, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  type ApiKeyEntry,
} from "@/lib/api";

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const fetchKeys = useCallback(async () => {
    try {
      const data = await listApiKeys();
      setKeys(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }
    if (user) fetchKeys();
  }, [user, authLoading, fetchKeys, router]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError("");
    setCreatedKey(null);
    try {
      const result = await createApiKey(newKeyName.trim());
      setCreatedKey(result.key ?? null);
      setNewKeyName("");
      await fetchKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    try {
      await revokeApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch {
      /* ignore */
    }
  };

  const handleCopy = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={20} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Manage your account and API keys</p>
      </div>

      {/* Profile */}
      {user && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Shield size={18} className="text-pink-500" />
            Profile
          </h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-slate-500">Name:</span>{" "}
              <span className="text-slate-800 font-medium">{user.name}</span>
            </div>
            <div>
              <span className="text-slate-500">Email:</span>{" "}
              <span className="text-slate-800 font-medium">{user.email}</span>
            </div>
          </div>
        </Card>
      )}

      {/* API Keys */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Key size={18} className="text-pink-500" />
            API Keys
          </h2>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          API keys allow programmatic access to the RedSentinel API. Treat them
          like passwords — never share them or commit them to source control.
        </p>

        {/* Create new key */}
        <div className="mb-6 flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Key name</label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., CI/CD Pipeline"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={creating || !newKeyName.trim()}
            variant="primary"
          >
            {creating ? (
              <Spinner size={12} />
            ) : (
              <Plus size={14} />
            )}
            Create Key
          </Button>
        </div>

        {error && (
          <div className="mb-4">
            <Alert type="error">{error}</Alert>
          </div>
        )}

        {/* Show newly created key */}
        {createdKey && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="mb-2 text-sm font-medium text-amber-700">
              ⚠️ API Key Created — Copy it now. You won&apos;t be able to see it again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded border border-slate-200 bg-white px-3 py-2 text-sm text-amber-700 font-mono">
                {createdKey}
              </code>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {/* Key list */}
        {keys.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
            <Key size={24} className="mx-auto mb-2 text-slate-300" />
            No API keys yet. Create one above.
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">
                      {key.name}
                    </span>
                    <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 font-mono">
                      {key.keyPrefix}...
                    </code>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      Created{" "}
                      {new Date(key.createdAt).toLocaleDateString()}
                    </span>
                    {key.lastUsedAt ? (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        Last used{" "}
                        {new Date(key.lastUsedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-slate-400">Never used</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(key.id)}
                  className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-50"
                  title="Revoke key"
                >
                  <Trash2 size={12} />
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Auth info */}
      <Card>
        <div className="flex items-start gap-3 text-sm text-slate-500">
          <Key size={16} className="mt-0.5 shrink-0 text-slate-400" />
          <div>
            <p className="mb-1 font-medium text-slate-700">Using API Keys</p>
            <p>
              Pass your API key in the <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 font-mono">x-api-key</code> header:
            </p>
            <pre className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 font-mono overflow-x-auto">
              curl -H &quot;x-api-key: rs_xxxxxxxxxxxx&quot; https://your-host/api/scan
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
}
