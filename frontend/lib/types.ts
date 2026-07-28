export type CalendarView = 'day' | 'week' | 'month';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO 8601 UTC
  endTime: string;   // ISO 8601 UTC
  categoryId?: string;
  resolvedColor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  categoryId?: string;
  projectId: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface CategoryRequest {
  name: string;
  color: string;
}

export type Role = 'OWNER' | 'EDITOR' | 'VIEWER';
export type MembershipStatus = 'ACTIVE' | 'PENDING';

export interface MembershipResponse {
  id: string;
  userId: string | null;
  email: string;
  displayName: string | null;
  role: Role;
  status: MembershipStatus;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate: string; // ISO date string
  endDate?: string;
  color: 'Sky Cyan' | 'Blush Pink' | 'Soft Indigo' | 'Sage Green';
  status: 'in progress' | 'completed' | 'on hold' | 'planning';
  lastAccessedAt?: string;
  createdAt: string;
  updatedAt: string;
  role?: Role;
}

export interface ProjectRequest {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  color: string;
  status?: string;
}

// Checklist types
export interface UserSummary {
  id: string;
  displayName: string;
  email: string;
  pictureUrl: string | null;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  user: UserSummary;
  commentText: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistTask {
  id: string;
  checklistId: string;
  description: string;
  assignedTo: string | null;
  assignedToUser: UserSummary | null;
  deadline: string | null;
  status: 'todo' | 'done';
  displayOrder: number;
  comments: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

export interface Checklist {
  id: string;
  projectId: string;
  name: string;
  description: string;
  color: string;
  tasks: ChecklistTask[];
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistSummary {
  totalChecklists: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

export interface ProjectProgress {
  totalTasks: number;
  completedTasks: number;
  percentage: number;
  tasksLeft: number;
}
