"use server";

import { revalidatePath } from "next/cache";
import { gateForAction } from "@/lib/pipeline/access";
import { isUuid, sbRpc, userMessage } from "@/lib/pipeline/supabase";
import { ASSET_TYPES, type ActionResult, type FormState } from "@/lib/pipeline/types";

// The assets library (reusable Looms, resumes, portfolio links) and attaching an asset to a requirement.
// Each action re-checks that the caller is a tracker person.

const refresh = () => revalidatePath("/pipeline", "layout");

function f(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function checkAsset(fd: FormData): { type: string; title: string; url: string; notes: string } | { error: string } {
  const type = f(fd, "type");
  const title = f(fd, "title");
  const url = f(fd, "url");
  const notes = f(fd, "notes");
  if (!(ASSET_TYPES as readonly string[]).includes(type)) return { error: "Pick what kind of asset it is." };
  if (!title) return { error: "Give it a title." };
  if (title.length > 200) return { error: "The title is too long." };
  if (url && !/^https?:\/\/\S+$/i.test(url)) return { error: "The link must start with http:// or https://" };
  if (url.length > 2000) return { error: "The link is too long." };
  if (notes.length > 2000) return { error: "The notes are too long." };
  return { type, title, url, notes };
}

export async function createAsset(_prev: FormState, fd: FormData): Promise<FormState> {
  const g = await gateForAction();
  if ("error" in g) return { ok: false, error: g.error };
  const a = checkAsset(fd);
  if ("error" in a) return { ok: false, error: a.error };
  try {
    await sbRpc("create_asset", {
      p_person_id: g.viewer.personId,
      p_type: a.type,
      p_title: a.title,
      p_url: a.url || null,
      p_notes: a.notes || null,
    });
  } catch (e) {
    return { ok: false, error: userMessage(e) };
  }
  refresh();
  return { ok: true, message: "Added." };
}

export async function updateAsset(_prev: FormState, fd: FormData): Promise<FormState> {
  const g = await gateForAction();
  if ("error" in g) return { ok: false, error: g.error };
  const id = f(fd, "id");
  if (!isUuid(id)) return { ok: false, error: "Unknown asset." };
  const a = checkAsset(fd);
  if ("error" in a) return { ok: false, error: a.error };
  try {
    await sbRpc("update_asset", {
      p_id: id,
      p_patch: { type: a.type, title: a.title, url: a.url || null, notes: a.notes || null },
    });
  } catch (e) {
    return { ok: false, error: userMessage(e) };
  }
  refresh();
  return { ok: true, message: "Saved." };
}

export async function deleteAsset(id: string): Promise<ActionResult> {
  const g = await gateForAction();
  if ("error" in g) return { ok: false, error: g.error };
  if (!isUuid(id)) return { ok: false, error: "Unknown asset." };
  try {
    await sbRpc("delete_asset", { p_id: id });
  } catch (e) {
    return { ok: false, error: userMessage(e) };
  }
  refresh();
  return { ok: true };
}

export async function attachAsset(requirementId: string, assetId: string): Promise<ActionResult> {
  const g = await gateForAction();
  if ("error" in g) return { ok: false, error: g.error };
  if (!isUuid(requirementId) || !isUuid(assetId)) return { ok: false, error: "Unknown requirement or asset." };
  try {
    await sbRpc("attach_asset_to_requirement", { p_requirement: requirementId, p_asset: assetId, p_actor: g.viewer.actor });
  } catch (e) {
    return { ok: false, error: userMessage(e) };
  }
  refresh();
  return { ok: true };
}

export async function detachAsset(requirementId: string, assetId: string): Promise<ActionResult> {
  const g = await gateForAction();
  if ("error" in g) return { ok: false, error: g.error };
  if (!isUuid(requirementId) || !isUuid(assetId)) return { ok: false, error: "Unknown requirement or asset." };
  try {
    await sbRpc("detach_asset_from_requirement", { p_requirement: requirementId, p_asset: assetId });
  } catch (e) {
    return { ok: false, error: userMessage(e) };
  }
  refresh();
  return { ok: true };
}
