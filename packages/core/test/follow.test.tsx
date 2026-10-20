// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __reset, emit, follow, followed, useFollow } from "../src/react";

// A fake display: frames run when the test says, at the time it says.
let now = 0;
let queue: { id: number; fn: FrameRequestCallback }[] = [];
let nextId = 1;
/** Move the clock to `t` and run the frames that were waiting. */
function frame(t: number) {
  now = t;
  const due = queue;
  queue = [];
  for (const f of due) f.fn(t);
}
/** One frame every `step` ms up to `until`. */
function frames(until: number, step = 5) {
  for (let t = now + step; t <= until; t += step) frame(t);
}

beforeEach(() => {
  now = 0;
  queue = [];
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
    queue.push({ id: nextId, fn });
    return nextId++;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    queue = queue.filter((f) => f.id !== id);
  });
});
afterEach(() => {
  cleanup();
  __reset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("follow: live values", () => {
  it("paints the start at once, then glides to each message over the gap since the last one", () => {
    const seen: number[] = [];
    follow("hud:rpm", (v) => seen.push(v), { start: 0.2 });
    expect(seen).toEqual([0.2]);

    frame(100);
    emit("hud:rpm", 0.5); // first message after a pause: the longest glide, 60 ms
    frame(130);
    expect(seen.at(-1)).toBeCloseTo(0.35, 6); // half way
    frame(160);
    expect(seen.at(-1)).toBe(0.5);
    // settled: no frames are asked for
    expect(queue).toHaveLength(0);

    // a steady stream every 33 ms: each glide lasts 33 ms, one even motion
    now = 193;
    emit("hud:rpm", 0.6);
    frame(226);
    now = 226;
    emit("hud:rpm", 0.7);
    frame(258);
    expect(seen.at(-1)).toBeLessThan(0.7);
    frame(259);
    expect(seen.at(-1)).toBe(0.7);
  });

  it("repaints nothing while the value is still, and stops asking for frames", () => {
    const paint = vi.fn();
    follow("a", paint, { start: 1 });
    frames(500);
    expect(paint).toHaveBeenCalledTimes(1);
    emit("a", 1); // the same value: nothing moves
    frames(600);
    expect(paint).toHaveBeenCalledTimes(1);
    expect(queue).toHaveLength(0);
  });

  it("only repaints when it moved more than epsilon, and always lands exactly", () => {
    const seen: number[] = [];
    follow("a", (v) => seen.push(v), { start: 0, epsilon: 0.5 });
    now = 1000;
    emit("a", 1);
    frames(1060, 5); // 12 frames over a 60 ms glide of 1: only moves past 0.5 count
    expect(seen).toEqual([0, expect.closeTo(0.583, 2), 1]);
  });

  it("angles take the short way round and stay in 0–360", () => {
    const seen: number[] = [];
    follow("h", (v) => seen.push(v), { kind: "angle", start: 350, epsilon: 0.01 });
    now = 1000;
    emit("h", 10);
    frame(1030);
    expect(seen.at(-1)).toBeCloseTo(0, 6); // half way from 350 to 10 is 0, not 180
    frame(1060);
    expect(seen.at(-1)).toBe(10);
    emit("h", -90);
    frame(1200);
    expect(seen.at(-1)).toBe(270);
  });

  it("never moves backwards when a frame's time is before the message", () => {
    const seen: number[] = [];
    follow("a", (v) => seen.push(v), { start: 0 });
    now = 1000;
    emit("a", 1);
    frame(995); // the frame began before the message arrived
    expect(seen.every((v) => v >= 0)).toBe(true);
  });

  it("without a start, shows the first message as it is", () => {
    const seen: number[] = [];
    follow("a", (v) => seen.push(v));
    expect(seen).toEqual([]);
    emit("a", 42);
    expect(seen).toEqual([42]);
  });

  it("starts from the latest value received, even one that came while nothing followed", () => {
    const stop = follow("a", () => {}, { start: 0 });
    stop();
    emit("a", 7); // nobody painting
    expect(followed("a")).toBe(7);
    const seen: number[] = [];
    follow("a", (v) => seen.push(v), { start: 0 });
    expect(seen).toEqual([7]);
  });

  it("stop() ends the glide and the subscription", () => {
    const paint = vi.fn();
    const stop = follow("a", paint, { start: 0 });
    now = 100;
    emit("a", 1);
    stop();
    frames(300);
    emit("a", 2);
    frames(400);
    expect(paint).toHaveBeenCalledTimes(1);
  });

  it("ignores what is not a number", () => {
    const paint = vi.fn();
    follow("a", paint, { start: 0 });
    emit("a", "x" as never);
    emit("a", null as never);
    frames(200);
    expect(paint).toHaveBeenCalledTimes(1);
  });
});

describe("useFollow", () => {
  function Gauge({ start }: { start: number }) {
    const el = useRef<HTMLSpanElement>(null);
    useFollow(
      "hud:speed",
      (v) => {
        if (el.current) el.current.textContent = String(Math.round(v));
      },
      { start },
    );
    return <span data-testid="speed" ref={el} />;
  }

  it("writes through a ref without rendering, from the first frame", () => {
    let renders = 0;
    function Counted() {
      renders++;
      return <Gauge start={10} />;
    }
    const { getByTestId } = render(<Counted />);
    expect(getByTestId("speed").textContent).toBe("10");
    act(() => {
      now = 100;
      emit("hud:speed", 30);
      frame(130);
    });
    expect(getByTestId("speed").textContent).toBe("20");
    act(() => frame(160));
    expect(getByTestId("speed").textContent).toBe("30");
    expect(renders).toBe(1);
  });

  it("a new paint function on re-render doesn't restart the glide; unmounting stops it", () => {
    const { getByTestId, rerender, unmount } = render(<Gauge start={0} />);
    act(() => {
      now = 100;
      emit("hud:speed", 60);
      frame(130);
    });
    rerender(<Gauge start={999} />); // start is read once
    act(() => frame(145));
    expect(getByTestId("speed").textContent).toBe("45");
    unmount();
    expect(queue).toHaveLength(0);
  });
});
