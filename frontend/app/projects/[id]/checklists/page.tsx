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
