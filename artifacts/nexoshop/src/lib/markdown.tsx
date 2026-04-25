import { Fragment, type ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push(text.slice(last, m.index));
    if (m[1]) tokens.push(<strong key={`${keyPrefix}-b-${i}`} className="font-bold text-white">{m[2]}</strong>);
    else if (m[3]) tokens.push(<em key={`${keyPrefix}-i-${i}`} className="italic text-zinc-100">{m[4]}</em>);
    else if (m[5]) tokens.push(<code key={`${keyPrefix}-c-${i}`} className="px-1.5 py-0.5 rounded bg-white/10 text-purple-200 text-[0.9em] font-mono">{m[6]}</code>);
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
            <ul key={bi} className="list-disc pl-5 space-y-1 my-2">
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^\s*[-•]\s+/, ""), `${bi}-${li}`)}</li>
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
