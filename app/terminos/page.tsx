import type { Metadata } from "next";
import { LegalDoc } from "@/components/marketing/LegalDoc";

export const metadata: Metadata = {
  title: "Términos de servicio",
  description: "Términos de servicio de Danivo CRM.",
};

export default function TerminosPage() {
  return (
    <LegalDoc title="Términos de servicio" updated="[FECHA]">
      <p>
        Estos términos regulan el uso de Danivo CRM (el “Servicio”), operado por{" "}
        <strong>[TU NEGOCIO]</strong>, con domicilio en <strong>[DIRECCIÓN]</strong> y correo de
        contacto <strong>[CORREO DE CONTACTO]</strong>. Al crear una cuenta o usar el Servicio
        aceptas estos términos.
      </p>

      <h2>1. Uso del Servicio</h2>
      <p>
        Puedes usar el Servicio solo para la gestión legítima de tu taller o negocio. Eres
        responsable de la actividad que ocurra bajo tu cuenta y de mantener la confidencialidad de
        tus credenciales. No debes usar el Servicio para actividades ilegales ni intentar vulnerar
        su seguridad.
      </p>

      <h2>2. Cuentas y equipos</h2>
      <p>
        Cada negocio (“taller”) es la unidad de datos. El primer usuario que registra un taller es
        su administrador y puede invitar a otros usuarios con rol de administrador o miembro. Los
        administradores pueden gestionar el equipo y eliminar registros.
      </p>

      <h2>3. Planes y pagos</h2>
      <p>
        El Servicio ofrece un plan gratuito y planes de pago. Los precios, límites y condiciones de
        cada plan se muestran en la página de precios y pueden cambiar con aviso previo razonable.
        Los cobros, cuando apliquen, se procesan a través de <strong>[PROVEEDOR DE PAGOS]</strong>.
        Las políticas de reembolso son: <strong>[POLÍTICA DE REEMBOLSOS]</strong>.
      </p>

      <h2>4. Tus datos</h2>
      <p>
        Los datos que cargas (clientes, órdenes, inventario, fotos, etc.) son tuyos. Nosotros los
        alojamos para prestarte el Servicio. El tratamiento de datos personales se describe en la{" "}
        <strong>Política de privacidad</strong>. Puedes exportar tus datos mientras tu cuenta esté
        activa.
      </p>

      <h2>5. Disponibilidad y cambios</h2>
      <p>
        Hacemos esfuerzos razonables por mantener el Servicio disponible, pero no garantizamos que
        sea ininterrumpido o libre de errores. Podemos modificar o discontinuar funciones; si un
        cambio es relevante te lo comunicaremos.
      </p>

      <h2>6. Limitación de responsabilidad</h2>
      <p>
        En la máxima medida permitida por la ley, <strong>[TU NEGOCIO]</strong> no será responsable
        por daños indirectos, lucro cesante o pérdida de datos derivados del uso o la imposibilidad
        de uso del Servicio. El Servicio se presta “tal cual”.
      </p>

      <h2>7. Terminación</h2>
      <p>
        Puedes cancelar tu cuenta en cualquier momento. Podemos suspender o cancelar cuentas que
        incumplan estos términos. Tras la cancelación podemos eliminar tus datos pasado un periodo
        razonable.
      </p>

      <h2>8. Ley aplicable</h2>
      <p>
        Estos términos se rigen por las leyes de <strong>[JURISDICCIÓN]</strong> y cualquier
        controversia se someterá a sus tribunales competentes.
      </p>

      <h2>9. Contacto</h2>
      <p>
        Para consultas sobre estos términos escribe a <strong>[CORREO DE CONTACTO]</strong>.
      </p>
    </LegalDoc>
  );
}
