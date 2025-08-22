// app/_providers.tsx
import { UserProvider } from '@/contexts/UserContext';
import React from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
    return <UserProvider>{children}</UserProvider>;
}
