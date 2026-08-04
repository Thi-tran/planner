import type { CalendarEvent, EventRequest, Category, CategoryRequest, Project, ProjectRequest, MembershipResponse, Role, Checklist, ChecklistSummary, ProjectProgress, ChecklistRequest, TaskRequest, ChecklistTask } from './types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function getEvents(from?: Date, to?: Date, projectId?: string): Promise<CalendarEvent[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from.toISOString());
  if (to) params.set('to', to.toISOString());
  if (projectId) params.set('projectId', projectId);
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<CalendarEvent[]>(`/api/events${query}`);
}

export async function getEvent(id: string): Promise<CalendarEvent> {
  return request<CalendarEvent>(`/api/events/${id}`);
}

export async function createEvent(data: EventRequest): Promise<CalendarEvent> {
  return request<CalendarEvent>('/api/events', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateEvent(id: string, data: EventRequest): Promise<CalendarEvent> {
  return request<CalendarEvent>(`/api/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteEvent(id: string): Promise<void> {
  return request<void>(`/api/events/${id}`, { method: 'DELETE' });
}


export async function getCategories(projectId: string): Promise<Category[]> {
  return request<Category[]>(`/api/categories?projectId=${encodeURIComponent(projectId)}`);
}

export async function createCategory(projectId: string, data: CategoryRequest): Promise<Category> {
  return request<Category>(`/api/categories`, {
    method: 'POST',
    body: JSON.stringify({ ...data, projectId }),
  });
}

export async function updateCategory(id: string, data: CategoryRequest): Promise<Category> {
  return request<Category>(`/api/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...data, projectId: id }),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  return request<void>(`/api/categories/${id}`, { method: 'DELETE' });
}

export async function getProjects(): Promise<Project[]> {
  return request<Project[]>('/api/projects');
}

export async function getProject(id: string): Promise<Project> {
  return request<Project>(`/api/projects/${id}`);
}

export async function createProject(data: ProjectRequest): Promise<Project> {
  return request<Project>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProject(id: string, data: ProjectRequest): Promise<Project> {
  return request<Project>(`/api/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string): Promise<void> {
  return request<void>(`/api/projects/${id}`, { method: 'DELETE' });
}

export async function updateProjectAccess(id: string): Promise<Project> {
  return request<Project>(`/api/projects/${id}/access`, { method: 'PATCH' });
}

export async function getProjectProgress(id: string): Promise<ProjectProgress> {
  return request<ProjectProgress>(`/api/projects/${id}/progress`);
}

export async function getMembers(projectId: string): Promise<MembershipResponse[]> {
  return request<MembershipResponse[]>(`/api/projects/${projectId}/members`);
}

export async function inviteMember(projectId: string, data: { email: string; role: Role }): Promise<MembershipResponse> {
  return request<MembershipResponse>(`/api/projects/${projectId}/members`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMemberRole(projectId: string, membershipId: string, data: { role: Role }): Promise<MembershipResponse> {
  return request<MembershipResponse>(`/api/projects/${projectId}/members/${membershipId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function removeMember(projectId: string, membershipId: string): Promise<void> {
  return request<void>(`/api/projects/${projectId}/members/${membershipId}`, { method: 'DELETE' });
}


// Checklist API functions
export async function getChecklists(projectId: string): Promise<Checklist[]> {
  return request<Checklist[]>(`/api/projects/${projectId}/checklists`);
}

export async function getChecklist(checklistId: string): Promise<Checklist> {
  return request<Checklist>(`/api/checklists/${checklistId}`);
}

export async function getChecklistSummary(projectId: string): Promise<ChecklistSummary> {
  return request<ChecklistSummary>(`/api/projects/${projectId}/checklists/summary`);
}

export async function createChecklist(projectId: string, data: ChecklistRequest): Promise<Checklist> {
  return request<Checklist>(`/api/projects/${projectId}/checklists`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function addTask(checklistId: string, data: TaskRequest): Promise<ChecklistTask> {
  return request<ChecklistTask>(`/api/checklists/${checklistId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
