import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Square,
  Share2,
  MapPin,
  Activity,
  Timer,
  Navigation,
  Sparkles,
  Camera,
  Settings,
  Footprints,
  History,
  LogOut,
  ChevronLeft,
  Save,
  User as UserIcon,
  Lock,
  X,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  Timestamp,
  orderBy,
} from "firebase/firestore";

// --- CONFIGURAÇÃO FIREBASE ---
// Seus dados reais
const firebaseConfig = {
  apiKey: "AIzaSyDBv_Uue2q-t3tU2jWz7moy5F0PemrEt1A",
  authDomain: "clipzrun.firebaseapp.com",
  projectId: "clipzrun",
  storageBucket: "clipzrun.firebasestorage.app",
  messagingSenderId: "590774403152",
  appId: "1:590774403152:web:05d8361816352512599155",
  measurementId: "G-XP83J48JYF",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Configuração das Logos ---
// Certifique-se de que estas imagens estão na pasta 'public' do projeto Vite
const LOGO_SYMBOL = "/Clipz RUN@4x.png"; // Adicionei a barra '/' para garantir o caminho na raiz
const LOGO_FULL = "/logo clipz run@4x.png";

// --- Paleta de Cores ---
const theme = {
  primary: "#FF6E61",
  secondary: "#D3E156",
  bg: "#161B22",
  surface: "#21262d",
  textMain: "#ffffff",
  textMuted: "#8b949e",
};

// --- Tipos ---
interface ActivityData {
  id?: string;
  date: any;
  type: "run" | "walk";
  distance: number;
  elapsedTime: number;
  positions: number[][];
  pace: string;
  aiCaption?: string;
}

// --- API Gemini ---
const generateGeminiContent = async (prompt: string): Promise<string> => {
  const apiKey = "AIzaSyD9I3jlczx-X6LDPT8Mukcj-tHhB1ExJFY";
  if (!apiKey) return "Treino finalizado! #ClipzRUN";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text || "Treino concluído!"
    );
  } catch (error) {
    return "Treino concluído!";
  }
};

// --- Funções Utilitárias ---
const getDistanceFromLatLonInKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
const deg2rad = (deg: number) => deg * (Math.PI / 180);

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const calculatePaceVal = (distance: number, elapsedTime: number) => {
  if (distance < 0.01) return "0'00\"";
  const totalMinutes = elapsedTime / 60;
  const paceDecimal = totalMinutes / distance;
  const paceMin = Math.floor(paceDecimal);
  const paceSec = Math.floor((paceDecimal - paceMin) * 60);
  return `${paceMin}'${paceSec.toString().padStart(2, "0")}"`;
};

