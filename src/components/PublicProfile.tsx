import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Share2, MapPin, Award, User as UserIcon } from 'lucide-react';
import { db } from '../firebase';

interface PublicUserData {
    displayName: string;
    photoURL: string;
    username: string;
    bio?: string; // Future proofing
}

export const PublicProfile: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const [userData, setUserData] = useState<PublicUserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            if (!username) return;
            setLoading(true);
            try {
                const q = query(collection(db, 'users'), where('username', '==', username));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    const doc = snapshot.docs[0];
                    setUserData(doc.data() as PublicUserData);
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error("Erro ao buscar perfil público:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [username, db]);

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-black/95 font-sans">
                <div className="w-8 h-8 border-4 border-[#FF6E61] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !userData) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-black/95 font-sans text-white p-4 text-center">
                <div>
                    <h2 className="text-2xl font-bold mb-2">Usuário não encontrado</h2>
                    <p className="text-slate-400">O perfil @{username} não existe ou está indisponível.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-black/95 p-0 md:p-8 font-sans">
            <div className="w-full max-w-[420px] md:aspect-[9/16] h-full md:h-auto min-h-screen md:min-h-0 relative overflow-hidden md:shadow-2xl md:rounded-[30px] flex flex-col bg-[#161B22]">

                {/* Header / Cover */}
                <div className="relative h-48 bg-gradient-to-b from-[#FF6E61]/20 to-[#161B22] flex items-center justify-center">
                    <div className="absolute top-4 right-4">
                        <button onClick={handleShare} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white" title="Copiar Link">
                            <Share2 size={20} />
                        </button>
                        {copied && (
                            <div className="absolute top-12 right-0 bg-white text-black text-xs font-bold py-1 px-2 rounded animate-in fade-in slide-in-from-top-2">
                                Link copiado!
                            </div>
                        )}
                    </div>
                </div>

                {/* Profile Info */}
                <div className="px-6 -mt-16 flex flex-col items-center relative z-10">
                    <div className="w-32 h-32 rounded-full border-4 border-[#161B22] overflow-hidden bg-[#21262d] relative shadow-xl">
                        {userData.photoURL ? (
                            <img src={userData.photoURL} alt={userData.displayName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                                <UserIcon size={40} />
                            </div>
                        )}
                    </div>

                    <h1 className="mt-4 text-2xl font-bold text-white text-center">{userData.displayName}</h1>
                    <p className="text-[#FF6E61] font-mono text-sm font-bold">@{userData.username}</p>

                    <div className="flex items-center text-slate-400 text-xs mt-2 gap-1">
                        <MapPin size={12} /> Praticante CLIPZ RUN
                    </div>
                </div>

                {/* Badges / Stats Section */}
                <div className="flex-1 p-6 mt-6">
                    <h3 className="text-white font-bold uppercase tracking-wider text-sm mb-4 border-b border-white/10 pb-2">Conquistas</h3>

                    <div className="grid grid-cols-3 gap-3">
                        {/* Mock Badges - Future: Fetch from user_rewards */}
                        <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-2 aspect-square border border-white/5">
                            <div className="p-2 bg-yellow-500/20 rounded-full text-yellow-500">
                                <Award size={24} />
                            </div>
                            <span className="text-[10px] text-slate-400 text-center uppercase font-bold">Iniciante</span>
                        </div>

                        <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-2 aspect-square border border-white/5 opacity-50">
                            <div className="p-2 bg-slate-500/20 rounded-full text-slate-500">
                                <Award size={24} />
                            </div>
                            <span className="text-[10px] text-slate-500 text-center uppercase font-bold">10km</span>
                        </div>

                        <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-2 aspect-square border border-white/5 opacity-50">
                            <div className="p-2 bg-slate-500/20 rounded-full text-slate-500">
                                <Award size={24} />
                            </div>
                            <span className="text-[10px] text-slate-500 text-center uppercase font-bold">Maratona</span>
                        </div>
                    </div>

                    <div className="mt-8 p-4 bg-gradient-to-r from-[#FF6E61]/10 to-transparent rounded-2xl border border-[#FF6E61]/20">
                        <p className="text-white text-xs text-center italic opacity-80">
                            "O combustível de quem não para"
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
