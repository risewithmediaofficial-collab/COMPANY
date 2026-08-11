import api from '../api';

export const TASK_CATEGORY_OPTIONS = [
  { value: 'content', label: 'Content Task' },
  { value: 'non_content', label: 'Non-Content Task' },
];

export const CONTENT_MEDIA_TYPE_OPTIONS = [
  { value: 'videos', label: 'Videos' },
  { value: 'posts', label: 'Posts' },
  { value: 'captions', label: 'Captions' },
  { value: 'designs', label: 'Designs' },
  { value: 'blogs', label: 'Blogs' },
  { value: 'custom', label: 'Custom' },
];

export const VIDEO_TYPE_OPTIONS = [
  { value: 'shorts', label: 'Shorts' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'reels', label: 'Reels' },
  { value: 'long_video', label: 'Long Video' },
  { value: 'custom', label: 'Custom' },
];

export const POSTING_PLATFORM_OPTIONS = [
  { value: 'Instagram', label: '📸 Instagram Reels / Post' },
  { value: 'YouTube Shorts', label: '▶️ YouTube Shorts / Video' },
  { value: 'Facebook', label: '📘 Facebook Watch / Post' },
  { value: 'LinkedIn', label: '💼 LinkedIn' },
  { value: 'X', label: '🐦 X (Twitter)' },
  { value: 'Moj/Josh/TikTok', label: '🎵 Moj / Josh / TikTok' },
];

export const CONTENT_TASK_TYPE_OPTIONS = [
  { value: 'reel', label: 'Reel' },
  { value: 'poster', label: 'Poster' },
  { value: 'social_media_post', label: 'Social Media Post' },
  { value: 'blog', label: 'Blog' },
  { value: 'ad_creative', label: 'Ad Creative' },
  { value: 'video_content', label: 'Video Content' },
  { value: 'story', label: 'Story' },
  { value: 'carousel_post', label: 'Carousel Post' },
  { value: 'custom_content', label: 'Custom Content' },
];

export const NON_CONTENT_TASK_TYPE_OPTIONS = [
  { value: 'website_development', label: 'Website Development' },
  { value: 'website_update', label: 'Website Update' },
  { value: 'landing_page', label: 'Landing Page' },
  { value: 'seo_work', label: 'SEO Work' },
  { value: 'domain_hosting', label: 'Domain / Hosting' },
  { value: 'crm_update', label: 'CRM Update' },
  { value: 'client_support', label: 'Client Support' },
  { value: 'lead_management', label: 'Lead Management' },
  { value: 'ads_setup', label: 'Ads Setup' },
  { value: 'payment_follow_up', label: 'Payment Follow-up' },
  { value: 'report_preparation', label: 'Report Preparation' },
  { value: 'custom_task', label: 'Custom Task' },
];

export const WEBSITE_TYPE_OPTIONS = [
  'Business Website',
  'E-commerce Website',
  'Portfolio Website',
  'Landing Page',
  'Real Estate Website',
  'Custom Website',
];

export const PAGE_OPTIONS = [
  'Home',
  'About',
  'Services',
  'Products',
  'Listings',
  'Contact',
  'Blog',
  'Login',
  'Dashboard',
  'Admin Panel',
  'Custom Pages',
];

export const CONTENT_AVAILABILITY_OPTIONS = [
  { value: 'content_provided', label: 'Content Provided' },
  { value: 'need_content_creation', label: 'Need Content Creation' },
  { value: 'partially_provided', label: 'Partially Provided' },
];

export const BRANDING_AVAILABILITY_OPTIONS = [
  { value: 'logo_available', label: 'Logo Available' },
  { value: 'need_logo', label: 'Need Logo' },
  { value: 'need_branding', label: 'Need Branding' },
];

export const TASK_STATUS_OPTIONS = [
  'To Do',
  'On Process',
  'Waiting for Client',
  'Completed',
  'Rework',
  'Approved',
  'Rework Completed',
  'Review Required',
];

export const TEAM_STATUS_OPTIONS = [
  'To Do',
  'On Process',
  'Completed',
  'Rework',
  'Rework Completed',
];

export const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];

export const CLIENT_RESPONSE_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export const CLIENT_RESPONSE_ELIGIBLE_STATUSES = [
  'Completed',
  'Waiting for Client',
  'Rework Completed',
  'Review Required',
];

export const WEBSITE_TASK_TYPES = ['website_development', 'website_update', 'landing_page'];

export const isWebsiteTaskType = (taskType) => WEBSITE_TASK_TYPES.includes(taskType);

export const formatTaskTypeLabel = (value) => {
  if (!value) return 'Task';
  return value
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const normalizeTaskStatusLabel = (value) => {
  const map = {
    'In Progress': 'On Process',
    'In Review': 'Review Required',
    Done: 'Completed',
    Blocked: 'Rework',
    Rejected: 'Rework',
  };
  return map[value] || value || 'To Do';
};

export const getClientTaskStatusMeta = (status) => {
  const normalized = normalizeTaskStatusLabel(status);
  const meta = {
    'To Do': {
      label: 'Task Received',
      tone: 'info',
      alert: 'Your task has been received and will be started soon.',
    },
    'On Process': {
      label: 'Work in Progress',
      tone: 'progress',
      alert: 'Your task is currently being worked on.',
    },
    'Waiting for Client': {
      label: 'Action Required from You',
      tone: 'warning',
      alert: 'Your input is required to continue this task.',
    },
    Completed: {
      label: 'Completed',
      tone: 'success',
      alert: 'Your task has been completed. Please review.',
    },
    Rework: {
      label: 'Rework in Progress',
      tone: 'warning',
      alert: 'Requested changes are being updated.',
    },
    Approved: {
      label: 'Approved',
      tone: 'success',
      alert: 'Task approved successfully.',
    },
    'Rework Completed': {
      label: 'Review Required',
      tone: 'info',
      alert: 'The requested changes were completed. Please review and confirm.',
    },
    'Review Required': {
      label: 'Review Required',
      tone: 'info',
      alert: 'Please review the latest delivery and confirm whether it meets your needs.',
    },
  };

  return meta[normalized] || {
    label: normalized,
    tone: 'info',
    alert: 'Task status has been updated.',
  };
};

export const canClientRespondToTask = (task) => {
  const status = normalizeTaskStatusLabel(task?.status);
  return Boolean(
    task?.approvalRequired
    && CLIENT_RESPONSE_ELIGIBLE_STATUSES.includes(status)
    && (task?.clientResponse || 'pending') === 'pending',
  );
};

export const uploadFiles = async (files) => {
  const list = Array.from(files || []).filter(Boolean);
  if (!list.length) return [];

  const uploaded = await Promise.all(list.map(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return {
      name: response.data.name || file.name,
      url: response.data.url,
      type: response.data.type || file.type,
      size: response.data.size || file.size,
    };
  }));

  return uploaded;
};

export const getTaskCategoryFromType = (taskType) => {
  if (!taskType) return 'content';
  if (NON_CONTENT_TASK_TYPE_OPTIONS.some((opt) => opt.value === taskType)) return 'non_content';
  return 'content';
};
