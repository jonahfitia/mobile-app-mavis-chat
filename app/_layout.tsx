// app/_layout.tsx
import { UserProvider } from '@/contexts/UserContext';
import RootLayout from './_rootLayout';

export default function Layout() {
    return (
        <UserProvider>
            <RootLayout />
        </UserProvider>
    );
}
