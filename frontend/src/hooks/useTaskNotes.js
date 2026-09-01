// =============================================
// TASK NOTES HOOKS - Employee & Manager Task Change Notes & Scratchpads
// =============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { toast } from 'sonner';

// ── Employee / User: fetch own notes ──────────────────────────────────────────
export const useMyNotes = (params = {}, options = {}) =>
  useQuery({
    queryKey: ['task-notes', 'mine', params],
    queryFn: async () => {
      const res = await api.get('/task-notes/mine', { params });
      return res.data.notes || [];
    },
    staleTime: 0,
    refetchOnMount: 'always',
    ...options,
  });

// ── Manager / Admin: fetch all notes ──────────────────────────────────────────
export const useAllNotes = (params = {}, options = {}) => {
  const queryParams = typeof params === 'string' ? { status: params } : params;
  return useQuery({
    queryKey: ['task-notes', 'all', queryParams],
    queryFn: async () => {
      const res = await api.get('/task-notes', { params: queryParams });
      return res.data.notes || [];
    },
    staleTime: 0,
    refetchOnMount: 'always',
    ...options,
  });
};

// ── Create note ───────────────────────────────────────────────────────────────
export const useCreateNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/task-notes', data);
      return res.data.note;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-notes'] });
      toast.success('Note saved successfully!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create note'),
  });
};

// ── Update note ───────────────────────────────────────────────────────────────
export const useUpdateNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/task-notes/${id}`, data);
      return res.data.note;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-notes'] });
      toast.success('Note updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update note'),
  });
};

// ── Toggle Pin ───────────────────────────────────────────────────────────────
export const useToggleNotePin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.patch(`/task-notes/${id}/pin`);
      return res.data.note;
    },
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ['task-notes'] });
      toast.success(note.isPinned ? 'Note pinned to top 📌' : 'Note unpinned');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to pin note'),
  });
};

// ── Toggle Checklist Item ────────────────────────────────────────────────────
export const useToggleNoteChecklist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, itemIndex }) => {
      const res = await api.patch(`/task-notes/${id}/checklist`, { itemIndex });
      return res.data.note;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-notes'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update checklist'),
  });
};

// ── Delete note ───────────────────────────────────────────────────────────────
export const useDeleteNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/task-notes/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-notes'] });
      toast.success('Note deleted');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete note'),
  });
};

// ── Manager: assign note to employee ─────────────────────────────────────────
export const useAssignNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.patch(`/task-notes/${id}/assign`, data);
      return res.data.note;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-notes'] });
      toast.success('Note assigned to employee!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to assign note'),
  });
};

// ── Manager: dismiss / resolve note ──────────────────────────────────────────
export const useDismissNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, managerNote, status = 'dismissed' }) => {
      const res = await api.patch(`/task-notes/${id}/dismiss`, { managerNote, status });
      return res.data.note;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-notes'] });
      toast.success('Note status updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to dismiss note'),
  });
};
