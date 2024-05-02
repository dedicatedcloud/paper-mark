import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTeam } from "@/context/team-context";
import { useState } from "react";
import { toast } from "sonner";
import { UpgradePlanModal } from "../billing/upgrade-plan-modal";
import { usePlan } from "@/lib/swr/use-billing";
import { useAnalytics } from "@/lib/analytics";
import { mutate } from "swr";
import { Folder } from "@prisma/client";
import { useRouter } from "next/router";

export function AddFolderModal({
  // open,
  // setOpen,
  onAddition,
  isDataroom,
  dataroomId,
  children,
}: {
  // open?: boolean;
  // setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  onAddition?: (folderName: string) => void;
  isDataroom?: boolean;
  dataroomId?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [folderName, setFolderName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);

  const teamInfo = useTeam();
  const { plan } = usePlan();
  const analytics = useAnalytics();

  /** current folder name */
  const currentFolderPath = router.query.name as string[] | undefined;

  const handleSubmit = async (event: any) => {
    event.preventDefault();
    event.stopPropagation();

    if (folderName == "") return;

    setLoading(true);
    const endpointTargetType =
      isDataroom && dataroomId ? `datarooms/${dataroomId}/folders` : "folders";

    try {
      const response = await fetch(
        `/api/teams/${teamInfo?.currentTeam?.id}/${endpointTargetType}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: folderName,
            path: currentFolderPath?.join("/"),
          }),
        },
      );

      if (!response.ok) {
        const { message } = await response.json();
        setLoading(false);
        toast.error(message);
        return;
      }

      const { parentFolderPath } = await response.json();

      analytics.capture("Folder Added", { folderName: folderName });
      toast.success("Folder added successfully! 🎉");

      mutate(
        `/api/teams/${teamInfo?.currentTeam?.id}/${endpointTargetType}?root=true`,
      );
      mutate(`/api/teams/${teamInfo?.currentTeam?.id}/${endpointTargetType}`);
      mutate(
        `/api/teams/${teamInfo?.currentTeam?.id}/${endpointTargetType}${parentFolderPath}`,
      );
    } catch (error) {
      setLoading(false);
      toast.error("Error adding folder. Please try again.");
      return;
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  // If the team is on a free plan, show the upgrade modal
  if (plan && plan.plan === "free") {
    if (children) {
      return (
        <UpgradePlanModal clickedPlan="Pro" trigger={"add_folder_button"}>
          {children}
        </UpgradePlanModal>
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="text-start">
          <DialogTitle>Add Folder</DialogTitle>
          <DialogDescription>You can easily add a folder.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Label htmlFor="folder-name" className="opacity-80">
            Folder Name
          </Label>
          <Input
            id="folder-name"
            placeholder="folder-123"
            className="w-full mt-1 mb-4"
            onChange={(e) => setFolderName(e.target.value)}
          />
          <DialogFooter>
            <Button type="submit" className="w-full h-9">
              Add new folder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
