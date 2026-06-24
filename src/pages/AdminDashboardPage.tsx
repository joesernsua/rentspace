import { type FormEvent, useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { Link, useNavigate } from "react-router";
import AdminRoleBadge, { getUserRoles } from "../components/AdminRoleBadge";
import StatusBadge from "../components/StatusBadge";
import { auth } from "../config/firebase";
import { startAdminUserConversation } from "../services/chatService";
import {
  addAdminInviteAsBoss,
  approveRentalRequestAsAdmin,
  deleteRentalRequestAsAdmin,
  deleteAdminInviteAsBoss,
  getAllConversationsAsAdmin,
  getAllPaymentHistory,
  getAllAdminInvitesAsAdmin,
  getAllProperties,
  getAllRentalRequests,
  getAllUsers,
  normalizeAdminInviteEmail,
  updatePropertyStatusAsAdmin,
  updateRentalRequestStatusAsAdmin,
  updateUserAccountStatusAsAdmin,
  type AdminInvite,
  type AdminEmployeeRole,
} from "../services/adminService";
import { getAllOwnerSupportTicketsAsAdmin, replyToOwnerSupportTicketAsAdmin } from "../services/ownerSupportService";
import { getAllReportedIssuesAsAdmin, replyToReportedIssueAsAdmin } from "../services/reportedIssueService";
import type { Conversation } from "../types/Chat";
import type { OwnerSupportTicket } from "../types/OwnerSupportTicket";
import type { PaymentHistory } from "../types/PaymentHistory";
import type { Property, PropertyStatus } from "../types/Property";
import { reportedIssueStatuses, type ReportedIssue, type ReportedIssueStatus } from "../types/ReportedIssue";
import type { RentalRequest, RentalRequestStatus } from "../types/RentalRequest";
import type { AppUser } from "../types/User";

function formatDate(
  value: AppUser["createdAt"] | RentalRequest["createdAt"] | PaymentHistory["paidAt"] | OwnerSupportTicket["createdAt"],
) {
  return value ? value.toDate().toLocaleDateString() : "-";
}

function formatPrice(
  value: Property["price"] | RentalRequest["propertyPrice"] | PaymentHistory["totalPaid"],
) {
  return typeof value === "number" ? `RM ${value.toLocaleString()}` : "-";
}

function formatContractYears(years = 1) {
  return `${years} year${years === 1 ? "" : "s"}`;
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function getDisplayedPropertyStatus(property: Property, requests: RentalRequest[]) {
  const hasApprovedRental = requests.some(
    (request) =>
      request.propertyId === property.id &&
      request.ownerId === property.ownerId &&
      request.status === "approved",
  );

  return hasApprovedRental ? "rented" : property.status;
}

function getTimestampDate(
  value:
    | AppUser["createdAt"]
    | RentalRequest["createdAt"]
    | PaymentHistory["paidAt"]
    | PaymentHistory["createdAt"],
) {
  return value?.toDate();
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getShortDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeExcelCell(value: unknown) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

type ExcelSheet = {
  name: string;
  title: string;
  headers: string[];
  rows: Array<Array<unknown>>;
};

function getExcelCellType(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? "Number" : "String";
}

function buildExcelRow(cells: Array<unknown>, styleId?: string) {
  return `<Row>${cells
    .map(
      (cell) =>
        `<Cell${styleId ? ` ss:StyleID="${styleId}"` : ""}><Data ss:Type="${getExcelCellType(cell)}">${escapeExcelCell(cell)}</Data></Cell>`,
    )
    .join("")}</Row>`;
}

function buildExcelWorksheet(sheet: ExcelSheet) {
  return `
    <Worksheet ss:Name="${escapeExcelCell(sheet.name)}">
      <Table>
        <Column ss:AutoFitWidth="1" ss:Width="170" />
        <Column ss:AutoFitWidth="1" ss:Width="180" />
        <Column ss:AutoFitWidth="1" ss:Width="190" />
        <Column ss:AutoFitWidth="1" ss:Width="170" />
        <Column ss:AutoFitWidth="1" ss:Width="120" />
        <Column ss:AutoFitWidth="1" ss:Width="120" />
        <Column ss:AutoFitWidth="1" ss:Width="180" />
        <Column ss:AutoFitWidth="1" ss:Width="130" />
        <Column ss:AutoFitWidth="1" ss:Width="130" />
        ${buildExcelRow([sheet.title], "Title")}
        ${buildExcelRow(sheet.headers, "Header")}
        ${sheet.rows
          .map((row, index) => buildExcelRow(row, index % 2 === 0 ? "EvenRow" : "OddRow"))
          .join("")}
      </Table>
      <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
        <FreezePanes />
        <FrozenNoSplit />
        <SplitHorizontal>2</SplitHorizontal>
        <TopRowBottomPane>2</TopRowBottomPane>
        <ActivePane>2</ActivePane>
      </WorksheetOptions>
    </Worksheet>
  `;
}

function buildExcelWorkbook(sheets: ExcelSheet[]) {
  return `
    <?xml version="1.0"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook
      xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:html="http://www.w3.org/TR/REC-html40">
      <Styles>
        <Style ss:ID="Title">
          <Font ss:Bold="1" ss:Size="14" ss:Color="#FFFFFF" />
          <Interior ss:Color="#111827" ss:Pattern="Solid" />
          <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A" />
          </Borders>
        </Style>
        <Style ss:ID="Header">
          <Font ss:Bold="1" ss:Color="#FFFFFF" />
          <Interior ss:Color="#2563EB" ss:Pattern="Solid" />
          <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1E3A8A" />
            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#93C5FD" />
            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#93C5FD" />
            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#93C5FD" />
          </Borders>
        </Style>
        <Style ss:ID="EvenRow">
          <Interior ss:Color="#EFF6FF" ss:Pattern="Solid" />
          <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE" />
          </Borders>
        </Style>
        <Style ss:ID="OddRow">
          <Interior ss:Color="#FFFFFF" ss:Pattern="Solid" />
          <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DBEAFE" />
          </Borders>
        </Style>
      </Styles>
      ${sheets.map(buildExcelWorksheet).join("")}
    </Workbook>
  `;
}

const navItems = [
  { id: "dashboard", label: "Overview", icon: "O", detail: "Platform summary" },
  { id: "employees", label: "Employees", icon: "E", detail: "Staff list" },
  { id: "users", label: "Users", icon: "U", detail: "Account roles" },
  { id: "properties", label: "Properties", icon: "P", detail: "Listings control" },
  { id: "rental-requests", label: "Requests", icon: "R", detail: "Tenant demand" },
  { id: "payments", label: "Payments", icon: "$", detail: "Paid history" },
  { id: "reports", label: "Reports", icon: "!", detail: "Issue tickets" },
  { id: "messages", label: "Messages", icon: "M", detail: "Issues and chats" },
];

const bossEmail = "joesernsua@gmail.com";

const employeeRoleOptions: Array<{
  id: AdminEmployeeRole;
  label: string;
  access: string;
  description: string;
}> = [
  {
    id: "manager",
    label: "Manager",
    access: "Users, Properties, Requests, Payments",
    description: "For senior staff who can monitor most admin records.",
  },
  {
    id: "property-staff",
    label: "Property staff",
    access: "Properties, Requests",
    description: "For staff who handle listings and rental request follow-up.",
  },
  {
    id: "finance-staff",
    label: "Finance staff",
    access: "Requests, Payments",
    description: "For staff who review billing and payment records.",
  },
];

const employeeRoleAccess: Record<AdminEmployeeRole, string[]> = {
  manager: ["dashboard", "users", "properties", "rental-requests", "payments", "reports", "messages"],
  "property-staff": ["dashboard", "properties", "rental-requests"],
  "finance-staff": ["dashboard", "rental-requests", "payments"],
};

function getEmployeeRoleLabel(role?: string) {
  return employeeRoleOptions.find((option) => option.id === role)?.label ?? "Manager";
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const currentAdminEmail = auth.currentUser?.email?.toLowerCase() ?? "";
  const isBossAccount = currentAdminEmail === bossEmail;
  const [activeSection, setActiveSection] = useState("dashboard");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [reports, setReports] = useState<ReportedIssue[]>([]);
  const [ownerSupportTickets, setOwnerSupportTickets] = useState<OwnerSupportTicket[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [adminInvites, setAdminInvites] = useState<AdminInvite[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [ownerSupportLoading, setOwnerSupportLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [invitesLoading, setInvitesLoading] = useState(isBossAccount);
  const [usersError, setUsersError] = useState("");
  const [propertiesError, setPropertiesError] = useState("");
  const [requestsError, setRequestsError] = useState("");
  const [paymentsError, setPaymentsError] = useState("");
  const [reportsError, setReportsError] = useState("");
  const [ownerSupportError, setOwnerSupportError] = useState("");
  const [messagesError, setMessagesError] = useState("");
  const [invitesError, setInvitesError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [adminMessageText, setAdminMessageText] = useState("Hi, admin is contacting you about your RentSpace account.");
  const [selectedReport, setSelectedReport] = useState<ReportedIssue | null>(null);
  const [reportReply, setReportReply] = useState("");
  const [reportStatus, setReportStatus] = useState<ReportedIssueStatus>("reviewing");
  const [selectedOwnerSupportTicket, setSelectedOwnerSupportTicket] = useState<OwnerSupportTicket | null>(null);
  const [ownerSupportReply, setOwnerSupportReply] = useState("");
  const [ownerSupportStatus, setOwnerSupportStatus] = useState<ReportedIssueStatus>("reviewing");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [pendingEmployeeEmail, setPendingEmployeeEmail] = useState("");
  const [selectedEmployeeRole, setSelectedEmployeeRole] = useState<AdminEmployeeRole>("manager");
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [addingEmployee, setAddingEmployee] = useState(false);

  useEffect(() => {
    getAllUsers()
      .then((items) => {
        setUsers(items);
      })
      .catch(() => setUsersError("Unable to load users."))
      .finally(() => setUsersLoading(false));
    getAllProperties()
      .then(setProperties)
      .catch(() => setPropertiesError("Unable to load properties."))
      .finally(() => setPropertiesLoading(false));
    getAllRentalRequests()
      .then(setRequests)
      .catch(() => setRequestsError("Unable to load rental requests."))
      .finally(() => setRequestsLoading(false));
    getAllPaymentHistory()
      .then((items) =>
        setPayments(
          items.sort(
            (first, second) =>
              (second.paidAt?.toMillis() ?? second.createdAt?.toMillis() ?? 0) -
              (first.paidAt?.toMillis() ?? first.createdAt?.toMillis() ?? 0),
          ),
        ),
      )
      .catch(() => setPaymentsError("Unable to load payment history."))
      .finally(() => setPaymentsLoading(false));
    getAllReportedIssuesAsAdmin()
      .then(setReports)
      .catch(() => setReportsError("Unable to load report tickets."))
      .finally(() => setReportsLoading(false));
    getAllOwnerSupportTicketsAsAdmin()
      .then(setOwnerSupportTickets)
      .catch(() => setOwnerSupportError("Unable to load owner support tickets."))
      .finally(() => setOwnerSupportLoading(false));
    getAllConversationsAsAdmin()
      .then((items) =>
        setConversations(
          items.sort(
            (first, second) =>
              (second.lastMessageAt?.toMillis() ?? second.updatedAt?.toMillis() ?? 0) -
              (first.lastMessageAt?.toMillis() ?? first.updatedAt?.toMillis() ?? 0),
          ),
        ),
      )
      .catch(() => setMessagesError("Unable to load messages."))
      .finally(() => setMessagesLoading(false));
  }, []);

  useEffect(() => {
    if (!isBossAccount) {
      setAdminInvites([]);
      setInvitesLoading(false);
      return;
    }

    setInvitesLoading(true);
    getAllAdminInvitesAsAdmin()
      .then((items) =>
        setAdminInvites(
          items.sort((first, second) => first.email.localeCompare(second.email)),
        ),
      )
      .catch(() => setInvitesError("Unable to load employee invites."))
      .finally(() => setInvitesLoading(false));
  }, [isBossAccount]);

  const handleDeleteRequest = async (request: RentalRequest) => {
    if (!window.confirm(`Delete request for "${request.propertyTitle}"? This cannot be undone.`)) return;
    setDeletingId(request.id);
    setRequestsError("");
    try {
      await deleteRentalRequestAsAdmin(request.id);
      setRequests((items) => items.filter((item) => item.id !== request.id));
    } catch {
      setRequestsError("Unable to delete the rental request.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRejectRequest = async (request: RentalRequest) => {
    setUpdatingId(request.id);
    setRequestsError("");
    try {
      await updateRentalRequestStatusAsAdmin(request.id, "rejected");
      setRequests((items) =>
        items.map((item) =>
          item.id === request.id ? { ...item, status: "rejected" as RentalRequestStatus } : item,
        ),
      );
    } catch {
      setRequestsError("Unable to reject the rental request.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApproveRequest = async (request: RentalRequest) => {
    setUpdatingId(request.id);
    setRequestsError("");
    try {
      await approveRentalRequestAsAdmin(request);
      const monthlyRent = request.payment?.monthlyRent ?? request.propertyPrice;
      const rentDeposit = request.payment?.rentDeposit ?? monthlyRent;
      const utilityDeposit = request.payment?.utilityDeposit ?? 0;
      setRequests((items) =>
        items.map((item) =>
          item.id === request.id
            ? {
                ...item,
                status: "approved" as RentalRequestStatus,
                payment: {
                  rentDeposit,
                  utilityDeposit,
                  monthlyRent,
                  totalDue: rentDeposit + utilityDeposit + monthlyRent,
                  status: request.payment?.status ?? "unpaid",
                  ...(request.payment?.paidAt ? { paidAt: request.payment.paidAt } : {}),
                  ...(request.payment?.monthlyUtilities ? { monthlyUtilities: request.payment.monthlyUtilities } : {}),
                },
              }
            : item,
        ),
      );
    } catch {
      setRequestsError("Unable to approve the rental request.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePropertyStatusChange = async (
    property: Property,
    status: PropertyStatus,
  ) => {
    setUpdatingId(property.id);
    setPropertiesError("");
    try {
      await updatePropertyStatusAsAdmin(property.id, status);
      setProperties((items) =>
        items.map((item) => (item.id === property.id ? { ...item, status } : item)),
      );
    } catch {
      setPropertiesError("Unable to update the property status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUserAccountStatusChange = async (
    user: AppUser,
    accountStatus: NonNullable<AppUser["accountStatus"]>,
  ) => {
    setUpdatingId(user.uid);
    setUsersError("");
    try {
      await updateUserAccountStatusAsAdmin(user.uid, accountStatus);
      setUsers((items) =>
        items.map((item) => (item.uid === user.uid ? { ...item, accountStatus } : item)),
      );
    } catch {
      setUsersError("Unable to update the user account status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAdminMessageUser = async (user: AppUser) => {
    const currentAdmin = auth.currentUser;
    if (!currentAdmin) return;
    const userRoles = getUserRoles(user);
    const userRole = userRoles.includes("owner") ? "owner" : "tenant";
    const conversationType = userRole === "owner" ? "admin-owner" : "admin-tenant";

    setUpdatingId(user.uid);
    setMessagesError("");
    try {
      const conversationId = await startAdminUserConversation({
        adminId: currentAdmin.uid,
        adminName: currentAdmin.displayName || currentAdmin.email || "Admin",
        userId: user.uid,
        userName: user.name || user.displayName || user.email,
        userEmail: user.email,
        userRole,
        message: adminMessageText.trim(),
      });
      navigate(`/chat?type=${conversationType}&conversation=${conversationId}`);
    } catch {
      setMessagesError("Unable to start an admin message with this user.");
    } finally {
      setUpdatingId(null);
    }
  };

  const openReportReply = (report: ReportedIssue) => {
    setSelectedReport(report);
    setReportStatus(report.status === "open" ? "reviewing" : report.status);
    setReportReply(report.adminReply ?? "");
    setReportsError("");
  };

  const handleReportReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedReport) return;

    setUpdatingId(selectedReport.id);
    setReportsError("");
    try {
      await replyToReportedIssueAsAdmin(
        selectedReport.id,
        reportStatus,
        reportReply.trim(),
        auth.currentUser?.uid ?? "admin",
      );
      setReports((items) =>
        items.map((item) =>
          item.id === selectedReport.id
            ? {
                ...item,
                status: reportStatus,
                adminReply: reportReply.trim(),
              }
            : item,
        ),
      );
      setSelectedReport(null);
      setReportReply("");
    } catch {
      setReportsError("Unable to reply to the report ticket.");
    } finally {
      setUpdatingId(null);
    }
  };

  const openOwnerSupportReply = (ticket: OwnerSupportTicket) => {
    setSelectedOwnerSupportTicket(ticket);
    setOwnerSupportStatus(ticket.status === "open" ? "reviewing" : ticket.status);
    setOwnerSupportReply(ticket.adminReply ?? "");
    setOwnerSupportError("");
  };

  const handleOwnerSupportReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOwnerSupportTicket) return;

    setUpdatingId(selectedOwnerSupportTicket.id);
    setOwnerSupportError("");
    try {
      await replyToOwnerSupportTicketAsAdmin(
        selectedOwnerSupportTicket.id,
        ownerSupportStatus,
        ownerSupportReply.trim(),
        auth.currentUser?.uid ?? "admin",
      );
      setOwnerSupportTickets((items) =>
        items.map((item) =>
          item.id === selectedOwnerSupportTicket.id
            ? {
                ...item,
                status: ownerSupportStatus,
                adminReply: ownerSupportReply.trim(),
              }
            : item,
        ),
      );
      setSelectedOwnerSupportTicket(null);
      setOwnerSupportReply("");
    } catch {
      setOwnerSupportError("Unable to reply to the owner support ticket.");
    } finally {
      setUpdatingId(null);
    }
  };

  const validateEmployeeEmail = (email: string) => {
    const normalizedEmail = normalizeAdminInviteEmail(email);

    if (!normalizedEmail) {
      setInvitesError("Please enter an employee email.");
      return null;
    }
    if (normalizedEmail === bossEmail) {
      setInvitesError("Boss account is already the main admin.");
      return null;
    }
    if (employees.some((employee) => employee.email.toLowerCase() === normalizedEmail)) {
      setInvitesError("This employee already has an admin account.");
      return null;
    }

    return normalizedEmail;
  };

  const handleAddEmployee = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = validateEmployeeEmail(employeeEmail);
    if (!normalizedEmail) return;

    setInvitesError("");
    setPendingEmployeeEmail(normalizedEmail);
    setSelectedEmployeeRole("manager");
    setIsRoleDialogOpen(true);
  };

  const handleConfirmEmployeeInvite = async () => {
    const normalizedEmail = validateEmployeeEmail(pendingEmployeeEmail);
    const currentAdmin = auth.currentUser;

    if (!currentAdmin || !normalizedEmail) return;

    setAddingEmployee(true);
    setInvitesError("");
    try {
      await addAdminInviteAsBoss(normalizedEmail, currentAdmin.uid, selectedEmployeeRole);
      setAdminInvites((items) => {
        const nextInvite: AdminInvite = {
          id: normalizedEmail,
          email: normalizedEmail,
          employeeRole: selectedEmployeeRole,
          status: "invited",
          createdBy: currentAdmin.uid,
        };
        const withoutDuplicate = items.filter((item) => item.email !== normalizedEmail);
        return [...withoutDuplicate, nextInvite].sort((first, second) =>
          first.email.localeCompare(second.email),
        );
      });
      setEmployeeEmail("");
      setPendingEmployeeEmail("");
      setIsRoleDialogOpen(false);
    } catch {
      setInvitesError("Unable to add employee email.");
    } finally {
      setAddingEmployee(false);
    }
  };

  const handleDeleteInvite = async (invite: AdminInvite) => {
    if (!window.confirm(`Remove invite for "${invite.email}"?`)) return;
    setDeletingId(invite.id);
    setInvitesError("");
    try {
      await deleteAdminInviteAsBoss(invite.email);
      setAdminInvites((items) => items.filter((item) => item.id !== invite.id));
    } catch {
      setInvitesError("Unable to remove employee invite.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdminLogout = async () => {
    await signOut(auth);
    navigate("/admin-login", { replace: true });
  };

  const handleSidebarNavigation = (sectionId: string) => {
    setActiveSection(sectionId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExportData = () => {
    const exportedAt = new Date().toISOString();
    const workbook = buildExcelWorkbook([
      {
        name: "Users",
        title: "Users",
        headers: ["UID", "Name", "Email", "Roles", "Phone", "Created"],
        rows: users.map((user) => [
            user.uid,
            user.name || user.displayName || "-",
            user.email,
            getUserRoles(user).join(", "),
            user.phone || "-",
            formatDate(user.createdAt),
          ]),
      },
      {
        name: "Employees",
        title: "Employees",
        headers: ["UID", "Name", "Email", "Roles", "Phone", "Created"],
        rows: employees.map((employee) => [
            employee.uid,
            employee.name || employee.displayName || "-",
            employee.email,
            getUserRoles(employee).join(", "),
            employee.phone || "-",
            formatDate(employee.createdAt),
          ]),
      },
      {
        name: "Employee Invites",
        title: "Employee Invites",
        headers: ["Email", "Employee Role", "Status", "Created By", "Created"],
        rows: adminInvites.map((invite) => [
            invite.email,
            getEmployeeRoleLabel(invite.employeeRole),
            invite.status,
            invite.createdBy,
            formatDate(invite.createdAt),
          ]),
      },
      {
        name: "Properties",
        title: "Properties",
        headers: ["Property ID", "Title", "Location", "Type", "Price", "Status", "Owner ID"],
        rows: displayedProperties.map((property) => [
            property.id,
            property.title,
            property.location,
            property.type,
            property.price,
            property.displayStatus,
            property.ownerId,
          ]),
      },
      {
        name: "Rental Requests",
        title: "Rental Requests",
        headers: ["Request ID", "Property", "Tenant", "Email", "Price", "Contract", "Status", "Created"],
        rows: requests.map((request) => [
            request.id,
            request.propertyTitle,
            request.tenantName,
            request.tenantEmail,
            request.propertyPrice,
            formatContractYears(request.contractYears),
            request.status,
            formatDate(request.createdAt),
          ]),
      },
      {
        name: "Payment History",
        title: "Payment History",
        headers: ["Payment ID", "Tenant", "Email", "Property", "Billing Period", "Payment Method", "Total Paid", "Status", "Paid Date"],
        rows: payments.map((payment) => [
            payment.id,
            payment.tenantName,
            payment.tenantEmail,
            payment.propertyTitle,
            payment.billingPeriod,
            payment.paymentMethodType,
            payment.totalPaid,
            payment.status,
            formatDate(payment.paidAt ?? payment.createdAt),
          ]),
      },
      {
        name: "Export Info",
        title: "Export Info",
        headers: ["Field", "Value"],
        rows: [["Exported At", exportedAt]],
      },
    ]);

    downloadFile(
      `rentspace-admin-export-${exportedAt.slice(0, 10)}.xls`,
      workbook,
      "application/vnd.ms-excel;charset=utf-8",
    );
  };

  const handleCreateReport = () => {
    const reportDate = new Date();
    const workbook = buildExcelWorkbook([
      {
        name: "Summary",
        title: "Summary",
        headers: ["Metric", "Value"],
        rows: [
            ["Generated", reportDate.toLocaleString()],
            ["Users", users.length],
            ["Properties", properties.length],
            ["Rental Requests", requests.length],
            ["Pending Requests", pendingRequests],
            ["Approved Requests", approvedRequests],
            ["Rejected Requests", requests.filter((request) => request.status === "rejected").length],
            ["Available Properties", availableProperties],
            ["Pending Properties", displayedProperties.filter((property) => property.displayStatus === "pending").length],
            ["Removal Requests", displayedProperties.filter((property) => property.displayStatus === "removal-pending").length],
            ["Unavailable Properties", displayedProperties.filter((property) => property.displayStatus === "unavailable").length],
            ["Rented Properties", displayedProperties.filter((property) => property.displayStatus === "rented").length],
            ["Total Listed Rent", totalMonthlyRent],
            ["Paid Revenue", paidRevenue],
          ],
      },
      {
        name: "Recent Payments",
        title: "Recent Payments",
        headers: ["Payment ID", "Tenant", "Property", "Billing Period", "Total Paid", "Paid Date"],
        rows: payments.slice(0, 10).map((payment) => [
            payment.id,
            payment.tenantName,
            payment.propertyTitle,
            payment.billingPeriod,
            payment.totalPaid,
            formatDate(payment.paidAt ?? payment.createdAt),
          ]),
      },
      {
        name: "7 Days Activity",
        title: "Last 7 Days Activity",
        headers: ["Date", "Requests", "Payments", "Revenue"],
        rows: dailyActivity.map((day) => [day.label, day.requests, day.payments, day.revenue]),
      },
    ]);

    downloadFile(
      `rentspace-admin-report-${reportDate.toISOString().slice(0, 10)}.xls`,
      workbook,
      "application/vnd.ms-excel;charset=utf-8",
    );
  };

  const pendingRequests = requests.filter((request) => request.status === "pending").length;
  const approvedRequests = requests.filter((request) => request.status === "approved").length;
  const displayedProperties = properties.map((property) => ({
    ...property,
    displayStatus: getDisplayedPropertyStatus(property, requests),
  }));
  const availableProperties = displayedProperties.filter((property) => property.displayStatus === "available").length;
  const pendingProperties = displayedProperties.filter((property) => property.displayStatus === "pending").length;
  const removalPendingProperties = displayedProperties.filter((property) => property.displayStatus === "removal-pending").length;
  const unavailableProperties = displayedProperties.filter((property) => property.displayStatus === "unavailable").length;
  const rentedProperties = displayedProperties.filter((property) => property.displayStatus === "rented").length;
  const totalMonthlyRent = properties.reduce((total, property) => total + (typeof property.price === "number" ? property.price : 0), 0);
  const paidRevenue = payments.reduce((total, payment) => total + (typeof payment.totalPaid === "number" ? payment.totalPaid : 0), 0);
  const isLoading = usersLoading || propertiesLoading || requestsLoading || paymentsLoading || reportsLoading || ownerSupportLoading || messagesLoading || invitesLoading;
  const currentAdminProfile = users.find(
    (user) => user.email?.toLowerCase() === currentAdminEmail,
  ) as (AppUser & { adminEmployeeRole?: AdminEmployeeRole }) | undefined;
  const currentEmployeeRole = currentAdminProfile?.adminEmployeeRole;
  const allowedNavIds = isBossAccount
    ? navItems.map((item) => item.id)
    : employeeRoleAccess[currentEmployeeRole ?? "manager"];
  const visibleNavItems = navItems.filter(
    (item) =>
      allowedNavIds.includes(item.id) &&
      (item.id !== "employees" || isBossAccount),
  );
  const employees = users.filter(
    (user) =>
      user.email?.toLowerCase() !== bossEmail &&
      getUserRoles(user).includes("admin"),
  );
  const registeredEmployeeEmails = new Set(
    employees.map((employee) => employee.email.toLowerCase()),
  );
  const pendingAdminInvites = adminInvites.filter(
    (invite) => !registeredEmployeeEmails.has(invite.email.toLowerCase()),
  );
  const normalizedUserSearch = userSearch.trim().toLowerCase();
  const filteredUsers = normalizedUserSearch
    ? users.filter((user) => {
        const searchableText = [
          user.name,
          user.displayName,
          user.email,
          user.phone,
          ...getUserRoles(user),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedUserSearch);
      })
    : users;
  const normalizedPropertySearch = propertySearch.trim().toLowerCase();
  const filteredProperties = normalizedPropertySearch
    ? displayedProperties.filter((property) => {
        const searchableText = [
          property.title,
          property.location,
          property.type,
          property.displayStatus,
          property.ownerId,
          formatPrice(property.price),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedPropertySearch);
      })
    : displayedProperties;
  const normalizedRequestSearch = requestSearch.trim().toLowerCase();
  const filteredRequests = normalizedRequestSearch
    ? requests.filter((request) => {
        const searchableText = [
          request.propertyTitle,
          request.tenantName,
          request.tenantEmail,
          request.status,
          formatPrice(request.propertyPrice),
          formatContractYears(request.contractYears),
          formatDate(request.createdAt),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedRequestSearch);
      })
    : requests;
  const normalizedPaymentSearch = paymentSearch.trim().toLowerCase();
  const filteredPayments = normalizedPaymentSearch
    ? payments.filter((payment) => {
        const searchableText = [
          payment.id,
          payment.tenantName,
          payment.tenantEmail,
          payment.propertyTitle,
          payment.billingPeriod,
          payment.paymentMethodType,
          payment.status,
          formatPrice(payment.totalPaid),
          formatDate(payment.paidAt ?? payment.createdAt),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedPaymentSearch);
      })
    : payments;
  const filteredPaidRevenue = filteredPayments.reduce((total, payment) => total + (typeof payment.totalPaid === "number" ? payment.totalPaid : 0), 0);
  const normalizedReportSearch = reportSearch.trim().toLowerCase();
  const filteredReports = normalizedReportSearch
    ? reports.filter((report) => {
        const searchableText = [
          report.id,
          report.propertyTitle,
          report.propertyLocation,
          report.tenantName,
          report.tenantEmail,
          report.reason,
          report.status,
          report.details,
          report.adminReply,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedReportSearch);
      })
    : reports;
  const filteredOwnerSupportTickets = normalizedReportSearch
    ? ownerSupportTickets.filter((ticket) => {
        const searchableText = [
          ticket.id,
          ticket.ownerName,
          ticket.ownerEmail,
          ticket.subject,
          ticket.message,
          ticket.status,
          ticket.adminReply,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedReportSearch);
      })
    : ownerSupportTickets;
  const normalizedMessageSearch = messageSearch.trim().toLowerCase();
  const filteredConversations = normalizedMessageSearch
    ? conversations.filter((conversation) => {
        const searchableText = [
          conversation.id,
          conversation.ownerName,
          conversation.tenantName,
          conversation.propertyTitle,
          conversation.lastMessage,
          conversation.propertyLocation,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedMessageSearch);
      })
    : conversations;

  const summaryCards = [
    { label: "Total users", value: usersLoading ? "-" : users.length.toLocaleString(), icon: "U", change: "+ active" },
    { label: "Properties", value: propertiesLoading ? "-" : properties.length.toLocaleString(), icon: "P", change: `${availableProperties} available` },
    { label: "Requests", value: requestsLoading ? "-" : requests.length.toLocaleString(), icon: "R", change: `${pendingRequests} pending` },
    { label: "Paid revenue", value: paymentsLoading ? "-" : formatPrice(paidRevenue), icon: "$", change: `${payments.length} payments` },
    { label: "Open reports", value: reportsLoading ? "-" : reports.filter((report) => report.status !== "resolved").length.toLocaleString(), icon: "!", change: `${reports.length} tickets` },
  ];

  const dailyActivity = useMemo(
    () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - index));
        const key = getDateKey(date);

        const requestsCount = requests.filter((request) => {
          const createdAt = getTimestampDate(request.createdAt);
          return createdAt ? getDateKey(createdAt) === key : false;
        }).length;

        const dayPayments = payments.filter((payment) => {
          const paidAt = getTimestampDate(payment.paidAt ?? payment.createdAt);
          return paidAt ? getDateKey(paidAt) === key : false;
        });

        return {
          key,
          label: getShortDateLabel(date),
          requests: requestsCount,
          payments: dayPayments.length,
          revenue: dayPayments.reduce((total, payment) => total + payment.totalPaid, 0),
        };
      });
    },
    [payments, requests],
  );

  const maxDailyValue = Math.max(
    1,
    ...dailyActivity.flatMap((day) => [day.requests, day.payments]),
  );
  const maxDailyRevenue = Math.max(1, ...dailyActivity.map((day) => day.revenue));

  const overviewRows = [
    { label: "Tenant accounts", value: users.filter((user) => getUserRoles(user).includes("tenant")).length.toLocaleString(), section: "users" },
    { label: "Owner accounts", value: users.filter((user) => getUserRoles(user).includes("owner")).length.toLocaleString(), section: "users" },
    { label: "Approved requests", value: approvedRequests.toLocaleString(), section: "rental-requests" },
    { label: "Open reports", value: reports.filter((report) => report.status !== "resolved").length.toLocaleString(), section: "reports" },
    { label: "Open messages", value: conversations.length.toLocaleString(), section: "messages" },
    { label: "Total listed rent", value: formatPrice(totalMonthlyRent), section: "properties" },
    { label: "Payments this week", value: dailyActivity.reduce((total, day) => total + day.payments, 0).toLocaleString(), section: "payments" },
    { label: "Revenue this week", value: formatPrice(dailyActivity.reduce((total, day) => total + day.revenue, 0)), section: "payments" },
  ];

  return (
    <main className="min-h-screen bg-[#070b1d] text-slate-100">
      <div className="min-h-screen">
        <aside className="flex border-b border-white/10 bg-[#080d20] p-6 lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:flex-col lg:border-b-0 lg:border-r lg:border-white/10">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#101834] p-5 shadow-xl shadow-black/10">
            <div className="flex items-center gap-3">
              <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400 text-lg font-black text-[#07111f] shadow-lg shadow-emerald-400/20">
                R
                <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-cyan-300 ring-4 ring-[#101834]" />
              </span>
              <div>
                <p className="text-lg font-black tracking-tight text-white">RentSpace Admin</p>
                <p className="text-xs text-slate-500">Control center</p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-[#080d20] p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Live system</p>
              <p className="mt-2 text-sm text-slate-400">{users.length} users Â· {properties.length} listings</p>
            </div>
          </div>

          <nav className="mt-6 space-y-2">
            <p className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Admin menu</p>
            {visibleNavItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleSidebarNavigation(item.id)}
                className={`group flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  activeSection === item.id
                    ? "border-emerald-300/40 bg-emerald-400 text-[#07111f] shadow-lg shadow-emerald-400/10"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-black ${
                    activeSection === item.id ? "bg-[#07111f] text-emerald-300" : "bg-white/5 text-slate-500 group-hover:text-slate-300"
                  }`}>
                    {item.icon}
                  </span>
                  <span>
                    <span className="block">{item.label}</span>
                    <span className={`mt-0.5 block text-xs font-medium ${
                      activeSection === item.id ? "text-[#07111f]/70" : "text-slate-600 group-hover:text-slate-400"
                    }`}>
                      {item.detail}
                    </span>
                  </span>
                </span>
                <span className={activeSection === item.id ? "text-[#07111f]/60" : "text-slate-700"}>&gt;</span>
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => void handleAdminLogout()}
            className="mt-auto hidden rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 transition hover:bg-red-500/20 lg:block"
          >
            Logout admin
          </button>
        </aside>

        <section id="dashboard" className="overflow-hidden p-6 sm:p-8 lg:ml-72 lg:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Welcome back, Admin</h1>
              <p className="mt-2 text-sm text-slate-400">Monitor users, properties, and rental activity across the platform.</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={handleExportData} disabled={isLoading} className="rounded-xl border border-white/10 bg-[#111936] px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">Export data</button>
              <button type="button" onClick={handleCreateReport} disabled={isLoading} className="rounded-xl bg-fuchsia-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/25 hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60">Create report</button>
              <button type="button" onClick={() => void handleAdminLogout()} className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 hover:bg-red-500/20">Logout</button>
            </div>
          </div>

          {activeSection === "dashboard" && (
            <>
              <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((summary) => (
                  <article key={summary.label} className="rounded-2xl border border-white/10 bg-[#101834] p-5 shadow-xl shadow-black/10">
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <span className="flex items-center gap-2"><span>{summary.icon}</span>{summary.label}</span>
                      <span>...</span>
                    </div>
                    <div className="mt-5 flex items-end gap-3">
                      <p className="text-3xl font-black text-white">{summary.value}</p>
                      <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-xs font-bold text-emerald-300">{summary.change}</span>
                    </div>
                  </article>
                ))}
              </section>

              <section className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_0.9fr]">
                <article className="rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-400">Real activity from Firestore</p>
                      <p className="mt-2 text-3xl font-black text-white">Last 7 days</p>
                    </div>
                    <div className="flex gap-4 text-xs font-semibold text-slate-400">
                      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-400" /> Requests</span>
                      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-fuchsia-400" /> Payments</span>
                      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Revenue</span>
                    </div>
                  </div>
                  <div className="mt-8 bg-[#080d20] p-5">
                    <div className="grid min-h-64 grid-cols-7 items-end gap-3">
                      {dailyActivity.map((day) => (
                        <div key={day.key} className="flex h-full min-w-0 flex-col justify-end gap-3">
                          <div className="flex min-h-48 items-end justify-center gap-1 bg-white/[0.03] px-2 py-3">
                            <span
                              className="w-2 origin-bottom animate-[barGrow_700ms_ease-out_both] bg-cyan-400"
                              title={`${day.requests} requests`}
                              style={{ height: `${Math.max(8, (day.requests / maxDailyValue) * 100)}%` }}
                            />
                            <span
                              className="w-2 origin-bottom animate-[barGrow_850ms_ease-out_both] bg-fuchsia-500"
                              title={`${day.payments} payments`}
                              style={{ height: `${Math.max(8, (day.payments / maxDailyValue) * 100)}%` }}
                            />
                            <span
                              className="w-2 origin-bottom animate-[barGrow_1000ms_ease-out_both] bg-emerald-400"
                              title={`${formatPrice(day.revenue)} revenue`}
                              style={{ height: `${Math.max(8, (day.revenue / maxDailyRevenue) * 100)}%` }}
                            />
                          </div>
                          <div className="text-center">
                            <p className="truncate text-xs font-black text-slate-300">{day.label}</p>
                            <p className="mt-1 text-[11px] font-semibold text-slate-500">{day.requests} req · {day.payments} paid</p>
                            <p className="mt-1 truncate text-[11px] font-bold text-emerald-300">{formatPrice(day.revenue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {overviewRows.map((row) => (
                      <button
                        key={row.label}
                        type="button"
                        onClick={() => handleSidebarNavigation(row.section)}
                        className="bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                      >
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{row.label}</p>
                        <p className="mt-2 text-lg font-black text-white">{row.value}</p>
                      </button>
                    ))}
                  </div>
                </article>

                <div className="grid gap-5">
                  <article className="rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
                    <p className="text-sm font-bold text-slate-400">Request approval rate</p>
                    <p className="mt-2 text-3xl font-black text-white">{percent(approvedRequests, requests.length)}%</p>
                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" style={{ width: `${percent(approvedRequests, requests.length)}%` }} />
                    </div>
                    <p className="mt-4 text-sm text-slate-500">{approvedRequests} approved from {requests.length} total requests.</p>
                  </article>

                  <article className="rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
                    <p className="text-sm font-bold text-slate-400">Property availability</p>
                    <p className="mt-2 text-3xl font-black text-white">{percent(availableProperties, properties.length)}%</p>
                    <div className="mt-5 grid grid-cols-2 gap-2 text-center text-xs font-bold text-slate-400 sm:grid-cols-5">
                      <span className="rounded-xl bg-emerald-400/10 p-3 text-emerald-300">{availableProperties}<br />Available</span>
                      <span className="rounded-xl bg-amber-400/10 p-3 text-amber-300">{pendingProperties}<br />Pending</span>
                      <span className="rounded-xl bg-orange-400/10 p-3 text-orange-300">{removalPendingProperties}<br />Removal</span>
                      <span className="rounded-xl bg-slate-400/10 p-3 text-slate-300">{unavailableProperties}<br />Unavailable</span>
                      <span className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">{rentedProperties}<br />Rented</span>
                    </div>
                  </article>
                </div>
              </section>
            </>
          )}

          {(usersError || propertiesError || requestsError || paymentsError || reportsError || ownerSupportError || messagesError || invitesError) && (
            <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
              {[usersError, propertiesError, requestsError, paymentsError, reportsError, ownerSupportError, messagesError, invitesError].filter(Boolean).join(" ")}
            </div>
          )}

          {activeSection === "users" && (
          <section id="users" className="mt-8 rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
            <div className="grid gap-4 lg:grid-cols-[180px_minmax(320px,640px)_auto] lg:items-start">
              <div>
                <h2 className="text-xl font-black text-white">Users</h2>
                <p className="mt-1 text-sm text-slate-400">Registered accounts and platform roles.</p>
              </div>
              <label className="block text-sm font-bold text-slate-300">
                <span className="sr-only">Search users</span>
                <input
                  type="search"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search by name, email, phone, or role"
                  className="w-full rounded-xl border border-white/10 bg-[#070b1d] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
                />
              </label>
              <span className="justify-self-start rounded-full bg-white/5 px-3 py-1 text-sm font-bold text-slate-300 lg:justify-self-end">{filteredUsers.length} records</span>
            </div>
            <label className="mt-5 block text-sm font-bold text-slate-300">
              Default admin message
              <input
                value={adminMessageText}
                onChange={(event) => setAdminMessageText(event.target.value)}
                placeholder="Message sent when opening a user chat"
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#070b1d] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
              />
            </label>
            {usersLoading ? <p className="mt-5 text-slate-400">Loading users...</p> : users.length === 0 ? <p className="mt-5 text-slate-400">No users found.</p> : filteredUsers.length === 0 ? <p className="mt-5 text-slate-400">No users match your search.</p> : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[1080px] text-left text-sm">
                  <thead className="text-slate-500"><tr><th className="py-3 pr-5">Name</th><th className="py-3 pr-5">Email</th><th className="py-3 pr-5">Role</th><th className="py-3 pr-5">Account</th><th className="py-3 pr-5">Created</th><th className="py-3 pr-5">Action</th></tr></thead>
                  <tbody>{filteredUsers.map((user) => {
                    const accountStatus = user.accountStatus ?? "active";
                    const isSuspended = accountStatus === "suspended";

                    return (
                      <tr key={user.uid} className="border-t border-white/10">
                        <td className="py-4 pr-5 font-semibold text-white">{user.name || user.displayName || "-"}</td>
                        <td className="py-4 pr-5 text-slate-300">{user.email}</td>
                        <td className="py-4 pr-5"><div className="flex flex-wrap gap-2">{getUserRoles(user).map((role) => <AdminRoleBadge key={role} role={role} />)}</div></td>
                        <td className="py-4 pr-5">
                          <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${isSuspended ? "bg-red-500/10 text-red-200" : "bg-emerald-400/10 text-emerald-200"}`}>
                            {accountStatus}
                          </span>
                        </td>
                        <td className="py-4 pr-5 text-slate-500">{formatDate(user.createdAt)}</td>
                        <td className="py-4 pr-5">
                          <div className="flex flex-wrap gap-2">
                            <Link to={`/admin-users/${user.uid}`} className="inline-flex rounded-lg bg-emerald-400/10 px-3 py-2 font-semibold text-emerald-200 transition hover:bg-emerald-400/20">View profile</Link>
                            <button
                              type="button"
                              disabled={updatingId === user.uid}
                              onClick={() => void handleAdminMessageUser(user)}
                              className="rounded-lg bg-cyan-400/10 px-3 py-2 font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:opacity-60"
                            >
                              {updatingId === user.uid ? "Opening..." : "Message"}
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === user.uid}
                              onClick={() => void handleUserAccountStatusChange(user, isSuspended ? "active" : "suspended")}
                              className={`rounded-lg px-3 py-2 font-semibold transition disabled:opacity-60 ${isSuspended ? "bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20" : "bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"}`}
                            >
                              {updatingId === user.uid ? "Saving..." : isSuspended ? "Activate" : "Suspend"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            )}
          </section>
          )}

          {activeSection === "employees" && isBossAccount && (
          <section id="employees" className="mt-8 rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Employees</h2>
                <p className="mt-1 text-sm text-slate-400">Add employee Gmail accounts, then they can login with Google and appear here after first login.</p>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-bold text-emerald-200">{employees.length} employees</span>
            </div>

            <form onSubmit={handleAddEmployee} className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-[#0b1024] p-4 sm:grid-cols-[1fr_auto]">
              <label className="block text-sm font-bold text-slate-300">
                Employee Gmail
                <input
                  required
                  type="email"
                  value={employeeEmail}
                  onChange={(event) => setEmployeeEmail(event.target.value)}
                  placeholder="employee@gmail.com"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#070b1d] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/10"
                />
              </label>
              <button
                type="submit"
                disabled={addingEmployee}
                className="self-end rounded-lg bg-emerald-400 px-5 py-3 font-black text-[#07111f] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addingEmployee ? "Adding..." : "Add employee"}
              </button>
            </form>

            {isRoleDialogOpen && (
              <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-5">
                <section className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-2xl shadow-black/40">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Employee access</p>
                      <h3 className="mt-2 text-2xl font-black text-white">Choose employee role</h3>
                      <p className="mt-2 text-sm text-slate-400">{pendingEmployeeEmail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRoleDialogOpen(false)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="text-slate-500">
                        <tr>
                          <th className="py-3 pr-5">Select</th>
                          <th className="py-3 pr-5">Role</th>
                          <th className="py-3 pr-5">Can see</th>
                          <th className="py-3 pr-5">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeRoleOptions.map((roleOption) => (
                          <tr key={roleOption.id} className="border-t border-white/10">
                            <td className="py-4 pr-5">
                              <input
                                type="radio"
                                name="employeeRole"
                                checked={selectedEmployeeRole === roleOption.id}
                                onChange={() => setSelectedEmployeeRole(roleOption.id)}
                                className="h-4 w-4 accent-emerald-400"
                              />
                            </td>
                            <td className="py-4 pr-5 font-black text-white">{roleOption.label}</td>
                            <td className="py-4 pr-5 text-emerald-200">{roleOption.access}</td>
                            <td className="py-4 pr-5 text-slate-400">{roleOption.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsRoleDialogOpen(false)}
                      className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 font-bold text-slate-300 transition hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={addingEmployee}
                      onClick={() => void handleConfirmEmployeeInvite()}
                      className="rounded-lg bg-emerald-400 px-5 py-3 font-black text-[#07111f] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {addingEmployee ? "Saving..." : "Confirm invite"}
                    </button>
                  </div>
                </section>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Registered employees</h3>
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">{employees.length} active</span>
            </div>

            {usersLoading ? <p className="mt-5 text-slate-400">Loading employees...</p> : employees.length === 0 ? <p className="mt-5 text-slate-400">No registered employees found yet.</p> : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[940px] text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-3 pr-5">Employee</th>
                      <th className="py-3 pr-5">Email</th>
                      <th className="py-3 pr-5">Phone</th>
                      <th className="py-3 pr-5">Roles</th>
                      <th className="py-3 pr-5">Created</th>
                      <th className="py-3 pr-5">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee.uid} className="border-t border-white/10">
                        <td className="py-4 pr-5 font-semibold text-white">{employee.name || employee.displayName || "-"}</td>
                        <td className="py-4 pr-5 text-slate-300">{employee.email}</td>
                        <td className="py-4 pr-5 text-slate-300">{employee.phone || "-"}</td>
                        <td className="py-4 pr-5"><div className="flex flex-wrap gap-2">{getUserRoles(employee).map((role) => <AdminRoleBadge key={role} role={role} />)}</div></td>
                        <td className="py-4 pr-5 text-slate-500">{formatDate(employee.createdAt)}</td>
                        <td className="py-4 pr-5"><Link to={`/admin-users/${employee.uid}`} className="inline-flex rounded-lg bg-emerald-400/10 px-3 py-2 font-semibold text-emerald-200 transition hover:bg-emerald-400/20">View profile</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Pending employee invites</h3>
              <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200">{pendingAdminInvites.length} pending</span>
            </div>

            {invitesLoading ? <p className="mt-5 text-slate-400">Loading invites...</p> : pendingAdminInvites.length === 0 ? <p className="mt-5 text-slate-400">No pending employee invites.</p> : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-3 pr-5">Email</th>
                      <th className="py-3 pr-5">Role</th>
                      <th className="py-3 pr-5">Status</th>
                      <th className="py-3 pr-5">Created</th>
                      <th className="py-3 pr-5">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingAdminInvites.map((invite) => (
                      <tr key={invite.id} className="border-t border-white/10">
                        <td className="py-4 pr-5 font-semibold text-white">{invite.email}</td>
                        <td className="py-4 pr-5 text-emerald-200">{getEmployeeRoleLabel(invite.employeeRole)}</td>
                        <td className="py-4 pr-5">
                          <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-amber-200">Pending</span>
                        </td>
                        <td className="py-4 pr-5 text-slate-500">{formatDate(invite.createdAt)}</td>
                        <td className="py-4 pr-5">
                          <button
                            type="button"
                            disabled={deletingId === invite.id}
                            onClick={() => void handleDeleteInvite(invite)}
                            className="rounded-lg bg-red-500/10 px-3 py-2 font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                          >
                            {deletingId === invite.id ? "Removing..." : "Remove"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          )}

          {activeSection === "properties" && (
          <section id="properties" className="mt-8 rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
            <div className="grid gap-4 lg:grid-cols-[220px_minmax(320px,640px)_auto] lg:items-start">
              <div>
                <h2 className="text-xl font-black text-white">Properties</h2>
                <p className="mt-1 text-sm text-slate-400">Monitor every listing and remove obsolete properties.</p>
              </div>
              <label className="block text-sm font-bold text-slate-300">
                <span className="sr-only">Search properties</span>
                <input
                  type="search"
                  value={propertySearch}
                  onChange={(event) => setPropertySearch(event.target.value)}
                  placeholder="Search by title, location, status, or owner"
                  className="w-full rounded-xl border border-white/10 bg-[#070b1d] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
                />
              </label>
              <span className="justify-self-start rounded-full bg-white/5 px-3 py-1 text-sm font-bold text-slate-300 lg:justify-self-end">{filteredProperties.length} listings</span>
            </div>
            {propertiesLoading ? <p className="mt-5 text-slate-400">Loading properties...</p> : properties.length === 0 ? <p className="mt-5 text-slate-400">No properties found.</p> : filteredProperties.length === 0 ? <p className="mt-5 text-slate-400">No properties match your search.</p> : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="text-slate-500"><tr><th className="py-3 pr-5">Title</th><th className="py-3 pr-5">Location</th><th className="py-3 pr-5">Price</th><th className="py-3 pr-5">Type</th><th className="py-3 pr-5">Status</th><th className="py-3 pr-5">Owner ID</th><th className="py-3 pr-5">Action</th></tr></thead>
                  <tbody>
                    {filteredProperties.map((property) => (
                      <tr key={property.id} className="border-t border-white/10">
                        <td className="py-4 pr-5 font-semibold text-white">{property.title}</td>
                        <td className="py-4 pr-5 text-slate-300">{property.location}</td>
                        <td className="py-4 pr-5 text-slate-300">{formatPrice(property.price)}</td>
                        <td className="py-4 pr-5 text-slate-300">{property.type}</td>
                        <td className="py-4 pr-5">
                          <StatusBadge value={property.displayStatus} />
                        </td>
                        <td className="max-w-48 truncate py-4 pr-5 font-mono text-xs text-slate-500">{property.ownerId}</td>
                        <td className="py-4 pr-5">
                          <div className="flex flex-wrap gap-2">
                            <select
                              value={property.status}
                              disabled={updatingId === property.id}
                              onChange={(event) => void handlePropertyStatusChange(property, event.target.value as PropertyStatus)}
                              className="rounded-lg border border-white/10 bg-[#070b1d] px-3 py-2 font-semibold text-slate-200 outline-none transition focus:border-cyan-300 disabled:opacity-60"
                              aria-label={`Change ${property.title} status`}
                            >
                              <option value="available">Available</option>
                              <option value="pending">Pending</option>
                              <option value="removal-pending">Removal pending</option>
                              <option value="unavailable">Unavailable</option>
                              <option value="rented">Rented</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          )}

          {activeSection === "rental-requests" && (
          <section id="rental-requests" className="mt-8 rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
            <div className="grid gap-4 lg:grid-cols-[220px_minmax(320px,640px)_auto] lg:items-start">
              <div>
                <h2 className="text-xl font-black text-white">Rental requests</h2>
                <p className="mt-1 text-sm text-slate-400">Rental demand and request outcomes.</p>
              </div>
              <label className="block text-sm font-bold text-slate-300">
                <span className="sr-only">Search rental requests</span>
                <input
                  type="search"
                  value={requestSearch}
                  onChange={(event) => setRequestSearch(event.target.value)}
                  placeholder="Search by property, tenant, email, or status"
                  className="w-full rounded-xl border border-white/10 bg-[#070b1d] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
                />
              </label>
              <span className="justify-self-start rounded-full bg-white/5 px-3 py-1 text-sm font-bold text-slate-300 lg:justify-self-end">{filteredRequests.length} requests</span>
            </div>
            {requestsLoading ? <p className="mt-5 text-slate-400">Loading rental requests...</p> : requests.length === 0 ? <p className="mt-5 text-slate-400">No rental requests found.</p> : filteredRequests.length === 0 ? <p className="mt-5 text-slate-400">No rental requests match your search.</p> : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[1040px] text-left text-sm">
                  <thead className="text-slate-500"><tr><th className="py-3 pr-5">Property</th><th className="py-3 pr-5">Tenant</th><th className="py-3 pr-5">Email</th><th className="py-3 pr-5">Price</th><th className="py-3 pr-5">Contract</th><th className="py-3 pr-5">Status</th><th className="py-3 pr-5">Created</th><th className="py-3 pr-5">Action</th></tr></thead>
                  <tbody>
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className="border-t border-white/10">
                        <td className="py-4 pr-5 font-semibold text-white">{request.propertyTitle}</td>
                        <td className="py-4 pr-5 text-slate-300">{request.tenantName}</td>
                        <td className="py-4 pr-5 text-slate-300">{request.tenantEmail}</td>
                        <td className="py-4 pr-5 text-slate-300">{formatPrice(request.propertyPrice)}</td>
                        <td className="py-4 pr-5 text-slate-300">{formatContractYears(request.contractYears)}</td>
                        <td className="py-4 pr-5"><StatusBadge value={request.status} /></td>
                        <td className="py-4 pr-5 text-slate-500">{formatDate(request.createdAt)}</td>
                        <td className="py-4 pr-5">
                          <div className="flex flex-wrap gap-2">
                            {request.status === "pending" && (
                              <>
                                <button
                                  disabled={updatingId === request.id}
                                  type="button"
                                  onClick={() => void handleApproveRequest(request)}
                                  className="rounded-lg bg-emerald-400/10 px-3 py-2 font-semibold text-emerald-200 hover:bg-emerald-400/20 disabled:opacity-60"
                                >
                                  {updatingId === request.id ? "Saving..." : "Approve"}
                                </button>
                                <button
                                  disabled={updatingId === request.id}
                                  type="button"
                                  onClick={() => void handleRejectRequest(request)}
                                  className="rounded-lg bg-amber-500/10 px-3 py-2 font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              disabled={deletingId === request.id}
                              type="button"
                              onClick={() => void handleDeleteRequest(request)}
                              className="rounded-lg bg-red-500/10 px-3 py-2 font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                            >
                              {deletingId === request.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          )}

          {activeSection === "payments" && (
          <section id="payments" className="mt-8 rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
            <div className="grid gap-4 lg:grid-cols-[220px_minmax(320px,640px)_auto] lg:items-start">
              <div>
                <h2 className="text-xl font-black text-white">Payments</h2>
                <p className="mt-1 text-sm text-slate-400">Simulated payment records stored in Firestore.</p>
              </div>
              <label className="block text-sm font-bold text-slate-300">
                <span className="sr-only">Search payments</span>
                <input
                  type="search"
                  value={paymentSearch}
                  onChange={(event) => setPaymentSearch(event.target.value)}
                  placeholder="Search by payment id, tenant, property, or method"
                  className="w-full rounded-xl border border-white/10 bg-[#070b1d] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
                />
              </label>
              <span className="justify-self-start rounded-full bg-white/5 px-3 py-1 text-sm font-bold text-slate-300 lg:justify-self-end">{formatPrice(filteredPaidRevenue)} paid</span>
            </div>
            {paymentsLoading ? <p className="mt-5 text-slate-400">Loading payments...</p> : payments.length === 0 ? <p className="mt-5 text-slate-400">No payments found.</p> : filteredPayments.length === 0 ? <p className="mt-5 text-slate-400">No payments match your search.</p> : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[1220px] text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-3 pr-5">Payment ID</th>
                      <th className="py-3 pr-5">Tenant</th>
                      <th className="py-3 pr-5">Email</th>
                      <th className="py-3 pr-5">Property</th>
                      <th className="py-3 pr-5">Billing Period</th>
                      <th className="py-3 pr-5">Payment Method</th>
                      <th className="py-3 pr-5">Total Paid</th>
                      <th className="py-3 pr-5">Status</th>
                      <th className="py-3 pr-5">Paid Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="border-t border-white/10">
                        <td className="max-w-44 truncate py-4 pr-5 font-mono text-xs text-slate-500" title={payment.id}>{payment.id}</td>
                        <td className="py-4 pr-5 font-semibold text-white">{payment.tenantName}</td>
                        <td className="py-4 pr-5 text-slate-300">{payment.tenantEmail}</td>
                        <td className="py-4 pr-5 text-slate-300">{payment.propertyTitle}</td>
                        <td className="py-4 pr-5 text-slate-300">{payment.billingPeriod}</td>
                        <td className="py-4 pr-5 text-slate-300">{payment.paymentMethodType}</td>
                        <td className="py-4 pr-5 font-semibold text-white">{formatPrice(payment.totalPaid)}</td>
                        <td className="py-4 pr-5"><StatusBadge value="approved" /></td>
                        <td className="py-4 pr-5 text-slate-500">{formatDate(payment.paidAt ?? payment.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          )}

          {activeSection === "reports" && (
          <section id="reports" className="mt-8 rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
            <div className="grid gap-4 lg:grid-cols-[220px_minmax(320px,640px)_auto] lg:items-start">
              <div>
                <h2 className="text-xl font-black text-white">Reported issues</h2>
                <p className="mt-1 text-sm text-slate-400">Review tenant property reports and reply with a resolution.</p>
              </div>
              <label className="block text-sm font-bold text-slate-300">
                <span className="sr-only">Search reports</span>
                <input
                  type="search"
                  value={reportSearch}
                  onChange={(event) => setReportSearch(event.target.value)}
                  placeholder="Search by ticket, tenant, property, reason, or status"
                  className="w-full rounded-xl border border-white/10 bg-[#070b1d] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
                />
              </label>
              <span className="justify-self-start rounded-full bg-white/5 px-3 py-1 text-sm font-bold text-slate-300 lg:justify-self-end">{filteredReports.length} tickets</span>
            </div>

            {reportsLoading ? <p className="mt-5 text-slate-400">Loading report tickets...</p> : reports.length === 0 ? <p className="mt-5 text-slate-400">No report tickets found.</p> : filteredReports.length === 0 ? <p className="mt-5 text-slate-400">No report tickets match your search.</p> : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[1240px] text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-3 pr-5">Ticket</th>
                      <th className="py-3 pr-5">Property</th>
                      <th className="py-3 pr-5">Tenant</th>
                      <th className="py-3 pr-5">Reason</th>
                      <th className="py-3 pr-5">Status</th>
                      <th className="py-3 pr-5">Admin reply</th>
                      <th className="py-3 pr-5">Updated</th>
                      <th className="py-3 pr-5">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report) => (
                      <tr key={report.id} className="border-t border-white/10 align-top">
                        <td className="max-w-44 truncate py-4 pr-5 font-mono text-xs text-slate-500" title={report.id}>{report.id}</td>
                        <td className="py-4 pr-5">
                          <p className="font-semibold text-white">{report.propertyTitle}</p>
                          <p className="mt-1 text-xs text-slate-500">{report.propertyLocation}</p>
                        </td>
                        <td className="py-4 pr-5">
                          <p className="font-semibold text-white">{report.tenantName}</p>
                          <p className="mt-1 text-xs text-slate-500">{report.tenantEmail}</p>
                        </td>
                        <td className="py-4 pr-5 text-slate-300">
                          <p className="font-semibold text-white">{report.reason}</p>
                          <p className="mt-1 line-clamp-2 max-w-72 text-xs text-slate-500" title={report.details}>{report.details}</p>
                        </td>
                        <td className="py-4 pr-5"><StatusBadge value={report.status} /></td>
                        <td className="max-w-80 py-4 pr-5 text-slate-300">
                          <p className="line-clamp-2" title={report.adminReply}>{report.adminReply || "-"}</p>
                        </td>
                        <td className="py-4 pr-5 text-slate-500">{formatDate(report.updatedAt ?? report.createdAt)}</td>
                        <td className="py-4 pr-5">
                          <button
                            type="button"
                            onClick={() => openReportReply(report)}
                            className="inline-flex rounded-lg bg-cyan-400/10 px-3 py-2 font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                          >
                            View / Reply
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedReport && (
              <form onSubmit={handleReportReply} className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-5">
                <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Ticket {selectedReport.id}</p>
                    <h3 className="mt-2 text-xl font-black text-white">{selectedReport.propertyTitle}</h3>
                    <p className="mt-2 text-sm text-slate-300">{selectedReport.reason}</p>
                    <p className="mt-3 rounded-xl bg-[#070b1d] p-4 text-sm leading-6 text-slate-300">{selectedReport.details}</p>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-300">
                      Status
                      <select
                        value={reportStatus}
                        onChange={(event) => setReportStatus(event.target.value as ReportedIssueStatus)}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-[#070b1d] px-4 py-3 text-white outline-none transition focus:border-cyan-300"
                      >
                        {reportedIssueStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </label>
                    <label className="block text-sm font-bold text-slate-300">
                      Reply to tenant
                      <textarea
                        rows={5}
                        value={reportReply}
                        onChange={(event) => setReportReply(event.target.value)}
                        placeholder="Explain the action taken or next steps for the tenant."
                        className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#070b1d] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
                      />
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <button disabled={updatingId === selectedReport.id} className="rounded-xl bg-cyan-400 px-4 py-2 font-black text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60">
                        {updatingId === selectedReport.id ? "Saving..." : "Save reply"}
                      </button>
                      <button type="button" onClick={() => setSelectedReport(null)} className="rounded-xl border border-white/10 px-4 py-2 font-black text-slate-200 transition hover:bg-white/10">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            <div className="mt-8 border-t border-white/10 pt-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-white">Owner admin support</h3>
                  <p className="mt-1 text-sm text-slate-400">Reply to owners who need help from admin.</p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-sm font-bold text-slate-300">{filteredOwnerSupportTickets.length} tickets</span>
              </div>

              {ownerSupportLoading ? <p className="mt-5 text-slate-400">Loading owner support tickets...</p> : ownerSupportTickets.length === 0 ? <p className="mt-5 text-slate-400">No owner support tickets found.</p> : filteredOwnerSupportTickets.length === 0 ? <p className="mt-5 text-slate-400">No owner support tickets match your search.</p> : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[1120px] text-left text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="py-3 pr-5">Ticket</th>
                        <th className="py-3 pr-5">Owner</th>
                        <th className="py-3 pr-5">Subject</th>
                        <th className="py-3 pr-5">Message</th>
                        <th className="py-3 pr-5">Status</th>
                        <th className="py-3 pr-5">Admin reply</th>
                        <th className="py-3 pr-5">Updated</th>
                        <th className="py-3 pr-5">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOwnerSupportTickets.map((ticket) => (
                        <tr key={ticket.id} className="border-t border-white/10 align-top">
                          <td className="max-w-44 truncate py-4 pr-5 font-mono text-xs text-slate-500" title={ticket.id}>{ticket.id}</td>
                          <td className="py-4 pr-5">
                            <p className="font-semibold text-white">{ticket.ownerName}</p>
                            <p className="mt-1 text-xs text-slate-500">{ticket.ownerEmail}</p>
                          </td>
                          <td className="py-4 pr-5 font-semibold text-white">{ticket.subject}</td>
                          <td className="max-w-80 py-4 pr-5 text-slate-300">
                            <p className="line-clamp-2" title={ticket.message}>{ticket.message}</p>
                          </td>
                          <td className="py-4 pr-5"><StatusBadge value={ticket.status} /></td>
                          <td className="max-w-80 py-4 pr-5 text-slate-300">
                            <p className="line-clamp-2" title={ticket.adminReply}>{ticket.adminReply || "-"}</p>
                          </td>
                          <td className="py-4 pr-5 text-slate-500">{formatDate(ticket.updatedAt ?? ticket.createdAt)}</td>
                          <td className="py-4 pr-5">
                            <button
                              type="button"
                              onClick={() => openOwnerSupportReply(ticket)}
                              className="inline-flex rounded-lg bg-cyan-400/10 px-3 py-2 font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                            >
                              View / Reply
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedOwnerSupportTicket && (
                <form onSubmit={handleOwnerSupportReply} className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-5">
                  <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">Ticket {selectedOwnerSupportTicket.id}</p>
                      <h3 className="mt-2 text-xl font-black text-white">{selectedOwnerSupportTicket.subject}</h3>
                      <p className="mt-2 text-sm text-slate-300">{selectedOwnerSupportTicket.ownerName} · {selectedOwnerSupportTicket.ownerEmail}</p>
                      <p className="mt-3 rounded-xl bg-[#070b1d] p-4 text-sm leading-6 text-slate-300">{selectedOwnerSupportTicket.message}</p>
                    </div>
                    <div className="space-y-4">
                      <label className="block text-sm font-bold text-slate-300">
                        Status
                        <select
                          value={ownerSupportStatus}
                          onChange={(event) => setOwnerSupportStatus(event.target.value as ReportedIssueStatus)}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-[#070b1d] px-4 py-3 text-white outline-none transition focus:border-cyan-300"
                        >
                          {reportedIssueStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </label>
                      <label className="block text-sm font-bold text-slate-300">
                        Reply to owner
                        <textarea
                          rows={5}
                          value={ownerSupportReply}
                          onChange={(event) => setOwnerSupportReply(event.target.value)}
                          placeholder="Reply with admin guidance, action taken, or next steps."
                          className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#070b1d] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
                        />
                      </label>
                      <div className="flex flex-wrap gap-3">
                        <button disabled={updatingId === selectedOwnerSupportTicket.id} className="rounded-xl bg-emerald-400 px-4 py-2 font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60">
                          {updatingId === selectedOwnerSupportTicket.id ? "Saving..." : "Save reply"}
                        </button>
                        <button type="button" onClick={() => setSelectedOwnerSupportTicket(null)} className="rounded-xl border border-white/10 px-4 py-2 font-black text-slate-200 transition hover:bg-white/10">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </section>
          )}

          {activeSection === "messages" && (
          <section id="messages" className="mt-8 rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
            <div className="grid gap-4 lg:grid-cols-[220px_minmax(320px,640px)_auto] lg:items-start">
              <div>
                <h2 className="text-xl font-black text-white">Messages & issues</h2>
                <p className="mt-1 text-sm text-slate-400">Monitor tenant-owner conversations and reported message activity.</p>
              </div>
              <label className="block text-sm font-bold text-slate-300">
                <span className="sr-only">Search messages</span>
                <input
                  type="search"
                  value={messageSearch}
                  onChange={(event) => setMessageSearch(event.target.value)}
                  placeholder="Search by property, tenant, owner, or latest message"
                  className="w-full rounded-xl border border-white/10 bg-[#070b1d] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
                />
              </label>
              <span className="justify-self-start rounded-full bg-white/5 px-3 py-1 text-sm font-bold text-slate-300 lg:justify-self-end">{filteredConversations.length} threads</span>
            </div>
            {messagesLoading ? <p className="mt-5 text-slate-400">Loading messages...</p> : conversations.length === 0 ? <p className="mt-5 text-slate-400">No conversations found.</p> : filteredConversations.length === 0 ? <p className="mt-5 text-slate-400">No message threads match your search.</p> : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[1120px] text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-3 pr-5">Property</th>
                      <th className="py-3 pr-5">Tenant</th>
                      <th className="py-3 pr-5">Owner</th>
                      <th className="py-3 pr-5">Latest message</th>
                      <th className="py-3 pr-5">Updated</th>
                      <th className="py-3 pr-5">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConversations.map((conversation) => (
                      <tr key={conversation.id} className="border-t border-white/10">
                        <td className="py-4 pr-5">
                          <p className="font-semibold text-white">{conversation.propertyTitle}</p>
                          <p className="mt-1 text-xs text-slate-500">{conversation.propertyLocation || conversation.propertyId}</p>
                        </td>
                        <td className="py-4 pr-5 text-slate-300">{conversation.tenantName}</td>
                        <td className="py-4 pr-5 text-slate-300">{conversation.ownerName}</td>
                        <td className="max-w-96 py-4 pr-5 text-slate-300">
                          <p className="truncate" title={conversation.lastMessage}>{conversation.lastMessage || "-"}</p>
                        </td>
                        <td className="py-4 pr-5 text-slate-500">{formatDate(conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt)}</td>
                        <td className="py-4 pr-5">
                          <Link
                            to={`/chat?type=${conversation.type ?? "tenant-owner"}&conversation=${conversation.id}`}
                            className="inline-flex rounded-lg bg-cyan-400/10 px-3 py-2 font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                          >
                            Open thread
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          )}
        </section>
      </div>
    </main>
  );
}
