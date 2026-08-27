import type { Metadata } from "next";
import { LegalDoc } from "@/components/marketing/LegalDoc";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo Danivo CRM trata los datos personales.",
};

export default function PrivacidadPage() {
  return (
    <LegalDoc title="Política de privacidad" updated="[FECHA]">
      <p>
        Esta política explica cómo <strong>[TU NEGOCIO]</strong> (“nosotros”) trata los datos
        personales al prestar Danivo CRM (el “Servicio”). Responsable del tratamiento:{" "}
        <strong>[TU NEGOCIO]</strong>, <strong>[DIRECCIÓN]</strong>, correo{" "}
        <strong>[CORREO DE CONTACTO]</strong>.
      </p>

      <h2>1. Qué datos tratamos</h2>
      <ul>
        <li>
          <strong>De tu cuenta:</strong> nombre, correo electrónico y contraseña (cifrada).
        </li>
        <li>
          <strong>Que tú cargas:</strong> datos de tus clientes (nombre, teléfono), órdenes de
          servicio, inventario, ventas, gastos, fotos de equipos y mensajes registrados.
        </li>
        <li>
          <strong>Técnicos:</strong> registros de acceso y cookies necesarias para mantener la
          sesión.
        </li>
      </ul>

      <h2>2. Para qué los usamos</h2>
      <ul>
        <li>Prestar y mantener el Servicio y tu cuenta.</li>
        <li>Dar soporte y comunicarnos contigo sobre el Servicio.</li>
        <li>Facturación, cuando uses un plan de pago.</li>
        <li>Seguridad, prevención de fraude y cumplimiento legal.</li>
      </ul>
      <p>
        No vendemos datos personales ni los usamos para publicidad de terceros.
      </p>

      <h2>3. Datos de tus clientes</h2>
      <p>
        Respecto de los datos de tus propios clientes, tú eres el responsable y nosotros actuamos
        como encargados del tratamiento: los procesamos siguiendo tus instrucciones y solo para
        operar el Servicio.
      </p>

      <h2>4. Con quién los compartimos</h2>
      <p>
        Con proveedores que nos ayudan a operar, bajo acuerdos de confidencialidad:{" "}
        <strong>[PROVEEDOR DE HOSTING / BASE DE DATOS]</strong>,{" "}
        <strong>[PROVEEDOR DE PAGOS]</strong> y <strong>[OTROS PROVEEDORES]</strong>. También cuando
        lo exija la ley.
      </p>

      <h2>5. Conservación</h2>
      <p>
        Conservamos tus datos mientras tu cuenta esté activa. Tras la cancelación los eliminamos o
        anonimizamos pasado un periodo razonable, salvo obligación legal de conservarlos.
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes acceder, rectificar, actualizar o eliminar tus datos, y solicitar una copia,
        escribiendo a <strong>[CORREO DE CONTACTO]</strong>. También puedes reclamar ante la
        autoridad de protección de datos de <strong>[JURISDICCIÓN]</strong>.
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas razonables (control de acceso por taller,
        cifrado en tránsito, contraseñas cifradas). Ningún sistema es 100% infalible.
      </p>

      <h2>8. Cambios</h2>
      <p>
        Podemos actualizar esta política; si el cambio es relevante te lo comunicaremos por el
        Servicio o por correo.
      </p>

      <h2>9. Contacto</h2>
      <p>
        Para cualquier consulta sobre privacidad escribe a <strong>[CORREO DE CONTACTO]</strong>.
      </p>
    </LegalDoc>
  );
}
