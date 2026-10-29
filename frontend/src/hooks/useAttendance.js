import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';

export const useAttendance = (filters = {}) => {
  return useQuery({
    queryKey: ['attendance', filters],
    queryFn: async () => {
      const response = await api.get('/attendance', { params: filters });
      return response.data;
    },
  });
};

export const useTeamTodayAttendance = (options = {}) => {
  return useQuery({
    queryKey: ['team-attendance-today'],
    queryFn: async () => {
      const response = await api.get('/attendance/team/today');
      return response.data.records || [];
    },
    ...options,
  });
};

export const useClockIn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (locationData = {}) => {
      const response = await api.post('/attendance/clock-in', locationData);
      return response.data.attendance;
    },
    onSuccess: (attendance) => {
      // Optimistically insert/update the attendance record in React Query cache
      queryClient.setQueriesData({ queryKey: ['attendance'] }, (old) => {
        if (!old) return old;
        const records = old.records ? [...old.records] : [];
        const idx = records.findIndex((r) => r._id === attendance._id);
        if (idx >= 0) {
          records[idx] = { ...records[idx], ...attendance };
        } else {
          records.unshift(attendance);
        }
        return { ...old, records };
      });

      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['team-attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });

      window.dispatchEvent(new CustomEvent('attendanceStatusChanged', { detail: attendance }));

      const verified = attendance?.locationVerification?.locationVerified || attendance?.locationVerified;
      toast.success(verified ? 'Clocked in with location verified' : 'Clocked in successfully');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Clock in failed'),
  });
};

export const useClockOut = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/attendance/clock-out');
      return response.data.attendance;
    },
    onSuccess: (attendance) => {
      queryClient.setQueriesData({ queryKey: ['attendance'] }, (old) => {
        if (!old || !attendance) return old;
        const records = old.records ? [...old.records] : [];
        const idx = records.findIndex((r) => r._id === attendance._id);
        if (idx >= 0) {
          records[idx] = { ...records[idx], ...attendance };
        }
        return { ...old, records };
      });

      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['team-attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });

      window.dispatchEvent(new CustomEvent('attendanceStatusChanged', { detail: attendance || null }));

      toast.success('Clocked out successfully');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Clock out failed'),
  });
};

export const useSubmitEOD = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/attendance/eod', data);
      return response.data.attendance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['eod-reports'] });
      queryClient.invalidateQueries({ queryKey: ['portal'] });
      toast.success('End of day report submitted');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to submit report'),
  });
};

export const useAssignHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/attendance/holiday', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(data?.message || 'Holiday assigned successfully');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to assign holiday'),
  });
};

export const useSubmitLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/attendance/leave', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['team-attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(data?.message || 'Leave marked successfully');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to submit leave'),
  });
};

export const useSubmitAbsent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/attendance/absent', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['team-attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(data?.message || 'Absent marked successfully');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to mark absent'),
  });
};

export const useSubmitWFH = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/attendance/wfh', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(data?.message || 'Work From Home informed successfully');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to submit WFH notice'),
  });
};

export const useApproveAttendanceRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, rejectionReason }) => {
      const response = await api.put(`/attendance/${id}/approve`, { action, rejectionReason });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['team-attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(data?.message || 'Attendance request updated');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to update attendance request'),
  });
};
