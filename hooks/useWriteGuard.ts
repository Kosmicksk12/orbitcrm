"use client";

import { useCallback } from "react";
import { useShop } from "@/components/shop/ShopContext";
import { useToast } from "@/components/ui/Toaster";

/**
 * Devuelve { readOnly, guard }. Envuelve cualquier acción que escriba datos:
 *
 *   const { readOnly, guard } = useWriteGuard();
 *   <Button disabled={readOnly} onClick={() => guard(handleCreate)} />
 *
 * Si el taller está en solo lectura (prueba vencida, sin suscripción), guard()
 * muestra un aviso y NO ejecuta la acción. Si no, la ejecuta normalmente.
 */
export function useWriteGuard() {
  const { readOnly } = useShop();
  const { toast } = useToast();

  const guard = useCallback(
    <T,>(action: () => T | Promise<T>): Promise<T | undefined> => {
      if (readOnly) {
        toast({
          title: "Tu prueba terminó",
          description: "Suscríbete para volver a crear y editar. Mientras tanto puedes ver todo.",
          variant: "danger",
        });
        return Promise.resolve(undefined);
      }
      return Promise.resolve(action());
    },
    [readOnly, toast]
  );

  return { readOnly, guard };
}
