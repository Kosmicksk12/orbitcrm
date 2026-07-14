"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useShop } from "@/components/shop/ShopContext";
import { useToast } from "@/components/ui/Toaster";
import { Button } from "@/components/ui/Button";
import { Input, Select, FieldWrapper } from "@/components/ui/Field";
import { Card, Badge, Avatar } from "@/components/ui/Primitives";
import { Skeleton } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconTrash, IconUsers } from "@/components/ui/Icons";
import { isValidEmail } from "@/lib/utils";
import type { ShopInvite, ShopMember, ShopRole } from "@/lib/types";

export function TeamSettings() {
  const supabase = createClient();
  const { toast } = useToast();
  const { shopId, isAdmin } = useShop();

  const [members, setMembers] = useState<ShopMember[]>([]);
  const [invites, setInvites] = useState<ShopInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ShopRole>("member");
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting] = useState(false);

  const [removing, setRemoving] = useState<ShopMember | null>(null);

  async function load() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const { data: memberRows } = await supabase
      .from("shop_members")
      .select("shop_id, user_id, role, created_at")
      .eq("shop_id", shopId)
      .order("created_at");

    const userIds = (memberRows ?? []).map((m) => m.user_id);
    const { data: profileRows } = userIds.length
      ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
      : { data: [] };

    const withProfiles: ShopMember[] = (memberRows ?? []).map((m) => {
      const profile = profileRows?.find((p) => p.id === m.user_id);
      return {
        ...m,
        role: m.role as ShopRole,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? "",
      };
    });
    setMembers(withProfiles);

    if (isAdmin) {
      const { data: inviteRows } = await supabase
        .from("shop_invites")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at");
      setInvites((inviteRows ?? []) as ShopInvite[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!isValidEmail(inviteEmail)) {
      setInviteError("Ingresa un correo válido.");
      return;
    }
    setInviteError("");
    setInviting(true);

    const { error } = await supabase.from("shop_invites").insert({
      shop_id: shopId,
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      invited_by: currentUserId,
    });

    setInviting(false);
    if (error) {
      const msg = error.message.includes("duplicate")
        ? "Ese correo ya tiene una invitación pendiente (o ya es parte de otro taller)."
        : error.message;
      toast({ title: "No se pudo invitar", description: msg, variant: "danger" });
      return;
    }

    toast({ title: "Invitación creada", variant: "success" });
    setInviteEmail("");
    load();
  }

  async function handleCancelInvite(inviteId: string) {
    const { error } = await supabase.from("shop_invites").delete().eq("id", inviteId);
    if (error) {
      toast({ title: "No se pudo cancelar", description: error.message, variant: "danger" });
      return;
    }
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
  }

  async function handleRoleChange(member: ShopMember, role: ShopRole) {
    const previous = members;
    setMembers((prev) => prev.map((m) => (m.user_id === member.user_id ? { ...m, role } : m)));
    const { error } = await supabase
      .from("shop_members")
      .update({ role })
      .eq("shop_id", shopId)
      .eq("user_id", member.user_id);
    if (error) {
      setMembers(previous);
      toast({ title: "No se pudo cambiar el rol", description: error.message, variant: "danger" });
    } else {
      toast({ title: "Rol actualizado", variant: "success" });
    }
  }

  async function handleRemove() {
    if (!removing) return;
    const { error } = await supabase
      .from("shop_members")
      .delete()
      .eq("shop_id", shopId)
      .eq("user_id", removing.user_id);
    if (error) {
      toast({ title: "No se pudo quitar", description: error.message, variant: "danger" });
    } else {
      toast({ title: "Miembro removido del taller", variant: "success" });
      setMembers((prev) => prev.filter((m) => m.user_id !== removing.user_id));
    }
    setRemoving(null);
  }

  const adminCount = members.filter((m) => m.role === "admin").length;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2.5">
        <IconUsers width={18} height={18} className="text-accent" />
        <h2 className="font-display text-base font-semibold text-ink dark:text-ink-dark">Equipo</h2>
      </div>
      <p className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">
        {isAdmin
          ? "Invita empleados por correo y administra sus roles."
          : "Estas son las personas con acceso a este taller."}
      </p>

      {loading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-2">
            {members.map((m) => {
              const isSelf = m.user_id === currentUserId;
              const isLastAdmin = m.role === "admin" && adminCount === 1;
              return (
                <li
                  key={m.user_id}
                  className="flex items-center gap-3 rounded-xl border border-line p-3 dark:border-line-dark"
                >
                  <Avatar name={m.full_name || m.email || "?"} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink dark:text-ink-dark">
                      {m.full_name || m.email}
                      {isSelf && <span className="text-ink-muted dark:text-ink-dark-muted"> (tú)</span>}
                    </p>
                    <p className="truncate text-xs text-ink-muted dark:text-ink-dark-muted">{m.email}</p>
                  </div>

                  {isAdmin ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m, e.target.value as ShopRole)}
                        disabled={isLastAdmin}
                        className="h-9 w-32 py-1 text-xs"
                        aria-label={`Rol de ${m.full_name || m.email}`}
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Empleado</option>
                      </Select>
                      <button
                        onClick={() => setRemoving(m)}
                        disabled={isLastAdmin}
                        aria-label={`Quitar a ${m.full_name || m.email}`}
                        className="rounded-lg p-2 text-ink-muted hover:bg-danger-soft hover:text-danger disabled:hidden dark:hover:bg-danger/10"
                      >
                        <IconTrash width={16} height={16} />
                      </button>
                    </div>
                  ) : (
                    <Badge tone={m.role === "admin" ? "accent" : "neutral"}>
                      {m.role === "admin" ? "Admin" : "Empleado"}
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>

          {isAdmin && invites.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted dark:text-ink-dark-muted">
                Invitaciones pendientes
              </p>
              <ul className="space-y-2">
                {invites.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between rounded-xl border border-dashed border-line p-3 dark:border-line-dark"
                  >
                    <div>
                      <p className="text-sm text-ink dark:text-ink-dark">{inv.email}</p>
                      <p className="text-xs text-ink-muted dark:text-ink-dark-muted">
                        Se unirá como {inv.role === "admin" ? "Admin" : "Empleado"} en cuanto se registre
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancelInvite(inv.id)}
                      className="text-xs font-medium text-danger hover:underline"
                    >
                      Cancelar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isAdmin && (
            <form onSubmit={handleInvite} className="mt-5 border-t border-line pt-5 dark:border-line-dark">
              <p className="mb-3 text-sm font-medium text-ink dark:text-ink-dark">Invitar a un empleado</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <FieldWrapper label="Correo" htmlFor="invite-email" error={inviteError}>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="empleado@correo.com"
                      error={!!inviteError}
                    />
                  </FieldWrapper>
                </div>
                <div className="sm:w-40">
                  <FieldWrapper label="Rol" htmlFor="invite-role">
                    <Select
                      id="invite-role"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as ShopRole)}
                    >
                      <option value="member">Empleado</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </FieldWrapper>
                </div>
                <Button type="submit" loading={inviting} className="sm:mb-0.5">
                  Invitar
                </Button>
              </div>
              <p className="mt-2 text-xs text-ink-muted dark:text-ink-dark-muted">
                Dile a esa persona que se registre en OrbitCRM usando exactamente este correo — entrará
                directo a este taller con el rol que elegiste.
              </p>
            </form>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={handleRemove}
        title="Quitar del taller"
        description={`¿Seguro que quieres quitar a ${removing?.full_name || removing?.email} del taller? Perderá acceso de inmediato.`}
        confirmLabel="Quitar"
      />
    </Card>
  );
}
