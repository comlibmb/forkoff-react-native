import React from 'react';
import { render } from '@testing-library/react-native';
import { PlanModeBanner } from '@/components/claude/PlanModeBanner';

describe('PlanModeBanner', () => {
  it('renders "Plan Mode Active" when isActive is true', () => {
    const { getByText } = render(<PlanModeBanner isActive={true} />);
    expect(getByText('Plan Mode Active')).toBeTruthy();
  });

  it('returns null when isActive is false', () => {
    const { toJSON } = render(<PlanModeBanner isActive={false} />);
    expect(toJSON()).toBeNull();
  });

  it('has a testID when visible', () => {
    const { getByTestId } = render(<PlanModeBanner isActive={true} />);
    expect(getByTestId('plan-mode-banner')).toBeTruthy();
  });
});
