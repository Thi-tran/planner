'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Project, ProjectRequest } from '@/lib/types';
import { getProjects, createProject, updateProject, deleteProject, updateProjectAccess } from '@/lib/api';
import { setActiveProject, clearActiveProject } from '@/lib/projectContext';
import Sidebar from '@/components/layout/Sidebar';
import ProjectCard from '@/components/projects/ProjectCard';
import CreateProjectCard from '@/components/projects/CreateProjectCard';
import CreateProjectModal from '@/components/projects/CreateProjectModal';
import EditProjectModal from '@/components/projects/EditProjectModal';
import { ProjectStatus } from '@/components/projects/StatusDropdown';

export default function MyProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');

  const fetchProjects = useCallback(async () => {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('401')) {
        router.replace('/signin');
        return;
      }
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async (data: ProjectRequest) => {
    await createProject(data);
    await fetchProjects();
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
  };

  const handleUpdateProject = async (id: string, data: ProjectRequest) => {
    await updateProject(id, data);
    await fetchProjects();
    setEditingProject(null);
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    // Clear active project if the deleted project was active
    clearActiveProject();
    await fetchProjects();
    setEditingProject(null);
  };

  const handleProjectClick = async (projectId: string) => {
    try {
      // Find project to store in context
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        setActiveProject({
          id: project.id,
          name: project.name,
          color: project.color,
        });
      }
      
      // Update access time (non-blocking)
      updateProjectAccess(projectId).catch(() => {});
      
      // Navigate to calendar with project start date
      const startDate = project?.startDate || new Date().toISOString().split('T')[0];
      router.push(`/calendar?projectId=${projectId}&startDate=${startDate}`);
    } catch (err) {
      console.error('Navigation error:', err);
    }
  };

  // Filter projects by status
  const filteredProjects = useMemo(() => {
    if (statusFilter === 'all') return projects;
    return projects.filter(p => p.status === statusFilter);
  }, [projects, statusFilter]);

  const getStatusCounts = () => {
    return {
      'in progress': projects.filter((p) => p.status === 'in progress').length,
      completed: projects.filter((p) => p.status === 'completed').length,
      'on hold': projects.filter((p) => p.status === 'on hold').length,
      planning: projects.filter((p) => p.status === 'planning').length,
    };
  };

  const statusCounts = getStatusCounts();

  if (isLoading) {
    return (
      <Container>
        <LoadingSpinner>Loading projects...</LoadingSpinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorBanner>
          <ErrorText>{error}</ErrorText>
          <RetryButton onClick={fetchProjects}>Retry</RetryButton>
        </ErrorBanner>
      </Container>
    );
  }

  return (
    <LayoutContainer>
      <Sidebar />
      <Container>
      <Header>
        <Title>My projects</Title>
        <FilterContainer>
          <FilterLabel>Status:</FilterLabel>
          <FilterSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | ProjectStatus)}
          >
            <option value="all">All</option>
            <option value="in progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on hold">On Hold</option>
            <option value="planning">Planning</option>
          </FilterSelect>
        </FilterContainer>
      </Header>

      <MetricsRow>
        <MetricCard>
          <MetricValue>{projects.length}</MetricValue>
          <MetricLabel>Total projects</MetricLabel>
        </MetricCard>
        <MetricCard>
          <MetricValue>{statusCounts['in progress']}</MetricValue>
          <MetricLabel>In progress</MetricLabel>
        </MetricCard>
        <MetricCard>
          <MetricValue>{statusCounts.completed}</MetricValue>
          <MetricLabel>Completed</MetricLabel>
        </MetricCard>
        <MetricCard>
          <MetricValue>{statusCounts['on hold']}</MetricValue>
          <MetricLabel>On hold</MetricLabel>
        </MetricCard>
        <MetricCard>
          <MetricValue>{statusCounts.planning}</MetricValue>
          <MetricLabel>Planning</MetricLabel>
        </MetricCard>
      </MetricsRow>

      <ProjectsGrid>
        <CreateProjectCard onClick={() => setShowCreateModal(true)} />
        {filteredProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => handleProjectClick(project.id)}
            onEdit={handleEditProject}
          />
        ))}
      </ProjectsGrid>

      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateProject={handleCreateProject}
      />

      <EditProjectModal
        open={!!editingProject}
        project={editingProject}
        onClose={() => setEditingProject(null)}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
      />
    </Container>
    </LayoutContainer>
  );
}

const LayoutContainer = styled.div`
  display: flex;
  height: 100vh;
  overflow: hidden;
`;

const Container = styled.div`
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  overflow-y: auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px;
  font-weight: 700;
  margin: 0;
`;

const FilterContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FilterLabel = styled.span`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #6b7280;
`;

const FilterSelect = styled.select`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  padding: 8px 32px 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  outline: none;
  background: white;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;

  &:focus {
    border-color: #5EC4CD;
    box-shadow: 0 0 0 3px rgba(94, 196, 205, 0.1);
  }
`;

const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
`;

const MetricCard = styled.div`
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
`;

const MetricValue = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
`;

const MetricLabel = styled.div`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
`;

const ProjectsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;

  @media (min-width: 1024px) {
    > * {
      grid-column: span 4;
    }
  }

  @media (min-width: 768px) and (max-width: 1023px) {
    > * {
      grid-column: span 6;
    }
  }

  @media (max-width: 767px) {
    > * {
      grid-column: span 12;
    }
  }
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 64px 24px;
  font-family: 'DM Sans', sans-serif;
  font-size: 16px;
  color: #6b7280;
`;

const ErrorBanner = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ErrorText = styled.span`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #991b1b;
`;

const RetryButton = styled.button`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  padding: 8px 16px;
  border: 1px solid #991b1b;
  border-radius: 4px;
  background: white;
  color: #991b1b;
  cursor: pointer;

  &:hover {
    background: #fef2f2;
  }
`;
