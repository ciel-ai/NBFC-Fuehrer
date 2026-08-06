import React from 'react';
import { ViewStyle } from 'react-native';
import { StatusAnimation } from '@/src/shared/components/common/StatusAnimation';

interface SuccessAnimationProps {
  size?: number;
  onAnimationComplete?: () => void;
  loop?: boolean;
  speed?: number;
  style?: ViewStyle;
}

export function SuccessAnimation(props: SuccessAnimationProps) {
  return <StatusAnimation name="success" accessibilityLabel="Success" {...props} />;
}

export default SuccessAnimation;
