"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode, RefObject } from "react";
import { CheckIcon, ImageIcon, PackageIcon, WarningIcon } from "./icons";

export const NODE = {
  browser: 0,
  api: 1,
  queue: 2,
  worker: 3,
  chromium: 4,
} as const;

export type NodeIndex = (typeof NODE)[keyof typeof NODE];
export type NodeVariant = "pulse" | "pulse-success" | "pulse-danger";
export type PacketVariant = "return" | "fail";
export type PacketIcon = "request" | "ack" | "done" | "warning";

type Packet = {
  id: number;
  from: NodeIndex;
  to: NodeIndex;
  lane: number;
  x: number;
  y: number;
  label?: string;
  icon?: PacketIcon;
  variant?: PacketVariant;
  moved: boolean;
  visible: boolean;
};

type Flash = {
  id: number;
  index: number;
  text: string;
  variant?: "success" | "danger";
  show: boolean;
};

export type PipelineFx = {
  registerNode: (index: number, element: HTMLElement | null) => void;
  stepsRef: RefObject<HTMLDivElement | null>;
  packets: Packet[];
  flashes: Flash[];
  pulseNode: (index: number, variant?: NodeVariant) => void;
  flashLabel: (
    index: number,
    text: string,
    variant?: "success" | "danger",
  ) => void;
  flyPacket: (spec: {
    from: NodeIndex;
    to: NodeIndex;
    label?: string;
    icon?: PacketIcon;
    variant?: PacketVariant;
  }) => void;
};

const PipelineFxContext = createContext<PipelineFx | null>(null);

const HOP_MS = 400;
const LANE_COUNT = 3;

/**
 * Owns the transient visuals for the pipeline diagram: node pulses, labels and
 * travelling packets.
 *
 * Every effect here is triggered by a real API event. Nothing runs on its own
 * timeline, so a packet only moves because the server reported a state change.
 * HOP_MS is how long a movement *looks* like it takes, not how long the work
 * actually took — the diagram is a reading of observed state, not a replay of
 * the original request timings.
 */
export function PipelineFxProvider({ children }: { children: ReactNode }) {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [flashes, setFlashes] = useState<Flash[]>([]);

  const nodes = useRef(new Map<number, HTMLElement>());
  const stepsRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const seq = useRef(0);
  const laneSeq = useRef(0);

  const later = useCallback((fn: () => void, ms: number) => {
    const timer = setTimeout(fn, ms);
    timers.current.push(timer);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
      pending.length = 0;
    };
  }, []);

  const registerNode = useCallback(
    (index: number, element: HTMLElement | null) => {
      if (element) nodes.current.set(index, element);
      else nodes.current.delete(index);
    },
    [],
  );

  const centreOf = useCallback((index: number) => {
    const steps = stepsRef.current;
    const node = nodes.current.get(index);
    if (!steps || !node) return null;

    const stepsRect = steps.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();

    return {
      x: nodeRect.left + nodeRect.width / 2 - stepsRect.left,
      y: nodeRect.top + nodeRect.height / 2 - stepsRect.top,
    };
  }, []);

  const pulseNode = useCallback((index: number, variant?: NodeVariant) => {
    const node = nodes.current.get(index)?.querySelector<HTMLElement>(".node");
    if (!node) return;

    for (const cls of ["pulse", "pulse-success", "pulse-danger"]) {
      node.classList.remove(cls);
    }
    void node.offsetWidth; // reflow, so re-adding restarts the animation
    if (variant) node.classList.add(variant);
  }, []);

  const flashLabel = useCallback(
    (index: number, text: string, variant?: "success" | "danger") => {
      const id = ++seq.current;
      setFlashes((current) => [
        ...current,
        { id, index, text, variant, show: false },
      ]);

      requestAnimationFrame(() => {
        setFlashes((current) =>
          current.map((flash) =>
            flash.id === id ? { ...flash, show: true } : flash,
          ),
        );
      });

      later(() => {
        setFlashes((current) =>
          current.map((flash) =>
            flash.id === id ? { ...flash, show: false } : flash,
          ),
        );
      }, 900);

      later(() => {
        setFlashes((current) => current.filter((flash) => flash.id !== id));
      }, 1150);
    },
    [later],
  );

  const flyPacket = useCallback<PipelineFx["flyPacket"]>(
    ({ from, to, label, icon, variant }) => {
      const origin = centreOf(from);
      const target = centreOf(to);
      if (!origin || !target) return;

      const id = ++seq.current;
      const lane = ((laneSeq.current++ % LANE_COUNT) - 1) * 7;

      setPackets((current) => [
        ...current,
        {
          id,
          from,
          to,
          lane,
          x: origin.x,
          y: origin.y + lane,
          label,
          icon,
          variant,
          moved: false,
          visible: false,
        },
      ]);

      requestAnimationFrame(() => {
        setPackets((current) =>
          current.map((packet) =>
            packet.id === id ? { ...packet, visible: true } : packet,
          ),
        );
      });

      // one frame at the origin, then move — the CSS transition does the glide
      later(() => {
        setPackets((current) =>
          current.map((packet) =>
            packet.id === id
              ? { ...packet, moved: true, x: target.x, y: target.y + lane }
              : packet,
          ),
        );
      }, 30);

      later(() => {
        setPackets((current) =>
          current.map((packet) =>
            packet.id === id ? { ...packet, visible: false } : packet,
          ),
        );
      }, HOP_MS);

      later(() => {
        setPackets((current) => current.filter((packet) => packet.id !== id));
      }, HOP_MS + 240);
    },
    [centreOf, later],
  );

  const value = useMemo<PipelineFx>(
    () => ({
      registerNode,
      stepsRef,
      packets,
      flashes,
      pulseNode,
      flashLabel,
      flyPacket,
    }),
    [registerNode, packets, flashes, pulseNode, flashLabel, flyPacket],
  );

  return (
    <PipelineFxContext.Provider value={value}>
      {children}
    </PipelineFxContext.Provider>
  );
}

export function usePipelineFx(): PipelineFx {
  const ctx = useContext(PipelineFxContext);
  if (!ctx) {
    throw new Error("usePipelineFx must be used inside PipelineFxProvider");
  }
  return ctx;
}

const PACKET_ICONS = {
  request: PackageIcon,
  ack: CheckIcon,
  done: ImageIcon,
  warning: WarningIcon,
} as const;

/** Rendered inside the .steps track so packets share its positioning context. */
export function Packets() {
  const { packets } = usePipelineFx();

  return (
    <>
      {packets.map((packet) => {
        const Icon = packet.icon ? PACKET_ICONS[packet.icon] : null;
        const className = [
          "packet",
          packet.variant ?? "",
          packet.visible ? "visible" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div
            key={packet.id}
            className={className}
            style={{ left: packet.x, top: packet.y }}
            aria-hidden
          >
            {packet.label ? (
              <span className="packet-label">{packet.label}</span>
            ) : null}
            {Icon ? <Icon /> : null}
          </div>
        );
      })}
    </>
  );
}
