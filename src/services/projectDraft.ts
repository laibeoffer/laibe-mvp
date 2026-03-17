import { supabase } from '@/lib/supabase';
import { getDeviceId } from '@/utils/device';

export interface ProjectDraft {
  id: string;
  device_id: string;
  user_id?: string;
  entry_type?: string;
  status: 'draft' | 'claimed';
  conversation_summary?: string;
  requirements_json?: any;
  updated_at?: string;
}

export interface UpdateDraftPayload {
  conversation_summary?: string;
  requirements_json?: any;
}

/**
 * Creates an anonymous project draft in the Supabase `project_drafts` table.
 *
 * @param deviceId The unique device ID generated from the frontend
 * @param entryType (Optional) The entry point or type of this draft
 * @returns The newly created draft containing at least `id` and `device_id`
 */
export async function createAnonymousDraft(
  deviceId: string,
  entryType?: string
): Promise<{ id: string; device_id: string } | null> {
  try {
    const payload: Partial<ProjectDraft> = {
      device_id: deviceId,
      status: 'draft',
    };

    if (entryType) {
      payload.entry_type = entryType;
    }

    const { data, error } = await supabase
      .from('project_drafts')
      .insert([payload])
      .select('id, device_id')
      .single();

    if (error) {
      console.error('Supabase error creating anonymous draft:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Exception in createAnonymousDraft:', error);
    throw error;
  }
}

/**
 * Gets the latest existing anonymous project draft for the current device,
 * or creates a new one if none exists.
 *
 * @param entryType (Optional) The entry point or type of this draft
 * @returns The existing or newly created draft containing at least `id` and `device_id`
 */
export async function getOrCreateAnonymousDraft(
  entryType?: string
): Promise<{ id: string; device_id: string } | null> {
  try {
    const deviceId = getDeviceId();

    if (!deviceId) {
      console.warn('Cannot get or create draft: device_id is missing.');
      return null;
    }

    const { data: existingDraft, error: fetchError } = await supabase
      .from('project_drafts')
      .select('id, device_id')
      .eq('device_id', deviceId)
      .eq('status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Supabase error fetching anonymous draft:', fetchError);
      throw fetchError;
    }

    if (existingDraft) {
      return existingDraft;
    }

    return await createAnonymousDraft(deviceId, entryType);
  } catch (error) {
    console.error('Exception in getOrCreateAnonymousDraft:', error);
    throw error;
  }
}

/**
 * Updates the current anonymous project draft with new values.
 *
 * @param payload The fields to update on the draft
 * @returns The updated draft data
 */
export async function updateAnonymousDraft(
  payload: UpdateDraftPayload
): Promise<ProjectDraft | null> {
  try {
    const draft = await getOrCreateAnonymousDraft();

    if (!draft || !draft.id) {
      console.warn('Cannot update draft: Could not get or create a valid draft instance.');
      return null;
    }

    const updateData: Partial<ProjectDraft> = {
      ...payload,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedDraft, error: updateError } = await supabase
      .from('project_drafts')
      .update(updateData)
      .eq('id', draft.id)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase error updating anonymous draft:', updateError);
      throw updateError;
    }

    return updatedDraft;
  } catch (error) {
    console.error('Exception in updateAnonymousDraft:', error);
    throw error;
  }
}

/**
 * Associates an existing anonymous draft with a logged-in user.
 * Looks for the most recent anonymous draft for the current device and updates it.
 *
 * @param userId The ID of the authenticated user claiming the draft
 * @returns The claimed draft data, or null if no anonymous draft was found
 */
export async function claimAnonymousDraftForUser(
  userId: string
): Promise<ProjectDraft | null> {
  try {
    const deviceId = getDeviceId();

    if (!deviceId) {
      console.warn('Cannot claim draft: device_id is missing.');
      return null;
    }

    if (!userId) {
      console.warn('Cannot claim draft: userId is missing or invalid.');
      return null;
    }

    const { data: existingDraft, error: fetchError } = await supabase
      .from('project_drafts')
      .select('id')
      .eq('device_id', deviceId)
      .eq('status', 'draft')
      .is('user_id', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Supabase error fetching anonymous draft for claim:', fetchError);
      throw fetchError;
    }

    if (!existingDraft) {
      return null;
    }

    const updateData: Partial<ProjectDraft> = {
      user_id: userId,
      status: 'claimed',
      updated_at: new Date().toISOString(),
    };

    const { data: claimedDraft, error: updateError } = await supabase
      .from('project_drafts')
      .update(updateData)
      .eq('id', existingDraft.id)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase error claiming anonymous draft:', updateError);
      throw updateError;
    }

    return claimedDraft;
  } catch (error) {
    console.error('Exception in claimAnonymousDraftForUser:', error);
    throw error;
  }
}