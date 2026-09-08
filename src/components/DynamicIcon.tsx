import React from 'react';
import * as Icons from 'lucide-react';

interface DynamicIconProps {
  name: string;
  className?: string;
  size?: number;
}

const DynamicIconComponent: React.FC<DynamicIconProps> = ({ name, className = '', size = 20 }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (Icons as any)[name] || Icons.Sparkles;
  return <IconComponent size={size} className={className} />;
};

export const DynamicIcon = React.memo(DynamicIconComponent);