// --- Visualizador de Rota ---
const RouteVisualizer = ({
  positions,
  className,
}: {
  positions: number[][];
  className?: string;
}) => {
  if (!positions || positions.length < 2) return <div className={className} />;

  const lats = positions.map((p) => p[0]);
  const lngs = positions.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const padding = 0.0002;

  const pointsString = positions
    .map(([lat, lng]) => {
      const x =
        ((lng - (minLng - padding)) / (maxLng + padding - (minLng - padding))) *
        100;
      const y =
        100 -
        ((lat - (minLat - padding)) / (maxLat + padding - (minLat - padding))) *
          100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg
        className="w-full h-full p-4"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <polyline
          points={pointsString}
          fill="none"
          stroke="black"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-40 blur-sm"
        />
        <polyline
          points={pointsString}
          fill="none"
          stroke={theme.primary}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="drop-shadow-lg"
        />
        {positions.length > 0 && (
          <circle
            cx={pointsString.split(" ").pop()?.split(",")[0]}
            cy={pointsString.split(" ").pop()?.split(",")[1]}
            r="3"
            fill="white"
            stroke={theme.primary}
            strokeWidth="1"
          />
        )}
      </svg>
    </div>
  );
};

// --- Container Base ---
const MobileContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black/95 p-0 md:p-8 font-sans">
      <div
        className={`w-full max-w-[420px] md:aspect-[9/16] h-full md:h-auto min-h-screen md:min-h-0 relative overflow-hidden md:shadow-2xl md:rounded-[30px] flex flex-col ${className}`}
        style={{ backgroundColor: theme.bg }}
      >
        {children}
      </div>
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [status, setStatus] = useState<
    | "auth"
    | "idle"
    | "history"
    | "selecting"
    | "running"
    | "paused"
    | "finished"
    | "details"
  >("auth");

  // Auth States
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Activity States
  const [activityType, setActivityType] = useState<"run" | "walk">("run");
  const [positions, setPositions] = useState<number[][]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [distance, setDistance] = useState(0);

  // UI States
  const [aiCaption, setAiCaption] = useState<string | null>(null);
  const [loadingAiCaption, setLoadingAiCaption] = useState(false);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState(false);
  const [historyList, setHistoryList] = useState<ActivityData[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityData | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const watchId = useRef<number | null>(null);
  const timerId = useRef<any>(null);
  const simulationInterval = useRef<any>(null);

  // Monitor Auth & Load Data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        setStatus("idle");
        // Caminho simplificado para produção: users/{uid}/activities
        const activitiesRef = collection(db, "users", user.uid, "activities");
        // Ordenação simples no cliente se o índice não existir, ou query simples
        const q = query(activitiesRef, orderBy("date", "desc"));

        const unsubHistory = onSnapshot(
          q,
          (snapshot) => {
            const acts = snapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() } as ActivityData)
            );
            setHistoryList(acts);
          },
          (err) => {
            console.error("Erro ao ler histórico:", err);
            // Se falhar (ex: falta de indice), tenta sem ordenação
            onSnapshot(
              collection(db, "users", user.uid, "activities"),
              (snap) => {
                const acts = snap.docs.map(
                  (doc) => ({ id: doc.id, ...doc.data() } as ActivityData)
                );
                setHistoryList(
                  acts.sort((a, b) => b.date.seconds - a.date.seconds)
                );
              }
            );
          }
        );
        return () => unsubHistory();
      } else {
        setStatus("auth");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      let msg = "Erro na autenticação.";
      if (err.code === "auth/email-already-in-use")
        msg = "Este email já está cadastrado.";
      if (err.code === "auth/wrong-password") msg = "Senha incorreta.";
      if (err.code === "auth/user-not-found") msg = "Usuário não encontrado.";
      if (err.code === "auth/weak-password")
        msg = "A senha deve ter pelo menos 6 caracteres.";
      setAuthError(msg);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setStatus("auth");
    setHistoryList([]);
  };

  useEffect(() => {
    if (status === "finished" && !aiCaption && !loadingAiCaption) {
      generateCaption(
        distance,
        elapsedTime,
        calculatePaceVal(distance, elapsedTime),
        activityType
      );
    }
  }, [status]);

  const generateCaption = async (
    d: number,
    t: number,
    p: string,
    type: string
  ) => {
    setLoadingAiCaption(true);
    const activityName = type === "run" ? "Corrida" : "Caminhada";
    const prompt = `Crie uma legenda curta e vibrante (max 15 palavras) para Stories sobre minha ${activityName}: ${d.toFixed(
      2
    )}km, pace ${p}. Use emojis.`;
    const text = await generateGeminiContent(prompt);
    setAiCaption(text);
    setLoadingAiCaption(false);
  };

  const updatePositionLogic = (newPoint: number[]) => {
    setPositions((prev) => {
      const lastPoint = prev.length > 0 ? prev[prev.length - 1] : null;
      if (lastPoint) {
        const distDelta = getDistanceFromLatLonInKm(
          lastPoint[0],
          lastPoint[1],
          newPoint[0],
          newPoint[1]
        );
        if (distDelta > 0.002) {
          setDistance((d) => d + distDelta);
          return [...prev, newPoint];
        }
        return prev;
      }
      return [newPoint];
    });
  };

  const startTracking = () => {
    if (!navigator.geolocation) return alert("Habilite o GPS.");
    setStatus("running");
    timerId.current = setInterval(() => setElapsedTime((p) => p + 1), 1000);
    watchId.current = navigator.geolocation.watchPosition(
      (p) => updatePositionLogic([p.coords.latitude, p.coords.longitude]),
      console.error,
      { enableHighAccuracy: true, distanceFilter: 2 }
    );
  };

  const startSimulation = () => {
    setStatus("running");
    let lat = -23.587416,
      lng = -46.657634,
      angle = 0;
    updatePositionLogic([lat, lng]);
    timerId.current = setInterval(() => setElapsedTime((p) => p + 1), 1000);
    simulationInterval.current = setInterval(() => {
      angle += 0.08;
      lat += Math.sin(angle) * 0.00015;
      lng += Math.sin(angle * 2) * 0.00015;
      updatePositionLogic([lat, lng]);
    }, 1000);
  };

  const stopTracking = async () => {
    clearInterval(timerId.current);
    if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    if (simulationInterval.current) clearInterval(simulationInterval.current);

    setStatus("finished");

    if (currentUser) {
      try {
        // Caminho corrigido para produção
        await addDoc(collection(db, "users", currentUser.uid, "activities"), {
          date: Timestamp.now(),
          type: activityType,
          distance: distance,
          elapsedTime: elapsedTime,
          pace: calculatePaceVal(distance, elapsedTime),
          positions: positions,
        });
      } catch (e) {
        console.error("Erro ao salvar atividade:", e);
        alert("Erro ao salvar treino. Verifique sua conexão.");
      }
    }
  };

  const resetApp = () => {
    setStatus("idle");
    setPositions([]);
    setElapsedTime(0);
    setDistance(0);
    setAiCaption(null);
    setUserPhoto(null);
    setShareMode(false);
  };

  // --- UI Renders ---

  // Auth Screen
  if (status === "auth") {
    return (
      <MobileContainer className="p-8 justify-center">
        <div className="flex flex-col items-center mb-8">
          <img src={LOGO_SYMBOL} className="w-20 h-20 mb-4 object-contain" />
          <img src={LOGO_FULL} className="h-8 mb-2 object-contain" />
          <p
            className="text-xs text-center opacity-60"
            style={{ color: theme.textMuted }}
          >
            O combustível de quem não para
          </p>
        </div>

        <div className="bg-white/5 p-6 rounded-2xl w-full border border-white/10">
          <h2 className="text-white font-bold text-xl mb-6 text-center">
            {isLogin ? "Login" : "Criar Conta"}
          </h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="flex items-center bg-black/30 rounded-lg px-3 py-3 border border-white/10 focus-within:border-orange-500">
              <UserIcon size={16} className="text-slate-500 mr-2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent text-white w-full outline-none text-sm"
                placeholder="Email"
              />
            </div>
            <div className="flex items-center bg-black/30 rounded-lg px-3 py-3 border border-white/10 focus-within:border-orange-500">
              <Lock size={16} className="text-slate-500 mr-2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent text-white w-full outline-none text-sm"
                placeholder="Senha"
              />
            </div>

            {authError && (
              <p className="text-red-500 text-xs text-center">{authError}</p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-xl font-bold text-white transition-all hover:brightness-110 shadow-lg mt-2"
              style={{ backgroundColor: theme.primary }}
            >
              {authLoading ? "..." : isLogin ? "ENTRAR" : "CRIAR CONTA"}
            </button>
          </form>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="mt-4 text-xs text-slate-400 hover:text-white w-full text-center"
          >
            {isLogin ? "Criar nova conta" : "Já tenho conta"}
          </button>
        </div>
      </MobileContainer>
    );
  }

  // History Screen
  if (status === "history") {
    return (
      <MobileContainer className="relative">
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setStatus("idle")}
              className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-white font-bold uppercase tracking-wider">
              Histórico
            </h2>
            <div className="w-9" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pb-20 no-scrollbar">
            {historyList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-sm">
                Nenhum treino salvo.
              </div>
            ) : (
              historyList.map((act) => (
                <div
                  key={act.id}
                  onClick={() => {
                    setSelectedActivity(act);
                    setStatus("details");
                  }}
                  className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/10"
                >
                  <div className="flex items-center">
                    <div
                      className={`p-3 rounded-full mr-4 ${
                        act.type === "run"
                          ? "bg-orange-500/20 text-orange-500"
                          : "bg-green-500/20 text-green-500"
                      }`}
                    >
                      {act.type === "run" ? (
                        <Activity size={20} />
                      ) : (
                        <Footprints size={20} />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm uppercase">
                        {act.type === "run" ? "Corrida" : "Caminhada"}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {new Date(act.date.seconds * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-mono font-bold">
                      {act.distance.toFixed(2)} km
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </MobileContainer>
    );
  }

  // Share/Result Card
  const renderResultCard = (data: ActivityData, isPreview = false) => {
    const currentCaption = isPreview
      ? selectedActivity?.aiCaption || "Belo treino!"
      : aiCaption;
    const activityName = data.type === "run" ? "CORRIDA" : "CAMINHADA";

    return (
      <div
        className={`w-full relative overflow-hidden flex flex-col bg-black transition-all duration-300
          ${
            shareMode
              ? "h-screen w-screen absolute inset-0 z-50"
              : "aspect-[9/16] rounded-[20px] shadow-2xl border border-white/10 max-h-[75vh]"
          }`}
      >
        {/* Camada de Foto/Fundo */}
        <div className="absolute inset-0 z-0">
          {userPhoto ? (
            <img src={userPhoto} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-[#21262d] to-black"></div>
          )}
          <div
            className={`absolute inset-0 ${
              userPhoto ? "bg-black/40" : "bg-transparent"
            }`}
          ></div>
          <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
        </div>

        {/* Mapa SVG */}
        <div
          className={`absolute inset-0 z-10 flex items-center justify-center pointer-events-none ${
            shareMode ? "pb-64" : "pb-32"
          }`}
        >
          <RouteVisualizer
            positions={data.positions}
            className="w-full h-[60%]"
          />
        </div>

        {/* Overlay de Dados */}
        <div className="relative z-20 flex flex-col justify-between h-full p-6 pt-10">
          <div className="flex justify-between items-start">
            <div>
              <img src={LOGO_FULL} className="h-8 mb-2 object-contain" />
              <div className="flex items-center text-xs font-mono opacity-90 text-white">
                <MapPin
                  size={12}
                  className="mr-1"
                  style={{ color: theme.primary }}
                />{" "}
                São Paulo, BR
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span
                className="text-xs font-black px-3 py-1 rounded-full backdrop-blur-md shadow-lg mb-1 uppercase tracking-widest"
                style={{ backgroundColor: theme.secondary, color: "#000000" }}
              >
                {activityName}
              </span>
              <span className="text-[10px] text-white/70 font-mono">
                {data.date instanceof Timestamp
                  ? new Date(data.date.seconds * 1000).toLocaleDateString()
                  : new Date().toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div
                className="backdrop-blur-xl rounded-2xl p-4 border-l-4 shadow-lg bg-white/5"
                style={{ borderColor: theme.primary }}
              >
                <p className="text-[10px] uppercase font-bold mb-1 opacity-100 text-white">
                  Distância
                </p>
                <div className="flex items-baseline">
                  <span className="text-4xl font-black text-white">
                    {data.distance.toFixed(2)}
                  </span>
                  <span
                    className="text-sm font-bold ml-1"
                    style={{ color: theme.primary }}
                  >
                    km
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div
                  className="backdrop-blur-xl rounded-2xl p-3 flex-1 flex flex-col justify-center border-l-2 bg-white/5"
                  style={{ borderColor: theme.secondary }}
                >
                  <p className="text-[10px] uppercase font-bold opacity-100 text-white">
                    Tempo
                  </p>
                  <p className="text-xl font-black text-white leading-none">
                    {formatTime(data.elapsedTime)}
                  </p>
                </div>
                <div
                  className="backdrop-blur-xl rounded-2xl p-3 flex-1 flex flex-col justify-center border-l-2 bg-white/5"
                  style={{ borderColor: theme.secondary }}
                >
                  <p className="text-[10px] uppercase font-bold opacity-100 text-white">
                    Ritmo
                  </p>
                  <p className="text-xl font-black text-white leading-none">
                    {data.pace ||
                      calculatePaceVal(data.distance, data.elapsedTime)}
                  </p>
                </div>
              </div>
            </div>

            <div className="backdrop-blur-md rounded-xl p-4 border border-white/5 bg-black/40 min-h-[60px] flex items-center justify-center">
              {!isPreview && loadingAiCaption ? (
                <div className="flex items-center text-xs opacity-70 animate-pulse text-white">
                  <Sparkles size={14} className="mr-2" /> Gerando legenda...
                </div>
              ) : (
                <p className="text-sm italic text-center leading-relaxed text-white/90">
                  "{currentCaption || aiCaption}"
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Aviso de Modo Share */}
        {shareMode && (
          <div className="absolute top-1/2 left-0 right-0 text-center pointer-events-none opacity-0 animate-pulse">
            <p className="text-white font-bold bg-black/50 inline-block px-4 py-2 rounded">
              Tire o print agora!
            </p>
          </div>
        )}

        {/* Botão Sair do Share */}
        {shareMode && (
          <button
            onClick={() => setShareMode(false)}
            className="absolute top-6 right-6 bg-black/50 p-2 rounded-full text-white backdrop-blur z-50"
          >
            <X size={24} />
          </button>
        )}
      </div>
    );
  };

  if (status === "finished" || status === "details") {
    const data =
      status === "details" && selectedActivity
        ? selectedActivity
        : {
            date: Timestamp.now(),
            type: activityType,
            distance,
            elapsedTime,
            positions,
            pace: calculatePaceVal(distance, elapsedTime),
          };

    return (
      <MobileContainer className={`p-0 bg-black ${shareMode ? "" : "md:p-8"}`}>
        <div className="w-full h-full flex flex-col items-center justify-center relative">
          {renderResultCard(data as ActivityData, status === "details")}

          {!shareMode && (
            <div className="w-full max-w-[400px] flex gap-2 p-4">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const r = new FileReader();
                    r.onload = () => setUserPhoto(r.result as string);
                    r.readAsDataURL(f);
                  }
                }}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white text-xs font-bold flex flex-col items-center gap-1"
              >
                <Camera size={18} /> FOTO
              </button>
              <button
                onClick={() => setShareMode(true)}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white text-xs font-bold flex flex-col items-center gap-1 shadow-lg shadow-orange-900/40"
              >
                <Share2 size={18} /> STORIES
              </button>
              <button
                onClick={() => {
                  resetApp();
                  setStatus(status === "details" ? "history" : "idle");
                }}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white text-xs font-bold flex flex-col items-center gap-1"
              >
                <Save size={18} /> {status === "details" ? "VOLTAR" : "SALVAR"}
              </button>
            </div>
          )}
        </div>
      </MobileContainer>
    );
  }

  // Dashboard / Seleção
  if (status === "idle" || status === "selecting") {
    return (
      <MobileContainer className="relative">
        <div
          className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20"
          style={{ backgroundColor: theme.primary }}
        />

        <div className="z-10 flex flex-col items-center justify-center h-full w-full p-6">
          <div className="absolute top-6 right-6 flex items-center gap-4">
            <button
              onClick={() => setStatus("history")}
              className="text-white/60 hover:text-white transition-colors"
              title="Histórico"
            >
              <History size={24} />
            </button>
            <button
              onClick={handleLogout}
              className="text-white/60 hover:text-white transition-colors"
              title="Sair"
            >
              <LogOut size={24} />
            </button>
          </div>

          <div className="mb-8 w-32 h-32 rounded-full flex items-center justify-center relative shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-transparent">
            <img
              src={LOGO_SYMBOL}
              className="w-24 h-24 object-contain drop-shadow-2xl"
            />
          </div>
          <img src={LOGO_FULL} className="h-12 mb-4 object-contain" />

          {status === "idle" ? (
            <>
              <p className="text-center mb-16 opacity-80 text-sm font-medium tracking-wide text-slate-300">
                O combustível de quem não para
              </p>
              <div className="space-y-4 w-full">
                <button
                  onClick={() => setStatus("selecting")}
                  className="w-full text-white font-bold py-5 rounded-2xl flex items-center justify-center transition-all shadow-lg hover:brightness-110 group border border-white/10 text-lg"
                  style={{
                    backgroundColor: theme.primary,
                    boxShadow: `0 10px 30px -10px ${theme.primary}66`,
                  }}
                >
                  <Play className="mr-2 fill-white group-hover:scale-110 transition-transform" />{" "}
                  INICIAR
                </button>
                <button
                  onClick={() => {
                    setActivityType("run");
                    startSimulation();
                  }}
                  className="w-full border font-bold py-3 rounded-2xl flex items-center justify-center text-sm transition-all hover:bg-white/5 text-slate-400"
                  style={{ borderColor: theme.surface }}
                >
                  <Navigation className="mr-2" size={16} /> MODO SIMULAÇÃO
                </button>
              </div>
            </>
          ) : (
            <div className="w-full animate-in slide-in-from-bottom-10 fade-in duration-300">
              <p className="text-center mb-8 font-bold text-white text-lg">
                Qual o desafio de hoje?
              </p>
              <div className="grid grid-cols-1 gap-4 w-full">
                <button
                  onClick={() => {
                    setActivityType("run");
                    startTracking();
                  }}
                  className="w-full h-24 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 rounded-2xl border border-white/10 flex items-center px-6 relative overflow-hidden group transition-all"
                >
                  <div className="p-3 rounded-full bg-orange-500/20 mr-4 group-hover:scale-110 transition-transform">
                    <Activity className="text-orange-500" size={24} />
                  </div>
                  <div className="text-left">
                    <span className="block font-black text-xl text-white italic">
                      CORRIDA
                    </span>
                    <span className="text-xs text-slate-400">
                      Ritmo intenso
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setActivityType("walk");
                    startTracking();
                  }}
                  className="w-full h-24 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 rounded-2xl border border-white/10 flex items-center px-6 relative overflow-hidden group transition-all"
                >
                  <div className="p-3 rounded-full bg-green-500/20 mr-4 group-hover:scale-110 transition-transform">
                    <Footprints className="text-green-500" size={24} />
                  </div>
                  <div className="text-left">
                    <span className="block font-black text-xl text-white italic">
                      CAMINHADA
                    </span>
                    <span className="text-xs text-slate-400">Ritmo leve</span>
                  </div>
                </button>
              </div>
              <button
                onClick={() => setStatus("idle")}
                className="mt-8 text-sm text-slate-500 hover:text-white w-full text-center"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </MobileContainer>
    );
  }

  // Running UI
  return (
    <MobileContainer>
      <div className="flex-1 relative flex flex-col p-6 h-full">
        <div className="flex justify-between items-start z-10 mb-6">
          <div
            className="backdrop-blur rounded-2xl p-4 border border-white/5 shadow-lg"
            style={{ backgroundColor: `${theme.surface}E6` }}
          >
            <span className="text-xs uppercase block mb-1 opacity-60 text-slate-400">
              Distância
            </span>
            <span className="text-5xl font-black text-white tracking-tighter">
              {distance.toFixed(2)}
            </span>
            <span className="font-bold ml-1" style={{ color: theme.primary }}>
              km
            </span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div
              className="px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center shadow-[0_0_15px_rgba(211,225,86,0.3)]"
              style={{
                backgroundColor: `${theme.secondary}20`,
                color: theme.secondary,
                borderColor: `${theme.secondary}50`,
                borderWidth: "1px",
              }}
            >
              <Activity size={12} className="mr-2" /> GRAVANDO
            </div>
            <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white uppercase tracking-wider">
              {activityType === "run" ? "CORRIDA" : "CAMINHADA"}
            </div>
          </div>
        </div>
        <div
          className="flex-1 rounded-3xl border border-white/5 relative overflow-hidden shadow-inner mb-6"
          style={{ backgroundColor: `${theme.surface}80` }}
        >
          <RouteVisualizer positions={positions} className="w-full h-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-auto mb-24">
          <div
            className="rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center shadow-lg text-center h-24"
            style={{ backgroundColor: theme.surface }}
          >
            <Timer
              size={24}
              style={{ color: theme.primary }}
              className="mb-2"
            />
            <p className="text-2xl font-bold font-mono text-white leading-none">
              {formatTime(elapsedTime)}
            </p>
            <p className="text-[10px] uppercase opacity-60 mt-1 text-slate-400">
              Tempo Total
            </p>
          </div>
          <div
            className="rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center shadow-lg text-center h-24"
            style={{ backgroundColor: theme.surface }}
          >
            {activityType === "run" ? (
              <Activity
                size={24}
                style={{ color: theme.primary }}
                className="mb-2"
              />
            ) : (
              <Footprints
                size={24}
                style={{ color: theme.primary }}
                className="mb-2"
              />
            )}
            <p className="text-2xl font-bold font-mono text-white leading-none">
              {calculatePaceVal(distance, elapsedTime)}
            </p>
            <p className="text-[10px] uppercase opacity-60 mt-1 text-slate-400">
              Pace Médio
            </p>
          </div>
        </div>
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 p-6 pb-8 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20 border-t border-white/5"
        style={{ backgroundColor: theme.surface }}
      >
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => {
              clearInterval(timerId.current);
              setStatus("paused");
            }}
            className="w-16 h-16 rounded-full text-white flex items-center justify-center transition-colors border border-white/10 hover:bg-white/10 bg-black/50"
          >
            <Pause fill="currentColor" size={24} />
          </button>
          <button
            onClick={stopTracking}
            className="flex-1 text-white font-bold h-16 rounded-2xl flex items-center justify-center transition-all shadow-lg hover:brightness-110"
            style={{ backgroundColor: theme.primary }}
          >
            <Square fill="currentColor" className="mr-2" size={18} /> FINALIZAR
          </button>
        </div>
      </div>
    </MobileContainer>
  );
}
