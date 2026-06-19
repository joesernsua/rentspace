import PageIntro from "../components/PageIntro";
import TenantRequestStatusPanel from "../components/TenantRequestStatusPanel";

export default function TenantDashboardPage() {
  return (
    <PageIntro wide title="Request Status" description="Track every property request and whether it is pending, rejected, or accepted.">
      <TenantRequestStatusPanel />
    </PageIntro>
  );
}
