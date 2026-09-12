"use client";

type TaskCardProps = {
  title: string;
  step: string;
  doingSummary: string;
};

export function TaskCard({ title, step, doingSummary }: TaskCardProps) {
  return (
    <section
      aria-labelledby="task-card-title"
      className="relay-card border-relay-olive/20 bg-relay-accent/50 p-5"
    >
      <p className="text-sm font-medium text-relay-olive">{step}</p>
      <h2
        id="task-card-title"
        className="mt-1 font-serif text-xl text-relay-text"
      >
        {title}
      </h2>
      <p className="relay-support mt-3 text-base" role="status">
        {doingSummary}
      </p>
    </section>
  );
}
