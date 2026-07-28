'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import styled from 'styled-components';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
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
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
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
      updateProjectAccess(project.id).catch(() => { });
      setActiveProject({
        id: project.id,
        name: project.name,
        color: project.color,
      });
      router.push(`/calendar?projectId=${project.id}&startDate=${project.startDate}`);
      setTimeout(fetchRecentProjects, 300);
    },
    [router]
  );

  const isCalendarActive = pathname === '/calendar';
  const isProjectsActive = pathname === '/projects';

  return (
    <SidebarRoot $collapsed={collapsed}>
      <LogoSection $collapsed={collapsed}>
        {!collapsed && (
          <Logo onClick={() => router.push('/projects')}>Planning Reminder</Logo>
        )}
        <CollapseButton
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          $collapsed={collapsed}
        >
          {collapsed ? '›' : '‹'}
        </CollapseButton>
      </LogoSection>

      <Nav>
        <NavSection>
          <NavItem
            $active={isProjectsActive}
            onClick={() => router.push('/projects')}
            title="My Projects"
          >
            <NavIcon>📁</NavIcon>
            {!collapsed && <NavLabel>My Projects</NavLabel>}
          </NavItem>
        </NavSection>

        {!collapsed && recentProjects.length > 0 && (
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
                    <>
                      <SubMenuItem
                        $active={isPlanningActive}
                        onClick={() => handlePlanningClick(project)}
                      >
                        <NavIcon>📅</NavIcon>
                        <NavLabel>Planning</NavLabel>
                      </SubMenuItem>
                      <SubMenuItem
                        $active={pathname.includes(`/projects/${project.id}/checklists`)}
                        onClick={() => router.push(`/projects/${project.id}/checklists`)}
                      >
                        <NavIcon>✓</NavIcon>
                        <NavLabel>Checklists</NavLabel>
                      </SubMenuItem>
                    </>
                  )}
                </div>
              );
            })}
          </NavSection>
        )}

        {collapsed && recentProjects.map((project) => {
          const colorHex = PROJECT_COLORS.find((c) => c.name === project.color)?.hex || '#5EC4CD';
          return (
            <CollapsedProjectDot
              key={project.id}
              $color={colorHex}
              title={project.name}
              onClick={() => {
                setCollapsed(false);
                setExpandedProjectId(project.id);
              }}
            />
          );
        })}
      </Nav>

      {loading && (
        <LoadingIndicator>
          <Spinner />
        </LoadingIndicator>
      )}

      {session?.user && (
        <UserSection $collapsed={collapsed}>
          {session.user.image ? (
            <UserAvatar title={session.user.name ?? undefined}>
              <Image
                src={session.user.image}
                alt={session.user.name ?? 'User avatar'}
                width={32}
                height={32}
                style={{ borderRadius: '50%' }}
              />
            </UserAvatar>
          ) : (
              <UserAvatarFallback title={session.user.name ?? undefined}>
              {session.user.name?.[0]?.toUpperCase() ?? '?'}
            </UserAvatarFallback>
          )}
          {!collapsed && <UserName>{session.user.name}</UserName>}
        </UserSection>
      )}
    </SidebarRoot>
  );
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 1) + '…';
}

const SidebarRoot = styled.aside<{ $collapsed: boolean }>`
  width: ${(p) => (p.$collapsed ? '56px' : '240px')};
  min-width: ${(p) => (p.$collapsed ? '56px' : '240px')};
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  transition: width 0.2s ease, min-width 0.2s ease;
  overflow: hidden;
`;

const LogoSection = styled.div<{ $collapsed: boolean }>`
  padding: 20px ${(p) => (p.$collapsed ? '12px' : '16px')};
  border-bottom: 1px solid var(--sidebar-border);
  display: flex;
  align-items: center;
  justify-content: ${(p) => (p.$collapsed ? 'center' : 'space-between')};
  min-height: 64px;
`;

const Logo = styled.h1`
  margin: 0;
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    opacity: 0.8;
  }
`;

const CollapseButton = styled.button<{ $collapsed: boolean }>`
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--sidebar-collapse-bg);
  color: var(--text-subtle);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
  margin-left: 15px;

  &:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }
`;

const Nav = styled.nav`
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
  overflow-x: hidden;
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
  background: ${(p) => (p.$active ? 'var(--accent-active-bg)' : 'transparent')};
  color: ${(p) => (p.$active ? 'var(--accent-active-text)' : 'var(--text-muted)')};
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  text-align: left;
  justify-content: center;

  &:hover {
    background: ${(p) => (p.$active ? 'var(--accent-active-bg)' : 'var(--surface-hover)')};
  }
`;

const NavIcon = styled.span`
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
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
  background: ${(p) => (p.$active ? 'var(--accent-active-bg)' : 'transparent')};
  color: ${(p) => (p.$active ? 'var(--accent-active-text)' : 'var(--text-muted)')};
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  text-align: left;

  &:hover {
    background: ${(p) => (p.$active ? 'var(--accent-active-bg)' : 'var(--surface-hover)')};
  }
`;

const ProjectDot = styled.div<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  flex-shrink: 0;
`;

const CollapsedProjectDot = styled.button<{ $color: string }>`
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  border: none;
  margin: 6px auto;
  cursor: pointer;
  padding: 0;
  transition: transform 0.15s;

  &:hover {
    transform: scale(1.3);
  }
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
  color: var(--text-faint);
`;

const SubMenuItem = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px 8px 32px;
  border: none;
  background: ${(p) => (p.$active ? 'var(--accent-active-bg)' : 'transparent')};
  color: ${(p) => (p.$active ? 'var(--accent-active-text)' : 'var(--text-muted)')};
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  text-align: left;

  &:hover {
    background: ${(p) => (p.$active ? 'var(--accent-active-bg)' : 'var(--surface-hover)')};
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
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const UserSection = styled.div<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px ${(p) => (p.$collapsed ? '12px' : '16px')};
  border-top: 1px solid var(--sidebar-border);
  background: var(--sidebar-bg);
  justify-content: ${(p) => (p.$collapsed ? 'center' : 'flex-start')};
`;

const UserAvatar = styled.div`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
`;

const UserAvatarFallback = styled.div`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const UserName = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
