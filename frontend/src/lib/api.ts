import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor: attach Firebase ID token ───────────────────────────
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (err) {
    // If token fetch fails, proceed without header (public routes will still work)
    console.warn('Could not attach auth token:', err);
  }
  return config;
});

// ─── Response Interceptor: surface error messages ────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized — token may be expired; force sign-out will be handled by App.tsx listener
      console.warn('API 401: Unauthorized. Token may be expired.');
    }
    return Promise.reject(error);
  }
);

export const donationDrivesApi = {
  getAll: () => api.get('/donation-drives'),
  create: (data: any) => api.post('/donation-drives', data),
  updateStatus: (id: string, status: string) => api.patch(`/donation-drives/${id}/status`, { status }),
};

export const donationsApi = {
  create: (data: { driveId: string; userId: string; userName: string; amount: number; paypalOrderId?: string }) =>
    api.post('/donations', data),
};

export const reportsApi = {
  getAll: () => api.get('/reports'),
  getByUser: (userId: string) => api.get(`/reports/user/${userId}`),
  create: (data: any) => api.post('/reports', data),
  updateStatus: (id: string, data: { status: string; govtNotes?: string; historyTitle?: string }) =>
    api.put(`/reports/${id}`, data),
  getStats: () => api.get('/reports/stats'),
};

export const bloodRequestsApi = {
  getAll: (bloodGroup?: string) => api.get('/blood-requests', { params: bloodGroup ? { bloodGroup } : {} }),
  create: (data: any) => api.post('/blood-requests', data),
};

export const animalCasesApi = {
  getAll: () => api.get('/animal-cases'),
  getByUser: (userId: string) => api.get(`/animal-cases/user/${userId}`),
  create: (data: any) => api.post('/animal-cases', data),
  updateStatus: (id: string, data: { status: string; ngoId?: string; ngoName?: string }) =>
    api.patch(`/animal-cases/${id}/status`, data),
};

export const coursesApi = {
  getAll: () => api.get('/courses'),
  create: (data: any) => api.post('/courses', data),
  addReview: (courseId: string, data: any) => api.post(`/courses/${courseId}/reviews`, data),
};

export const enrollmentsApi = {
  getByUser: (userId: string) => api.get(`/enrollments/${userId}`),
  enroll: (data: { userId: string; courseId: string; userName: string }) => api.post('/enrollments', data),
  updateStatus: (id: string, status: string, score?: number) =>
    api.put(`/enrollments/${id}`, { status, ...(score !== undefined ? { score } : {}) }),
};

export const usersApi = {
  get: (uid: string) => api.get(`/users/${uid}`),
  save: (data: { uid: string; name: string; email: string; roles: string[]; bio?: string; address?: string; bloodGroup?: string; phone?: string }) => api.post('/users', data),
  update: (uid: string, data: { bloodGroup?: string; bio?: string; phone?: string; address?: string; avatarUrl?: string; name?: string }) =>
    api.put(`/users/${uid}`, data),
  blockUnblock: (targetUid: string, action: 'block' | 'unblock') =>
    api.post('/users/block', { targetUid, action }),
  getPhysicalDonations: (userId: string) => api.get(`/physical-donations/${userId}`),
  getVolunteering: (userId: string) => api.get(`/volunteering/${userId}`),
  getMonetaryDonations: (userId: string) => api.get(`/monetary-donations/${userId}`),
};

export const volunteerEventsApi = {
  getAll: (eventType?: string) => api.get('/volunteer-events', { params: eventType ? { eventType } : {} }),
  create: (data: any) => api.post('/volunteer-events', data),
  delete: (id: string) => api.delete(`/volunteer-events/${id}`),
};

export const volunteerApplicationsApi = {
  getByEvent: (eventId: string) => api.get(`/volunteer-applications/${eventId}`),
  getByUser: (userId: string) => api.get(`/volunteer-applications/by-user/${userId}`),
  create: (data: any) => api.post('/volunteer-applications', data),
  updateStatus: (id: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') =>
    api.put(`/volunteer-applications/${id}`, { status }),
};

export const adoptionsApi = {
  getAll: () => api.get('/adoptions'),
  create: (data: any) => api.post('/adoptions', data),
};

export const adoptionApplicationsApi = {
  getByListing: (listingId: string) => api.get(`/adoption-applications/${listingId}`),
  getByUser: (userId: string) => api.get(`/adoption-applications/by-user/${userId}`),
  create: (data: any) => api.post('/adoption-applications', data),
  updateStatus: (id: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') =>
    api.put(`/adoption-applications/${id}`, { status }),
};

export const adminApi = {
  getNgos: () => api.get('/admin/ngos'),
  verifyNgo: (uid: string, isVerified: boolean) => api.put(`/admin/ngos/${uid}/verify`, { isVerified }),
  getAllUsers: () => api.get('/admin/users'),
  assignRole: (uid: string, role: string, action: 'add' | 'remove') =>
    api.put(`/admin/users/${uid}/role`, { role, action }),
  banUser: (uid: string, isBanned: boolean) => api.put(`/admin/users/${uid}/ban`, { isBanned }),
  getStats: () => api.get('/admin/stats'),
};

export const feedbackApi = {
  getAll: () => api.get('/feedback'),
  create: (data: { userId: string; userName?: string; type: string; subject: string; message: string }) =>
    api.post('/feedback', data),
  updateStatus: (id: string, status: string, adminNote?: string) =>
    api.put(`/feedback/${id}`, { status, adminNote }),
};

export const statsApi = {
  volunteer: (userId: string) => api.get(`/stats/volunteer/${userId}`),
  ngo: (ngoId: string) => api.get(`/stats/ngo/${ngoId}`),
  educator: (educatorId: string) => api.get(`/stats/educator/${educatorId}`),
};

export default api;
