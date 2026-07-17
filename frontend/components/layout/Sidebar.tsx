'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import styled from 'styled-components';
import { useRouter, usePathname } from 'next/navigation';
import { Project } from '@/lib/types';
import { getProjects, updateProjectAccess } from '@/lib/api';
import { setActiveProject } from '@/lib/projectContext';
import { PROJECT_COLORS } from '@/lib/constants';

interface SidebarProps {
  activeProjectId?: string | null;
}

export default function Sidebar({ activeProjectId }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(activeProjectId || null);

  useEffect(() => {
    fetchRecentProjects();
  }, []);

  useEffect(() => {
    // Auto-expand project when on calendar page
    if (activeProjectId && pathname === '/calendar') {
      startTransition(() => setExpandedProjectId(activeProjectId));
    }
  }, [activeProjectId, pathname]);

  async function fetchRecentProjects() {
    try {
      const projects = await getProjects();
      // Sort by lastAccessedAt (most recent first) and take top 5
      const sorted = [...projects].sort((a, b) => {
        if (!a.lastAccessedAt && !b.lastAccessedAt) return 0;
        if (!a.lastAccessedAt) return 1;
        if (!b.lastAccessedAt) return -1;
        return new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime();
      });
      setRecentProjects(sorted.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleProjectClick = useCallback(
    (project: Project) => {
      // Toggle expand/collapse
      if (expandedProjectId === project.id) {
        setExpandedProjectId(null);
      } else {
        setExpandedProjectId(project.id);
      }
    },
    [expandedProjectId]
  );

  const handlePlanningClick = useCallback(
    async (project: Project) => {
      // Debounced access update - don't await to avoid blocking navigation
      updateProjectAccess(project.id).catch(() => {});
      
      // Store active project in localStorage
      setActiveProject({
        id: project.id,
        name: project.name,
        color: project.color,
      });

      // Navigate to calendar with project context and start date
      router.push(`/calendar?projectId=${project.id}&startDate=${project.startDate}`);
      
      // Refresh recent projects after a short delay
      setTimeout(fetchRecentProjects, 300);
    },
    [router]
  );

  const isCalendarActive = pathname === '/calendar';
  const isProjectsActive = pathname === '/projects';

  return (
    <SidebarRoot>
      <LogoSection>
        <Logo onClick={() => router.push('/projects')}>Planning Reminder</Logo>
      </LogoSection>

      <Nav>
        <NavSection>
          <NavItem 
            $active={isProjectsActive}
            onClick={() => router.push('/projects')}
          >
            <NavIcon>📁</NavIcon>
            <NavLabel>My Projects</NavLabel>
          </NavItem>
        </NavSection>

        {recentProjects.length > 0 && (
          <NavSection>
            {recentProjects.map((project) => {
              const isExpanded = expandedProjectId === project.id;
              const isPlanningActive = activeProjectId === project.id && isCalendarActive;
              const colorHex = PROJECT_COLORS.find((c) => c.name === project.color)?.hex || '#5EC4CD';
              
              return (
                <div key={project.id}>
                  <ProjectItem
                    $active={isExpanded}
                    onClick={() => handleProjectClick(project)}
                  >
                    <ProjectDot $color={colorHex} />
                    <ProjectName>{truncate(project.name, 30)}</ProjectName>
                    <ExpandIcon $expanded={isExpanded}>›</ExpandIcon>
                  </ProjectItem>
                  
                  {isExpanded && (
                    <SubMenuItem
                      $active={isPlanningActive}
                      onClick={() => handlePlanningClick(project)}
                    >
                      <NavIcon>📅</NavIcon>
                      <NavLabel>Planning</NavLabel>
                    </SubMenuItem>
                  )}
                </div>
              );
            })}
          </NavSection>
        )}
      </Nav>

      {loading && (
        <LoadingIndicator>
          <Spinner />
        </LoadingIndicator>
      )}
    </SidebarRoot>
  );
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 1) + '…';
}

const SidebarRoot = styled.aside`
  width: 240px;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const LogoSection = styled.div`
  padding: 20px 16px;
  border-bottom: 1px solid #e2e8f0;
`;

const Logo = styled.h1`
  margin: 0;
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #6366f1;
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
`;

const Nav = styled.nav`
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
`;

const NavSection = styled.div`
  margin-bottom: 24px;
  &:last-child {
    margin-bottom: 0;
  }
`;

const NavItem = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border: none;
  background: ${(p) => (p.$active ? '#f0f9ff' : 'transparent')};
  color: ${(p) => (p.$active ? '#0284c7' : '#475569')};
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  text-align: left;

  &:hover {
    background: ${(p) => (p.$active ? '#f0f9ff' : '#f1f5f9')};
  }
`;

const NavIcon = styled.span`
  font-size: 16px;
  line-height: 1;
`;

const NavLabel = styled.span`
  flex: 1;
`;

const ProjectItem = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border: none;
  background: ${(p) => (p.$active ? '#f0f9ff' : 'transparent')};
  color: ${(p) => (p.$active ? '#0284c7' : '#475569')};
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  text-align: left;

  &:hover {
    background: ${(p) => (p.$active ? '#f0f9ff' : '#f1f5f9')};
  }
`;

const ProjectDot = styled.div<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  flex-shrink: 0;
`;

const ProjectName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ExpandIcon = styled.span<{ $expanded: boolean }>`
  font-size: 18px;
  line-height: 1;
  transform: ${(p) => (p.$expanded ? 'rotate(90deg)' : 'rotate(0deg)')};
  transition: transform 0.2s ease;
  color: #94a3b8;
`;

const SubMenuItem = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px 8px 32px;
  border: none;
  background: ${(p) => (p.$active ? '#f0f9ff' : 'transparent')};
  color: ${(p) => (p.$active ? '#0284c7' : '#475569')};
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  text-align: left;

  &:hover {
    background: ${(p) => (p.$active ? '#f0f9ff' : '#f1f5f9')};
  }
`;

const LoadingIndicator = styled.div`
  padding: 16px;
  display: flex;
  justify-content: center;
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid #e2e8f0;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
