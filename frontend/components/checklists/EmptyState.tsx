import styled from 'styled-components';

export default function EmptyState() {
  return (
    <Container>
      <Icon>✓</Icon>
      <Title>No checklists yet</Title>
      <Subtitle>Checklists will appear here once created</Subtitle>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
`;

const Icon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.3;
`;

const Title = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #6b7280;
  margin: 0;
`;
