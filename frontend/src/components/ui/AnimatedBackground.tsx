export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <svg
        className="absolute w-[300%] h-[300%] left-[-100%] top-[-100%] opacity-40 -rotate-45"
        viewBox="0 0 400 100"
        preserveAspectRatio="none"
      >
        <path
          className="animate-wave-slow stroke-indigo-600"
          fill="none"
          strokeWidth="0.5"
          d="M0,50 Q25,20 50,50 T100,50 T150,50 T200,50 T250,50 T300,50 T350,50 T400,50"
        />
        <path
          className="animate-wave-medium stroke-violet-600"
          fill="none"
          strokeWidth="0.5"
          d="M0,40 Q25,70 50,40 T100,40 T150,40 T200,40 T250,40 T300,40 T350,40 T400,40"
        />
        <path
          className="animate-wave-fast stroke-indigo-400"
          fill="none"
          strokeWidth="0.3"
          d="M0,60 Q25,30 50,60 T100,60 T150,60 T200,60 T250,60 T300,60 T350,60 T400,60"
        />
        <path
          className="animate-wave-slow stroke-violet-400"
          fill="none"
          strokeWidth="0.4"
          d="M0,45 Q25,15 50,45 T100,45 T150,45 T200,45 T250,45 T300,45 T350,45 T400,45"
        />
      </svg>
      {/* Radial gradient to fade out the edges */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(248,250,252,0.9)_70%)]"></div>
    </div>
  );
}
