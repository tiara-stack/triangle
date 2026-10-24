import { Fragment } from "react";
import { RegistryContext } from "@effect/atom-react";
import { Hydration, type AtomRegistry } from "effect/reactivity";
import type { AnyRouter } from "@tanstack/react-router";

type StartAtomOptions<TRouter extends AnyRouter> = {
  router: TRouter;
  registry: AtomRegistry.AtomRegistry;
};

type DehydratedAtomState = {
  atomStream?: ReadableStream<Array<Hydration.DehydratedAtom>>;
};

type PushableStream<T> = {
  stream: ReadableStream<T>;
  enqueue: (chunk: T) => void;
  close: () => void;
};

function createPushableStream<T>(): PushableStream<T> {
  let controller: ReadableStreamDefaultController<T>;
  const stream = new ReadableStream<T>({
    start(nextController) {
      controller = nextController;
    },
  });

  return {
    stream,
    enqueue: (chunk) => controller.enqueue(chunk),
    close: () => controller.close(),
  };
}

function setupStartAtomCoreIntegration<TRouter extends AnyRouter>({
  router,
  registry,
}: StartAtomOptions<TRouter>) {
  const originalDehydrate = router.options.dehydrate;
  const originalHydrate = router.options.hydrate;

  if (router.isServer) {
    router.options.dehydrate = async () => {
      const originalState = (await originalDehydrate?.()) ?? {};
      const atomStream = createPushableStream<Array<Hydration.DehydratedAtom>>();

      router.serverSsr!.onRenderFinished(() => {
        const atoms = Hydration.dehydrate(registry);
        if (atoms.length > 0) atomStream.enqueue(atoms);
        atomStream.close();
      });

      return { ...originalState, atomStream: atomStream.stream };
    };
    return;
  }

  router.options.hydrate = async (dehydrated: DehydratedAtomState) => {
    await originalHydrate?.(dehydrated);
    if (!dehydrated.atomStream) return;

    const reader = dehydrated.atomStream.getReader();
    try {
      const { value } = await reader.read();
      if (value) Hydration.hydrate(registry, value);
    } finally {
      reader.releaseLock();
    }
  };
}

export function setupStartAtomIntegration<TRouter extends AnyRouter>(
  options: StartAtomOptions<TRouter>,
) {
  setupStartAtomCoreIntegration(options);

  const OriginalWrap = options.router.options.Wrap || Fragment;
  options.router.options.Wrap = ({ children }) => (
    <RegistryContext.Provider value={options.registry}>
      <OriginalWrap>{children}</OriginalWrap>
    </RegistryContext.Provider>
  );
}
