import { createClient } from '@supabase/supabase-js';

const unwrap = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export function createSupabaseStore({ url, serviceRoleKey, bucket }) {
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const files = () => sb.storage.from(bucket);

  return {
    kind: 'supabase',

    async createRoom(room) {
      const { data, error } = await sb.from('rooms').insert(room).select().single();
      if (error?.code === '23505') {
        throw Object.assign(new Error('duplicate slug'), { code: 'DUPLICATE' });
      }
      if (error) throw error;
      return data;
    },

    async getRoomBySlug(slug) {
      return unwrap(await sb.from('rooms').select().eq('slug', slug).maybeSingle());
    },

    async insertMessage(message) {
      return unwrap(await sb.from('messages').insert(message).select().single());
    },

    async listMessages(roomId, { beforeId, limit }) {
      let query = sb
        .from('messages')
        .select()
        .eq('room_id', roomId)
        .order('id', { ascending: false })
        .limit(limit);
      if (beforeId) query = query.lt('id', beforeId);
      return unwrap(await query).reverse();
    },

    async uploadFile({ path, buffer, contentType }) {
      unwrap(await files().upload(path, buffer, { contentType, upsert: false }));
      return files().getPublicUrl(path).data.publicUrl;
    },

    async removeFiles(paths) {
      if (paths.length) unwrap(await files().remove(paths));
    },

    async findExpiredMessages(cutoffIso, limit) {
      return unwrap(
        await sb
          .from('messages')
          .select('id, attachment_path')
          .lt('created_at', cutoffIso)
          .order('id')
          .limit(limit),
      );
    },

    async deleteMessages(ids) {
      if (ids.length) unwrap(await sb.from('messages').delete().in('id', ids));
    },

    // 생성된 지 cutoff 이상 지났고 남은 메시지가 없는 방
    async findInactiveRooms(cutoffIso) {
      const rooms = unwrap(await sb.from('rooms').select('id').lt('created_at', cutoffIso));
      const inactive = [];
      for (const room of rooms) {
        const { count, error } = await sb
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', room.id);
        if (error) throw error;
        if (!count) inactive.push(room.id);
      }
      return inactive;
    },

    async deleteRooms(ids) {
      if (ids.length) unwrap(await sb.from('rooms').delete().in('id', ids));
    },
  };
}
