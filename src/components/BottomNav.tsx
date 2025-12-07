import React, { useState } from 'react';
import { Home, Award, Play, History, User } from 'lucide-react';

interface BottomNavProps {
    onNavigate?: (screen: string) => void;
    currentScreen?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onNavigate, currentScreen = 'home' }) => {
    const [activeTab, setActiveTab] = useState(currentScreen);

    const handleNavClick = (screen: string) => {
        setActiveTab(screen);
        if (onNavigate) {
            onNavigate(screen);
        }
    };

    const navItems = [
        { id: 'home', label: 'Início', icon: Home },
        { id: 'challenges', label: 'Desafios', icon: Award },
        { id: 'record', label: 'Gravar', icon: Play, isCentral: true },
        { id: 'activities', label: 'Atividades', icon: History },
        { id: 'account', label: 'Conta', icon: User },
    ];

    return (
        <div className="fixed bottom-6 left-4 right-4 z-50 flex justify-center pointer-events-none">
            <div className="relative flex items-center justify-between p-[0.3rem] bg-[#282828]/65 backdrop-blur-md rounded-2xl shadow-lg w-full max-w-md pointer-events-auto border border-white/5">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    if (item.isCentral) {
                        return (
                            <div key={item.id} className="flex-1 flex justify-center items-center">
                                <button
                                    onClick={() => handleNavClick(item.id)}
                                    className="w-14 h-14 rounded-full bg-[#D3E156] flex items-center justify-center shadow-lg transition-transform active:scale-95"
                                    aria-label={item.label}
                                >
                                    <Icon
                                        size={28}
                                        fill="#161B22"
                                        className="text-[#161B22] translate-x-[2px]"
                                    />
                                </button>
                            </div>
                        );
                    }

                    return (
                        <button
                            key={item.id}
                            onClick={() => handleNavClick(item.id)}
                            className={`flex-1 flex flex-col items-center justify-center py-2 space-y-1 transition-colors duration-200 group ${isActive ? 'text-[#D3E156]' : 'text-[#EBE8E0]/70 hover:text-[#EBE8E0]'
                                }`}
                        >
                            <Icon
                                size={20}
                                strokeWidth={isActive ? 2.5 : 2}
                                className={`transition-all duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                            />
                            <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-[#EBE8E0]' : 'text-[#EBE8E0]/60'}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
