import React, { useState, useEffect, useRef } from 'react';
import { User, updateProfile, sendPasswordResetEmail, deleteUser, getAuth } from 'firebase/auth';
import { Firestore, collection, query, where, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Save, Lock, LogOut, ChevronLeft, Trash2, AlertTriangle, Check, X } from 'lucide-react';

interface UserProfileProps {
    user: User;
    db: Firestore;
    storage: FirebaseStorage;
    onBack: () => void;
    onLogout: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, db, storage, onBack, onLogout }) => {
    const [displayName, setDisplayName] = useState(user.displayName || '');
    const [username, setUsername] = useState('');
    const [email] = useState(user.email || '');
    const [photoURL, setPhotoURL] = useState(user.photoURL || '');

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load initial data
    useEffect(() => {
        const loadUserData = async () => {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                if (data.username) setUsername(data.username);
            }
        };
        loadUserData();
    }, [user.uid, db]);

    const checkUsername = async (value: string) => {
        if (!value || value.length < 3) {
            setUsernameStatus('idle');
            return;
        }

        setUsernameStatus('checking');
        try {
            const q = query(collection(db, 'users'), where('username', '==', value));
            const snapshots = await getDocs(q);

            // Filter out if it's the current user's username
            const isTaken = !snapshots.empty && snapshots.docs.some(d => d.id !== user.uid);

            setUsernameStatus(isTaken ? 'unavailable' : 'available');
        } catch (err) {
            console.error("Erro checkUsername:", err);
            // On error (e.g. index missing), don't block. Assume available but warn.
            setUsernameStatus('available');
        }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setMessage({ type: 'success', text: 'Iniciando upload...' });

        try {
            const storageRef = ref(storage, `avatars/${user.uid}`);

            setMessage({ type: 'success', text: 'Enviando imagem...' });
            await uploadBytes(storageRef, file);

            const url = await getDownloadURL(storageRef);

            setMessage({ type: 'success', text: 'Atualizando perfil...' });
            await updateProfile(user, { photoURL: url });

            // Use setDoc with merge to ensure doc exists
            await setDoc(doc(db, 'users', user.uid), { photoURL: url }, { merge: true });

            setPhotoURL(url);
            setMessage({ type: 'success', text: 'Foto atualizada com sucesso!' });
        } catch (error: any) {
            console.error('Erro ao atualizar foto:', error);
            setMessage({ type: 'error', text: 'Erro ao atualizar foto: ' + (error.message || error) });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (usernameStatus === 'unavailable') {
            setMessage({ type: 'error', text: 'Nome de usuário indisponível.' });
            return;
        }

        setIsLoading(true);
        try {
            // Update Auth Profile
            if (user.displayName !== displayName) {
                await updateProfile(user, { displayName });
            }

            // Update Firestore User Doc
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
                username,
                displayName,
                email,
                photoURL: user.photoURL,
                updatedAt: new Date()
            }, { merge: true });

            setMessage({ type: 'success', text: 'Perfil atualizado!' });
        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: 'Erro ao salvar perfil.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!email) return;
        try {
            const auth = getAuth();
            await sendPasswordResetEmail(auth, email);
            alert(`Email de redefinição enviado para ${email}`);
        } catch (error) {
            alert('Erro ao enviar email.');
        }
    };

    const handleDeleteAccount = async () => {
        if (!showDeleteConfirm) {
            setShowDeleteConfirm(true);
            return;
        }

        setIsLoading(true);
        try {
            // Optional: Delete FS data manually or rely on rules
            await deleteDoc(doc(db, 'users', user.uid));
            await deleteUser(user);
            onLogout();
        } catch (error: any) {
            console.error(error);
            if (error.code === 'auth/requires-recent-login') {
                alert('Para segurança, faça login novamente antes de excluir a conta.');
                onLogout();
            } else {
                alert('Erro ao excluir conta: ' + error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-black/95 p-0 md:p-8 font-sans">
            <div className="w-full max-w-[420px] md:aspect-[9/16] h-full md:h-auto min-h-screen md:min-h-0 relative overflow-hidden md:shadow-2xl md:rounded-[30px] flex flex-col bg-[#161B22]">

                {/* Header */}
                <div className="p-6 flex items-center justify-between">
                    <button onClick={onBack} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white">
                        <ChevronLeft size={20} />
                    </button>
                    <h2 className="text-white font-bold uppercase tracking-wider">Meu Perfil</h2>
                    <div className="w-9" />
                </div>

                <div className="flex-1 overflow-y-auto hide-scrollbar p-6 pt-0">

                    {/* Avatar Section */}
                    <div className="flex flex-col items-center mb-8 relative">
                        <div className="w-32 h-32 rounded-full border-4 border-[#FF6E61]/20 overflow-hidden relative mb-4">
                            {photoURL ? (
                                <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-white/5 flex items-center justify-center text-slate-500">
                                    <Camera size={40} />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}>
                                <Camera size={24} className="text-white" />
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="text-[#FF6E61] text-xs font-bold uppercase tracking-wide hover:underline">
                            Alterar Foto
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">

                        {/* Display Name */}
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-slate-500 ml-1">Nome de Exibição</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white placeholder-slate-600 focus:border-[#FF6E61] outline-none transition-colors"
                                placeholder="Seu nome"
                            />
                        </div>

                        {/* Username */}
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-slate-500 ml-1">Username (Slug)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => {
                                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                        setUsername(val);
                                        checkUsername(val);
                                    }}
                                    className={`w-full bg-black/30 border rounded-xl p-4 text-white placeholder-slate-600 outline-none transition-colors ${usernameStatus === 'unavailable' ? 'border-red-500' :
                                        usernameStatus === 'available' ? 'border-green-500' : 'border-white/10 focus:border-[#FF6E61]'
                                        }`}
                                    placeholder="seu-username"
                                />
                                <div className="absolute right-4 top-4">
                                    {usernameStatus === 'checking' && <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />}
                                    {usernameStatus === 'available' && <Check size={18} className="text-green-500" />}
                                    {usernameStatus === 'unavailable' && <X size={18} className="text-red-500" />}
                                </div>
                            </div>
                            {usernameStatus === 'unavailable' && <p className="text-red-500 text-[10px] ml-1">Este username já está em uso.</p>}
                        </div>

                        {/* Email (Read Only) */}
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-slate-500 ml-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full bg-white/5 border border-transparent rounded-xl p-4 text-slate-400 cursor-not-allowed"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || usernameStatus === 'unavailable'}
                            className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all hover:brightness-110 flex items-center justify-center gap-2 mt-4"
                            style={{ backgroundColor: '#FF6E61' }}
                        >
                            {isLoading ? 'Salvando...' : <><Save size={18} /> SALVAR ALTERAÇÕES</>}
                        </button>

                    </form>

                    {message && (
                        <div className={`mt-6 p-4 rounded-xl text-sm font-medium text-center ${message.type === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                            {message.text}
                        </div>
                    )}

                    <hr className="border-white/5 my-8" />

                    {/* Danger Zone */}
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={handlePasswordReset}
                            className="w-full py-3 rounded-xl border border-white/10 bg-transparent text-slate-300 font-bold text-xs hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                        >
                            <Lock size={16} /> REDEFINIR SENHA
                        </button>

                        {!showDeleteConfirm ? (
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="w-full py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 font-bold text-xs hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 size={16} /> EXCLUIR CONTA
                            </button>
                        ) : (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-in zoom-in-95 duration-200">
                                <div className="flex flex-col items-center text-center mb-4">
                                    <AlertTriangle className="text-red-500 mb-2" size={32} />
                                    <h3 className="text-red-500 font-bold text-sm">TEM CERTEZA?</h3>
                                    <p className="text-slate-400 text-xs mt-1">Essa ação não pode ser desfeita. Todos os seus dados serão perdidos.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 py-2 rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20"
                                    >
                                        CANCELAR
                                    </button>
                                    <button
                                        onClick={handleDeleteAccount}
                                        className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 shadow-lg shadow-red-900/20"
                                    >
                                        SIM, EXCLUIR
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={onLogout} className="w-full py-4 mt-8 text-slate-500 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                        <LogOut size={16} /> SAIR DO APP
                    </button>

                </div>
            </div>
        </div>
    );
};
