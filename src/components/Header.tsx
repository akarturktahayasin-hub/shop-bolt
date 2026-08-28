import { ReactNode } from 'react';
import Logo from '@/components/Logo';

interface HeaderProps {
  right?: ReactNode;
}

export default function Header({ right }: HeaderProps) {
  return (
    <header className="w-full">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 flex items-center justify-between">
        <Logo size="md" />
        {right}
      </div>
    </header>
  );
}
