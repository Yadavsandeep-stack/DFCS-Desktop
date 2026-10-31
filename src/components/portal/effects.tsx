import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Soft glowing orb that follows the cursor across the whole viewport. */
export function CursorSpotlight() {
  const x = useSpring(0, { stiffness: 90, damping: 20, mass: 0.4 });
  const y = useSpring(0, { stiffness: 90, damping: 20, mass: 0.4 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
      setVisible(true);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [x, y]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-0 hidden h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 blur-3xl transition-opacity duration-700 md:block"
      style={{
        left: x,
        top: y,
        opacity: visible ? 0.5 : 0,
        background:
          "radial-gradient(circle, color-mix(in oklab, var(--primary) 34%, transparent), transparent 65%)",
      }}
    />
  );
}

/** Page background: cyber grid overlay above the mesh gradient body. */
export function GridBackdrop() {
  return <div aria-hidden className="grid-overlay pointer-events-none fixed inset-0 z-0" />;
}

export function GlassCard({
  children,
  className,
  glow = true,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass-panel rounded-2xl transition-all duration-300",
        glow && "hover:border-primary/40 hover:shadow-glow",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Perspective tilt card used for the platform download tiles. */
export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rx = useTransform(useSpring(py, { stiffness: 150, damping: 18 }), [-0.5, 0.5], [8, -8]);
  const ry = useTransform(useSpring(px, { stiffness: 150, damping: 18 }), [-0.5, 0.5], [-8, 8]);

  return (
    <motion.div
      ref={ref}
      onPointerMove={(event) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        px.set((event.clientX - rect.left) / rect.width - 0.5);
        py.set((event.clientY - rect.top) / rect.height - 0.5);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className={cn(
        "glass-panel rounded-2xl transition-colors duration-300 hover:border-primary/40",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const riseIn = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

/** Animated number counter for KPI cards. */
export function Counter({ value, duration = 1.1 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{shown.toLocaleString()}</>;
}
