"use client";

import { CameraIcon, CpuIcon, MonitorIcon, RedisIcon, ServerIcon } from "./icons";
import { NODE, Packets, usePipelineFx } from "./pipeline-fx";

const WORKER_CONCURRENCY = 3;

const STEPS = [
  { id: NODE.browser, label: <>Browser</>, Icon: MonitorIcon },
  { id: NODE.api, label: <>Express<br />API</>, Icon: ServerIcon },
  { id: NODE.queue, label: <>Redis /<br />BullMQ</>, Icon: RedisIcon, redis: true },
  { id: NODE.worker, label: <>Worker</>, Icon: CpuIcon },
  { id: NODE.chromium, label: <>Chromium</>, Icon: CameraIcon },
] as const;

type Props = {
  activeCount: number;
};

export function Pipeline({ activeCount }: Props) {
  const { registerNode, stepsRef, flashes } = usePipelineFx();
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

      <div className="steps" ref={stepsRef}>
        {STEPS.map(({ id, label, Icon, ...rest }) => (
          <div
            key={id}
            className={`step on${
              id === NODE.chromium && activeCount > 0 ? " capturing" : ""
            }`}
          >
            <div
              className="node"
              ref={(element) => registerNode(id, element)}
              style={"redis" in rest ? { color: "var(--redis)" } : undefined}
            >
              <Icon />
              {flashes
                .filter((flash) => flash.index === id)
                .map((flash) => (
                  <span
                    key={flash.id}
                    className={
                      "node-flash" +
                      (flash.variant ? ` ${flash.variant}` : "") +
                      (flash.show ? " show" : "")
                    }
                  >
                    {flash.text}
                  </span>
                ))}
            </div>
            <label>{label}</label>
          </div>
        ))}

        <Packets />
      </div>
    </section>
  );
}
