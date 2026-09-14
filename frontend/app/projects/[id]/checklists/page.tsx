'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Checklist, ChecklistSummary, ChecklistRequest } from '@/lib/types';
import { getChecklists, getChecklistSummary } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import SummaryMetrics from '@/components/checklists/SummaryMetrics';
import ChecklistCard from '@/components/checklists/ChecklistCard';
import EmptyState from '@/components/checklists/EmptyState';
import CreateChecklistModal from '@/components/checklists/CreateChecklistModal';
import TaskDetailsPanel from '@/components/checklists/TaskDetailsPanel';

interface ChecklistsPageProps {
  params: Promise<{ id: string }>;
}

export default function ChecklistsPage({ params }: ChecklistsPageProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [summary, setSummary] = useState<ChecklistSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChecklistId, setExpandedChecklistId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskChecklistId, setSelectedTaskChecklistId] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => setProjectId(p.id));
  }, [params]);

  useEffect(() => {
    if (!projectId) return;
    
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [checklistsData, summaryData] = await Promise.all([
          getChecklists(projectId),
          getChecklistSummary(projectId)
        ]);
        
        setChecklists(checklistsData);
        setSummary(summaryData);
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message.includes('401')) {
            router.replace('/signin');
            return;
          }
          if (err.message.includes('403')) {
            setError("You don't have permission to view these checklists");
            return;
          }
          if (err.message.includes('404')) {
            setError('Project not found');
            return;
          }
        }
        setError('Failed to load checklists');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, router]);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [checklistsData, summaryData] = await Promise.all([
        getChecklists(projectId),
        getChecklistSummary(projectId)
      ]);
      
      setChecklists(checklistsData);
      setSummary(summaryData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('401')) {
          router.replace('/signin');
          return;
        }
        if (err.message.includes('403')) {
          setError("You don't have permission to view these checklists");
          return;
        }
        if (err.message.includes('404')) {
          setError('Project not found');
          return;
        }
      }
      setError('Failed to load checklists');
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  const handleCreateChecklist = async (data: ChecklistRequest) => {
    if (!projectId) return;

    const response = await fetch(`/api/projects/${projectId}/checklists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create checklist');
    }

    await fetchData();
  };

  const handleTaskClick = (taskId: string, checklistId: string) => {
    setSelectedTaskId(taskId);
    setSelectedTaskChecklistId(checklistId);
  };

  const handlePanelClose = () => {
    setSelectedTaskId(null);
    setSelectedTaskChecklistId(null);
  };

  const handleTaskDeleted = () => {
    setSelectedTaskId(null);
    setSelectedTaskChecklistId(null);
    fetchData();
  };

  const handleTaskUpdated = () => {
    // Don't refetch all data on every save - the panel manages its own state
    // Only update the local checklist state to sync the list row without remounting
    // Full refetch would cause the panel to close/reopen
    
    // For now, just skip the refetch - the panel has the latest data
    // The list row will update when the panel closes
    // fetchData();
  };

  // Get checklist info for the selected task
  const getChecklistInfo = () => {
    if (!selectedTaskChecklistId) return null;
    return checklists.find(c => c.id === selectedTaskChecklistId);
  };

  // Get all tasks in display order for navigation
  const getAllTasksInOrder = () => {
    const checklist = getChecklistInfo();
    if (!checklist) return [];
    return [...checklist.tasks].sort((a, b) => a.displayOrder - b.displayOrder);
  };

  // Navigation handlers
  const handleNavigatePrev = () => {
    const tasks = getAllTasksInOrder();
    const currentIndex = tasks.findIndex(t => t.id === selectedTaskId);
    if (currentIndex > 0) {
      setSelectedTaskId(tasks[currentIndex - 1].id);
    }
  };

  const handleNavigateNext = () => {
    const tasks = getAllTasksInOrder();
    const currentIndex = tasks.findIndex(t => t.id === selectedTaskId);
    if (currentIndex >= 0 && currentIndex < tasks.length - 1) {
      setSelectedTaskId(tasks[currentIndex + 1].id);
    }
  };

  // Check if navigation is possible
  const canNavigate = () => {
    const tasks = getAllTasksInOrder();
    const currentIndex = tasks.findIndex(t => t.id === selectedTaskId);
    return {
      prev: currentIndex > 0,
      next: currentIndex >= 0 && currentIndex < tasks.length - 1
    };
  };

  const checklistInfo = getChecklistInfo();
  const navigation = canNavigate();

  if (loading) {
    return (
      <LayoutContainer>
        <Sidebar activeProjectId={projectId} />
        <Container>
          <LoadingSpinner>Loading checklists...</LoadingSpinner>
        </Container>
      </LayoutContainer>
    );
  }

  if (error) {
    return (
      <LayoutContainer>
        <Sidebar activeProjectId={projectId} />
        <Container>
          <ErrorBanner>
            <ErrorText>{error}</ErrorText>
            <RetryButton onClick={fetchData}>Retry</RetryButton>
          </ErrorBanner>
        </Container>
      </LayoutContainer>
    );
  }

  return (
    <LayoutContainer>
      <Sidebar activeProjectId={projectId} />
      <Container>
        <Header>
          <Title>Checklists</Title>
          <CreateButton onClick={() => setShowCreateModal(true)}>
            + Create checklist
          </CreateButton>
        </Header>

        {summary && <SummaryMetrics summary={summary} />}

        {checklists.length === 0 ? (
          <EmptyState />
        ) : (
          <ChecklistsGrid>
            {checklists.map((checklist) => (
              <ChecklistCard
                key={checklist.id}
                checklist={checklist}
                expanded={expandedChecklistId === checklist.id}
                onToggle={() => setExpandedChecklistId(
                  expandedChecklistId === checklist.id ? null : checklist.id
                )}
                onTaskAdded={fetchData}
                onTaskClick={(taskId) => handleTaskClick(taskId, checklist.id)}
                selectedTaskId={selectedTaskId}
              />
            ))}
          </ChecklistsGrid>
        )}

        <CreateChecklistModal
          projectId={projectId || ''}
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateChecklist={handleCreateChecklist}
        />

        {selectedTaskId && checklistInfo && projectId && (
          <TaskDetailsPanel
            taskId={selectedTaskId}
            checklistId={checklistInfo.id}
            checklistName={checklistInfo.name}
            checklistColor={checklistInfo.color}
            projectId={projectId}
            onClose={handlePanelClose}
            onTaskDeleted={handleTaskDeleted}
            onTaskUpdated={handleTaskUpdated}
            onNavigatePrev={handleNavigatePrev}
            onNavigateNext={handleNavigateNext}
            canNavigatePrev={navigation.prev}
            canNavigateNext={navigation.next}
          />
        )}
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

const ChecklistsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 32px;
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

const CreateButton = styled.button`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background: #5EC4CD;
  color: white;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: #4da9b8;
  }
`;
