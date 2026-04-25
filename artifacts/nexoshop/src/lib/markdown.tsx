import { Fragment, type ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))|((https?:\/\/[^\s)]+))/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push(text.slice(last, m.index));
    if (m[1]) {
      tokens.push(
        <strong key={`${keyPrefix}-b-${i}`} className="font-bold text-white">
          {m[2]}
        </strong>
      );
    } else if (m[3]) {
      tokens.push(
        <em key={`${keyPrefix}-i-${i}`} className="italic text-zinc-100">
          {m[4]}
        </em>
      );
    } else if (m[5]) {
      tokens.push(
        <code
          key={`${keyPrefix}-c-${i}`}
          className="px-1.5 py-0.5 rounded bg-white/10 text-primary text-[0.9em] font-mono"
        >
          {m[6]}
        </code>
      );
    } else if (m[7]) {
      tokens.push(
        <a
          key={`${keyPrefix}-l-${i}`}
          href={m[9]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-secondary underline underline-offset-2 break-all"
        >
          {m[8]}
        </a>
      );
    } else if (m[10]) {
      tokens.push(
        <a
          key={`${keyPrefix}-u-${i}`}
          href={m[11]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-secondary underline underline-offset-2 break-all"
        >
          {m[11]}
        </a>
      );
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) tokens.push(text.slice(last));
  return tokens;
}

export function Markdown({ source, className = "" }: { source: string; className?: string }) {
  const safe = (source ?? "").replace(/\r\n/g, "\n");
  const blocks = safe.split(/\n{2,}/);
  return (
    <div className={className}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.length > 0);
        if (lines.length === 0) return null;
        const isList = lines.every((l) => /^\s*[-•]\s+/.test(l));
        if (isList) {
          return (
            <ul key={bi} className="space-y-2 my-3">
              {lines.map((l, li) => (
                <li
                  key={li}
                  className="flex items-start gap-2 text-foreground/90 leading-relaxed"
                >
                  <span
                    className="mt-[3px] inline-flex w-4 h-4 items-center justify-center rounded-[5px] bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold shrink-0"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span className="flex-1 min-w-0">
                    {renderInline(l.replace(/^\s*[-•]\s+/, ""), `${bi}-${li}`)}
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi} className="my-2 leading-relaxed">
            {lines.map((l, li) => (
              <Fragment key={li}>
                {renderInline(l, `${bi}-${li}`)}
                {li < lines.length - 1 ? <br /> : null}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
