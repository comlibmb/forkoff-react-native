import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TaskIndicator } from '@/components/claude/TaskIndicator';
import { TaskInfo } from '@/services/websocket.service';

const makeTasks = (statuses: TaskInfo['status'][]): TaskInfo[] =>
  statuses.map((status, i) => ({
    id: `task-${i}`,
    subject: `Task ${i}`,
    status,
  }));

describe('TaskIndicator', () => {
  it('renders without crashing when no tasks', () => {
    const onPress = jest.fn();
    const { toJSON } = render(<TaskIndicator tasks={[]} onPress={onPress} />);
    expect(toJSON()).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <TaskIndicator tasks={makeTasks(['pending'])} onPress={onPress} />
    );
    // TouchableOpacity renders as a "button" in ARIA
    // Fall back to finding any touchable element
    const tree = render(<TaskIndicator tasks={makeTasks(['pending'])} onPress={onPress} />);
    fireEvent.press(tree.root);
    expect(onPress).toHaveBeenCalled();
  });

  it('shows badge count when tasks exist', () => {
    const tasks = makeTasks(['in_progress', 'pending', 'completed']);
    const { getByText } = render(<TaskIndicator tasks={tasks} onPress={() => {}} />);
    expect(getByText('3')).toBeTruthy();
  });

  it('does not show badge when no tasks', () => {
    const { queryByText } = render(<TaskIndicator tasks={[]} onPress={() => {}} />);
    // No number badge should be present
    expect(queryByText('0')).toBeNull();
    expect(queryByText('1')).toBeNull();
  });

  it('renders for all_completed state', () => {
    const tasks = makeTasks(['completed', 'completed']);
    const { getByText } = render(<TaskIndicator tasks={tasks} onPress={() => {}} />);
    expect(getByText('2')).toBeTruthy();
  });

  it('renders for pending state (tasks exist, none in progress, not all done)', () => {
    const tasks = makeTasks(['pending', 'completed']);
    const { getByText } = render(<TaskIndicator tasks={tasks} onPress={() => {}} />);
    expect(getByText('2')).toBeTruthy();
  });
});
