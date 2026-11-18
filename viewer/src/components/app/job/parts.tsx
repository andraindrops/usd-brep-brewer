import type { Part } from "@/types/model";
import { highlightPart, showParts } from "@/utils/parts";

// prettier-ignore
type Props = {
  parts:    Part[];
  selected: Part[] | null;
};

/** ?job=... with the selection replaced; camera params are kept. */
function href(key?: "component" | "part", value?: string) {
  const q = new URLSearchParams(location.search);
  q.delete("component");
  q.delete("part");
  if (key && value) q.set(key, value);
  return `?${q}`;
}

export function JobParts({ parts, selected }: Props) {
  const components = Map.groupBy(parts, (p) => p.component);
  const on = (p: Part) => !!selected?.includes(p);
  // prettier-ignore
  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l bg-background text-sm">
      <a href={href()} className="m-3 rounded-md border px-3 py-1.5 text-center font-medium hover:bg-accent">
        Show all
      </a>
      {[...components].map(([component, items]) => (
        <details key={component} open={items.some(on)} className="border-t">
          <summary className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-accent">
            <input
              type="checkbox"
              defaultChecked
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => showParts(items, selected, e.target.checked)}
            />
            <a href={href("component", component)} className={`flex-1 truncate ${items.every(on) ? "font-semibold" : ""}`}>
              {component}
            </a>
            <span className="text-xs text-muted-foreground">{items.length}</span>
          </summary>
          {items.map((p) => (
            <a
              key={p.index}
              href={href("part", p.name)}
              onMouseEnter={() => highlightPart(p, true)}
              onMouseLeave={() => highlightPart(p, false)}
              className={`flex items-center gap-2 py-1 pr-3 pl-9 hover:bg-accent ${on(p) ? "font-semibold" : ""}`}
            >
              <span title={p.name} className="flex-1 truncate">
                {p.name}
              </span>
              {p.kind && <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{p.kind}</span>}
              {p.volume !== null && (
                <span className="font-mono text-xs text-muted-foreground">{Number(p.volume.toPrecision(3))} cm³</span>
              )}
            </a>
          ))}
        </details>
      ))}
    </aside>
  );
}
