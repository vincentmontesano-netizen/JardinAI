import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type AdminUser = {
  id: number;
  name: string | null;
  email: string | null;
  role: "user" | "admin";
  credits?: number | null;
};

type AdminUserManageDialogProps = {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdminUserManageDialog({ user, open, onOpenChange }: AdminUserManageDialogProps) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [resetPassword, setResetPassword] = useState(false);
  const [messageSubject, setMessageSubject] = useState("Message de l'équipe Jardinia");
  const [messageBody, setMessageBody] = useState("");

  useEffect(() => {
    if (!user || !open) return;
    setName(user.name ?? "");
    setEmail(user.email ?? "");
    setRole(user.role);
    setResetPassword(false);
    setMessageSubject("Message de l'équipe Jardinia");
    setMessageBody("");
  }, [user, open]);

  const manage = trpc.admin.manageUser.useMutation({
    onSuccess: (result) => {
      void utils.admin.users.invalidate();
      if (result.emailDelivered) {
        toast.success(
          resetPassword
            ? "Utilisateur mis à jour, mot de passe réinitialisé et message envoyé par email"
            : "Utilisateur mis à jour et message envoyé par email"
        );
      } else {
        toast.success("Utilisateur mis à jour — message enregistré in-app");
        if (result.temporaryPassword) {
          toast.message("Email non configuré — mot de passe temporaire", {
            description: result.temporaryPassword,
            duration: 20000,
          });
        } else if (!resetPassword) {
          toast.message("L'utilisateur verra le message dans son tableau de bord");
        }
      }
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const inputClass =
    "w-full px-3 py-2 rounded-lg text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary/40";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gérer l&apos;utilisateur</DialogTitle>
          <DialogDescription>
            Modifiez le profil, réinitialisez le mot de passe et envoyez une notification.
          </DialogDescription>
        </DialogHeader>

        {user && (
          <div className="space-y-4 py-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Nom</span>
              <input type="text" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Email</span>
              <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Rôle</span>
              <select
                className={inputClass}
                value={role}
                onChange={(e) => setRole(e.target.value as "user" | "admin")}
              >
                <option value="user">Utilisateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={resetPassword}
                onChange={(e) => setResetPassword(e.target.checked)}
                className="rounded border-border"
              />
              Réinitialiser le mot de passe (envoyé par email)
            </label>

            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-sm font-medium">Message à l&apos;utilisateur</p>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Sujet</span>
                <input
                  type="text"
                  className={inputClass}
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Contenu</span>
                <textarea
                  rows={4}
                  className={inputClass}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Expliquez la modification ou les prochaines étapes…"
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Le message est enregistré in-app et envoyé par email si Resend est configuré (
                <code className="text-[10px]">RESEND_API_KEY</code>).
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <button type="button" className="btn-outline" onClick={() => onOpenChange(false)}>
            Annuler
          </button>
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            disabled={manage.isPending || !user || !name.trim() || !email.trim() || !messageBody.trim()}
            onClick={() => {
              if (!user) return;
              manage.mutate({
                userId: user.id,
                name: name.trim(),
                email: email.trim(),
                role,
                resetPassword,
                messageSubject: messageSubject.trim(),
                messageBody: messageBody.trim(),
              });
            }}
          >
            {manage.isPending && <Loader2 size={14} className="animate-spin" />}
            Enregistrer et notifier
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
