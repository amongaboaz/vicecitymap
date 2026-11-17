import { ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/site/logo";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4">
      <div className="text-center">
        <LogoMark className="mx-auto size-10" />
        <p className="eyebrow mt-8">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Off the map.</h1>
        <p className="mt-2 text-sm text-muted">This page doesn&apos;t exist — or you don&apos;t have access to it.</p>
        <div className="mt-8 flex justify-center gap-3">
          <ButtonLink href="/map">Open the map</ButtonLink>
          <ButtonLink href="/" variant="outline">
            Home
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
