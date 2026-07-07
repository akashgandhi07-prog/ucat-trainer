import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { type Coverage, errorMessage, withAuthSessionRetry } from "./shared";

export default function CoverageTab() {
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await withAuthSessionRetry<Coverage>(() =>
          supabase.rpc("admin_get_question_coverage"),
        );
        if (rpcError) throw rpcError;
        setCoverage(data as Coverage);
      } catch (err) {
        setError(errorMessage(err, "Failed to load coverage."));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
        <AlertCircle className="w-4 h-4" /> {error}
      </div>
    );
  }

  if (!coverage) return null;

  return (
    <div className="space-y-6">
      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {coverage.by_status.map((s) => (
          <div key={s.status} className="bg-white border border-zinc-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-zinc-900">{s.total}</p>
            <p className="text-xs text-zinc-500 mt-1 capitalize">{s.status}</p>
          </div>
        ))}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{coverage.flagged_count}</p>
          <p className="text-xs text-zinc-500 mt-1">Flagged</p>
        </div>
      </div>

      {/* By trainer type */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-800">By trainer type</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs text-zinc-500">
              <th className="text-left px-4 py-2">Trainer</th>
              <th className="text-right px-4 py-2">Total</th>
              <th className="text-right px-4 py-2">Active</th>
              <th className="text-right px-4 py-2">Draft</th>
              <th className="text-right px-4 py-2">Archived</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {coverage.by_trainer_type.map((row) => (
              <tr key={row.trainer_type} className="hover:bg-zinc-50">
                <td className="px-4 py-2 font-mono text-xs text-zinc-700">{row.trainer_type}</td>
                <td className="px-4 py-2 text-right text-zinc-700">{row.total}</td>
                <td className="px-4 py-2 text-right font-medium text-zinc-900">{row.active}</td>
                <td className="px-4 py-2 text-right text-zinc-400">{row.draft}</td>
                <td className="px-4 py-2 text-right text-zinc-300">{row.archived}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* By difficulty and quality side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-800">By difficulty</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs text-zinc-500">
                <th className="text-left px-4 py-2">Difficulty</th>
                <th className="text-right px-4 py-2">Total</th>
                <th className="text-right px-4 py-2">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {coverage.by_difficulty.map((row) => (
                <tr key={row.difficulty} className="hover:bg-zinc-50">
                  <td className="px-4 py-2 capitalize text-zinc-700">{row.difficulty}</td>
                  <td className="px-4 py-2 text-right text-zinc-700">{row.total}</td>
                  <td className="px-4 py-2 text-right font-medium text-zinc-900">{row.active}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-800">By quality status</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs text-zinc-500">
                <th className="text-left px-4 py-2">Quality</th>
                <th className="text-right px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {coverage.by_quality_status.map((row) => (
                <tr key={row.quality_status} className="hover:bg-zinc-50">
                  <td className="px-4 py-2 text-zinc-700">{row.quality_status.replace("_", " ")}</td>
                  <td className="px-4 py-2 text-right text-zinc-700">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
