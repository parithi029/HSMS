import React from 'react';

const GlowBackground = () => {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none -z-10 bg-slate-950">
      {/* Animated Glow Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/30 blur-[130px] animate-blob-1" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/30 blur-[130px] animate-blob-2" />
      <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[110px] animate-blob-3" />
      <div className="absolute bottom-[20%] left-[10%] w-[35%] h-[35%] rounded-full bg-pink-600/15 blur-[100px] animate-blob-4" />
      <div className="absolute top-[40%] left-[40%] w-[25%] h-[25%] rounded-full bg-cyan-500/10 blur-[80px] animate-blob-5" />

      {/* Subtle Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <style>{`
        @keyframes blob-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, 100px) scale(1.1); }
          66% { transform: translate(-40px, 40px) scale(0.9); }
        }
        @keyframes blob-2 {
          0%, 100% { transform: translate(0, 0) scale(1.1); }
          33% { transform: translate(-100px, -50px) scale(0.9); }
          66% { transform: translate(40px, -110px) scale(1.05); }
        }
        @keyframes blob-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(80px, -80px) scale(1.1); }
          66% { transform: translate(-30px, 60px) scale(1.2); }
        }
        @keyframes blob-4 {
          0%, 100% { transform: translate(0, 0) scale(1.2); }
          50% { transform: translate(110px, 40px) scale(1); }
        }
        @keyframes blob-5 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-60px, 120px) scale(1.3); }
        }
        .animate-blob-1 { animation: blob-1 15s ease-in-out infinite; }
        .animate-blob-2 { animation: blob-2 18s ease-in-out infinite; }
        .animate-blob-3 { animation: blob-3 20s ease-in-out infinite; }
        .animate-blob-4 { animation: blob-4 22s ease-in-out infinite; }
        .animate-blob-5 { animation: blob-5 25s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default GlowBackground;
