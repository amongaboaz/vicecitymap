import { Check, Minus } from "lucide-react";
import { planFeatures } from "@/lib/plans";

function Cell({ value, accent }: { value: boolean | string; accent?: boolean }) {
  if (value === true) return <Check aria-label="Included" className={accent ? "mx-auto size-4 text-neon" : "mx-auto size-4 text-fg"} />;
  if (value === false) return <Minus aria-label="Not included" className="mx-auto size-4 text-subtle" />;
  return <span className={accent ? "text-neon" : "text-muted"}>{value}</span>;
}

export function PlanComparison() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-ink-900/70">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Free versus Premium features</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="px-4 py-4 font-medium text-muted sm:px-6">
              Feature
            </th>
            <th scope="col" className="w-24 px-2 py-4 text-center font-medium text-fg sm:w-40">
              Free
            </th>
            <th scope="col" className="w-28 bg-neon/[0.04] px-2 py-4 text-center font-medium text-neon sm:w-44">
              Premium
            </th>
          </tr>
        </thead>
        <tbody>
          {planFeatures.map((f) => (
            <tr key={f.label} className="border-b border-line last:border-0">
              <th scope="row" className="px-4 py-3.5 font-normal text-fg/90 sm:px-6">
                {f.label}
              </th>
              <td className="px-2 py-3.5 text-center text-xs sm:text-sm">
                <Cell value={f.free} />
              </td>
              <td className="bg-neon/[0.04] px-2 py-3.5 text-center text-xs sm:text-sm">
                <Cell value={f.premium} accent />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
