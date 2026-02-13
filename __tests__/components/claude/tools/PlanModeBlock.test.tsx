import React from 'react';
import { render } from '@testing-library/react-native';
import { PlanModeBlock } from '@/components/claude/tools/PlanModeBlock';

describe('PlanModeBlock', () => {
  it('renders "Entering Plan Mode" for mode=enter', () => {
    const { getByText } = render(<PlanModeBlock mode="enter" />);
    expect(getByText('Entering Plan Mode')).toBeTruthy();
  });

  it('renders "Plan Complete" for mode=exit', () => {
    const { getByText } = render(<PlanModeBlock mode="exit" />);
    expect(getByText('Plan Complete')).toBeTruthy();
  });

  it('has a testID for identification', () => {
    const { getByTestId } = render(<PlanModeBlock mode="enter" />);
    expect(getByTestId('plan-mode-block')).toBeTruthy();
  });

  it('does NOT have toggle controls (no TouchableOpacity)', () => {
    const { toJSON } = render(<PlanModeBlock mode="enter" />);
    const tree = JSON.stringify(toJSON());
    // Should not contain any pressable/touchable elements
    expect(tree).not.toContain('onPress');
  });
});
