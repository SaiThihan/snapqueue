"use client";

import {
  CameraIcon,
  CpuIcon,
  MonitorIcon,
  RedisIcon,
  ServerIcon,
} from "./icons";

const WORKER_CONCURRENCY = 3;

const STEPS = [
  { id: "browser", label: <>Browser</>, icon: MonitorIcon },
  { id: "api", label: <>Express<br />API</>, icon: ServerIcon },
  { id: "queue", label: <>Redis /<br />BullMQ</>, icon: RedisIcon },
  { id: "worker", label: <>Worker</>, icon: CpuIcon },
  { id: "chromium", label: <>Chromium</>, icon: CameraIcon },
] as const;

type Props = {
  activeCount: number;
};

export function Pipeline({ activeCount }: Props) {
  const busySlots = Math.min(activeCount, WORKER_CONCURRENCY);

  return (
    <section className="pipeline">
      <div className="pipeline-head">
        <h2>Request path</h2>
        <div className="gauge">
          <span>
            Chromium{" "}
            <strong style={{ color: "var(--text)" }}>
              {busySlots}/{WORKER_CONCURRENCY}
            </strong>{" "}
            workers
          </span>
          <div className="slots">
            {Array.from({ length: WORKER_CONCURRENCY }, (_, index) => (
              <span
                key={index}
                className={`slot${index < busySlots ? " busy" : ""}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="steps">
        {STEPS.map(({ id, label, icon: Icon }) => (
          <div
            key={id}
            className={`step on${id === "chromium" && activeCount > 0 ? " capturing" : ""}`}
          >
            <div
              className="node"
              style={id === "queue" ? { color: "var(--redis)" } : undefined}
            >
              <Icon />
            </div>
            <label>{label}</label>
          </div>
        ))}
      </div>
    </section>
  );
}
