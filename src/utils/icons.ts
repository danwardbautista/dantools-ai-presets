import React from 'react';
import { FaServer, FaDesktop, FaCubes, FaCode, FaShieldAlt, FaRocket } from 'react-icons/fa';

export const getIconComponent = (iconKey: string): React.ReactNode => {
  const iconMap: Record<string, React.ReactNode> = {
    server: React.createElement(FaServer),
    desktop: React.createElement(FaDesktop),
    cubes: React.createElement(FaCubes),
    code: React.createElement(FaCode),
    shield: React.createElement(FaShieldAlt),
    rocket: React.createElement(FaRocket),
  };
  return iconMap[iconKey] || React.createElement(FaCode);
};

export const iconOptions = [
  { value: 'server', label: 'Server', icon: React.createElement(FaServer) },
  { value: 'desktop', label: 'Desktop', icon: React.createElement(FaDesktop) },
  { value: 'cubes', label: 'Components', icon: React.createElement(FaCubes) },
  { value: 'code', label: 'Code', icon: React.createElement(FaCode) },
  { value: 'shield', label: 'Security', icon: React.createElement(FaShieldAlt) },
  { value: 'rocket', label: 'Performance', icon: React.createElement(FaRocket) },
];