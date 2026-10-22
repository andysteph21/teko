"use client";

// A-05 / AM-05 — page Finance : commission + clôture en bandeau, relevés du
// jour métier, paiements récents. La table défile horizontalement < lg.

import { PageHeader } from "../shell/page-header";
import { useAdminProfile } from "../shell/use-admin-profile";
import { useSession } from "../shell/use-session";
import { businessDayLabel, businessDayOf } from "./business-day";
import { CommissionBanner } from "./commission-banner";
import { DailyCloseButton } from "./daily-close-button";
import { ManualReceipts } from "./manual-receipts";
import { PaymentsTable } from "./payments-table";
import { StatementsTable } from "./statements-table";

export function FinancePage() {
  const { session } = useSession();
  const { adminRole } = useAdminProfile(session?.user.id);
  const today = businessDayOf(new Date());

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Finance">
        <span className="hidden text-xs text-neutral-500 sm:inline">
          Journée du {businessDayLabel(today)} (04 h → 04 h, Africa/Libreville)
        </span>
      </PageHeader>
      <div className="flex flex-col gap-3 p-4 lg:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
          <div className="min-w-0 flex-1">
            <CommissionBanner adminRole={adminRole} />
          </div>
          <div className="flex items-center rounded-[14px] border border-neutral-200 bg-neutral-0 p-4">
            <DailyCloseButton adminRole={adminRole} />
          </div>
        </div>
        {adminRole === "finance" || adminRole === "superadmin" ? <StatementsTable /> : null}
        {session?.user.id && ["ops", "finance", "superadmin"].includes(adminRole ?? "") ? (
          <ManualReceipts userId={session.user.id} adminRole={adminRole} />
        ) : null}
        {adminRole === "finance" || adminRole === "superadmin" ? <PaymentsTable /> : null}
      </div>
    </div>
  );
}
