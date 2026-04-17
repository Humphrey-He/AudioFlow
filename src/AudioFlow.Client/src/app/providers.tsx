import type { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // i18n provider is initialized in i18n/index.ts
  // This file is for additional providers if needed
  return <>{children}</>;
}
