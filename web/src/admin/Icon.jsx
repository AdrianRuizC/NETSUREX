import React from 'react';
import {
  Smartphone, Globe, Puzzle, Brain, Video, MonitorSmartphone, Fingerprint, Cpu, Wrench, HardDrive,
  Network, Lightbulb, Server, Building2, RefreshCw, Search, FileText, Settings, ShieldCheck, Code,
  Rocket, Home, Database, Cloud, Zap, Target,
} from 'lucide-react';

const icons = {
  Smartphone, Globe, Puzzle, Brain, Cctv: Video, Video, MonitorSmartphone, Fingerprint, Cpu, Wrench,
  HardDrive, Network, Lightbulb, Server, Building2, RefreshCw, Search, FileText, Settings, ShieldCheck,
  Code, Rocket, Home, Database, Cloud, Zap, Target,
};

const Icon = ({ name, className = 'w-6 h-6', ...props }) => {
  const Cmp = icons[name] || ShieldCheck;
  return <Cmp className={className} aria-hidden="true" {...props} />;
};

export default Icon;

export const iconNames = Object.keys(icons);
