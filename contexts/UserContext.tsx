import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
    uid: string;
    name: string;
    mail: string;
    session_id?: string;
    context?: any;
}

interface UserContextType {
    userData: User | null;
    setUserData: (user: User | null) => void;
    logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
    userData: null,
    setUserData: () => { },
    logout: async () => { },
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [userData, setUserData] = useState<User | null>(null);

    useEffect(() => {
        const loadUser = async () => {
            const savedUser = await AsyncStorage.getItem('user');
            if (savedUser) {
                setUserData(JSON.parse(savedUser));
            }
        };
        loadUser();
    }, []);

    const logout = async () => {
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('lastSession');
        setUserData(null);
    };

    return (
        <UserContext.Provider value={{ userData, setUserData, logout }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
