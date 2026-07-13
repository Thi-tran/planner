'use client';

import styled from 'styled-components';
import { PROJECT_COLORS } from '@/lib/constants';

interface ColorSelectorProps {
  selectedColor: string;
  onSelectColor: (colorName: string) => void;
  disabled?: boolean;
}

export default function ColorSelector({ selectedColor, onSelectColor, disabled }: ColorSelectorProps) {
  return (
    <Container>
      <ColorSwatches role="radiogroup" aria-label="Project color">
        {PROJECT_COLORS.map((c) => (
          <ColorSwatch
            key={c.name}
            type="button"
            $color={c.hex}
            $selected={selectedColor === c.name}
            onClick={() => onSelectColor(c.name)}
            disabled={disabled}
            aria-label={`Select ${c.name}`}
            aria-checked={selectedColor === c.name}
            role="radio"
            title={c.name}
          />
        ))}
      </ColorSwatches>
      <ColorHint>Used to identify the project across the app</ColorHint>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ColorSwatches = styled.div`
  display: flex;
  gap: 12px;
`;

const ColorSwatch = styled.button<{ $color: string; $selected: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${(props) => props.$color};
  border: 3px solid ${(props) => (props.$selected ? '#374151' : 'transparent')};
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;

  &:hover:not(:disabled) {
    transform: scale(1.1);
  }

  &:focus {
    outline: 2px solid #5EC4CD;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ColorHint = styled.p`
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
`;
